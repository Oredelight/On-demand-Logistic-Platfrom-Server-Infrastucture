import hashlib
import hmac
import json
import logging
from datetime import datetime
from typing import Optional

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from config import settings
from database.models import Order, Payment, User
from database.schemas import PaymentStatus

logger = logging.getLogger(__name__)


def _paystack_headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }

def _naira_to_kobo(amount_ngn: float) -> int:
    return int(amount_ngn * 100)

def _kobo_to_naira(amount_kobo: int) -> float:
    return amount_kobo / 100


def initiate_payment(db: Session, order_id: int, user: User) -> dict:
    #Create a Paystack transaction for a given order.
    #Returns the authorization URL to redirect the customer to.
    order = db.query(Order).filter_by(id=order_id, user_id=user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Order is already paid")

    if not user.email:
        raise HTTPException(
            status_code=400,
            detail="A verified email address is required to make payments"
        )

    amount_kobo = _naira_to_kobo(order.total)
    reference = f"ORE-{order.id}-{int(datetime.utcnow().timestamp())}"

    payload = {
        "email": user.email,
        "amount": amount_kobo,
        "currency": "NGN",
        "reference": reference,
        "metadata": {
            "order_id": order.id,
            "user_id": user.id,
            "app": settings.APP_NAME,
        },
        "callback_url": f"{settings.FRONTEND_URL}/payment/callback",
    }

    try:
        with httpx.Client(timeout=30) as client:
            response = client.post(
                f"{settings.PAYSTACK_BASE_URL}/transaction/initialize",
                headers=_paystack_headers(),
                json=payload,
            )
        resp_data = response.json()
    except httpx.RequestError as e:
        logger.error(f"[PAYMENT] Paystack API unreachable: {e}")
        raise HTTPException(status_code=503, detail="Payment gateway unavailable, try again")

    if not resp_data.get("status"):
        logger.error(f"[PAYMENT] Paystack init failed: {resp_data}")
        raise HTTPException(status_code=400, detail=resp_data.get("message", "Payment initiation failed"))

    data = resp_data["data"]

    # Persist payment record
    payment = Payment(
        order_id=order.id,
        reference=reference,
        amount=order.total,
        amount_kobo=amount_kobo,
        currency="NGN",
        status=PaymentStatus.PENDING,
        gateway="paystack",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    logger.info(f"[PAYMENT] Initiated payment ref={reference} order={order_id} amount=₦{order.total}")

    return {
        "authorization_url": data["authorization_url"],
        "reference": reference,
        "order_id": order.id,
        "amount_ngn": order.total,
    }


def verify_payment(db: Session, reference: str, user: Optional[User] = None) -> dict:
    #Verify a payment with Paystack and update DB accordingly.
    #Can be called by the user or internally from the webhook handler.
    payment = db.query(Payment).filter_by(reference=reference).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if user:
        order = db.query(Order).filter_by(id=payment.order_id, user_id=user.id).first()
        if not order:
            raise HTTPException(status_code=403, detail="Access denied")

    try:
        with httpx.Client(timeout=30) as client:
            response = client.get(
                f"{settings.PAYSTACK_BASE_URL}/transaction/verify/{reference}",
                headers=_paystack_headers(),
            )
        resp_data = response.json()
    except httpx.RequestError as e:
        logger.error(f"[PAYMENT] Paystack verify API unreachable: {e}")
        raise HTTPException(status_code=503, detail="Payment gateway unavailable")

    if not resp_data.get("status"):
        raise HTTPException(status_code=400, detail=resp_data.get("message", "Verification failed"))

    data = resp_data["data"]
    ps_status = data.get("status")

    # Update payment record
    payment.gateway_response = json.dumps(data)
    payment.channel = data.get("channel")

    if ps_status == "success":
        payment.status = PaymentStatus.SUCCESS
        paid_at_str = data.get("paid_at")
        if paid_at_str:
            try:
                payment.paid_at = datetime.fromisoformat(paid_at_str.replace("Z", "+00:00"))
            except ValueError:
                payment.paid_at = datetime.utcnow()
        else:
            payment.paid_at = datetime.utcnow()

        # Mark order as paid
        order = db.query(Order).filter_by(id=payment.order_id).first()
        if order:
            order.payment_status = "paid"
            db.commit()
            logger.info(f"[PAYMENT] Payment verified ref={reference} order={payment.order_id}")
    elif ps_status == "failed":
        payment.status = PaymentStatus.FAILED
        logger.warning(f"[PAYMENT] Payment failed ref={reference}")

    db.commit()
    db.refresh(payment)

    return {
        "reference": payment.reference,
        "status": payment.status.value,
        "amount_ngn": payment.amount,
        "channel": payment.channel,
        "paid_at": payment.paid_at,
        "order_id": payment.order_id,
    }

def verify_paystack_signature(payload_bytes: bytes, signature: str) -> bool:
    # Validate the HMAC-SHA512 signature from Paystack.
    # This prevents forged webhook requests.
    expected = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode("utf-8"),
        payload_bytes,
        hashlib.sha512
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def handle_webhook(db: Session, payload: dict, raw_body: bytes, signature: str) -> dict:
    if not verify_paystack_signature(raw_body, signature):
        logger.warning("[WEBHOOK] Invalid Paystack signature — request rejected")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event = payload.get("event")
    data = payload.get("data", {})
    reference = data.get("reference")

    logger.info(f"[WEBHOOK] Received event={event} ref={reference}")

    if event == "charge.success":
        payment = db.query(Payment).filter_by(reference=reference).first()
        if not payment:
            logger.warning(f"[WEBHOOK] No payment found for ref={reference}")
            return {"status": "ignored", "reason": "unknown reference"}

        if payment.status == PaymentStatus.SUCCESS:
            return {"status": "already processed"}

        # Update payment
        payment.status = PaymentStatus.SUCCESS
        payment.gateway_response = json.dumps(data)
        payment.channel = data.get("channel")
        paid_at_str = data.get("paid_at")
        if paid_at_str:
            try:
                payment.paid_at = datetime.fromisoformat(paid_at_str.replace("Z", "+00:00"))
            except ValueError:
                payment.paid_at = datetime.utcnow()
        else:
            payment.paid_at = datetime.utcnow()

        # Mark order paid
        order = db.query(Order).filter_by(id=payment.order_id).first()
        if order:
            order.payment_status = "paid"
            db.commit()

            # Dispatch confirmation email via Celery task
            try:
                from workers.tasks import send_payment_receipt_task, send_order_confirmation_task
                user = order.user
                if user and user.email:
                    send_payment_receipt_task.delay(
                        email=user.email,
                        payment_data={
                            "reference": payment.reference,
                            "order_id": order.id,
                            "amount_ngn": payment.amount,
                            "channel": payment.channel,
                            "paid_at": payment.paid_at.strftime("%d %b %Y, %H:%M") if payment.paid_at else None,
                        }
                    )
            except Exception as e:
                logger.error(f"[WEBHOOK] Failed to dispatch email task: {e}")

        db.commit()
        logger.info(f"[WEBHOOK] ✅ charge.success processed for ref={reference}")
        return {"status": "ok"}

    elif event == "charge.failed":
        payment = db.query(Payment).filter_by(reference=reference).first()
        if payment:
            payment.status = PaymentStatus.FAILED
            payment.gateway_response = json.dumps(data)
            db.commit()
        return {"status": "ok"}

    # Acknowledge all other events silently
    return {"status": "ok", "event": event}
