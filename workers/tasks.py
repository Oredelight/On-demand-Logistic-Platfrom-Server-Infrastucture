import logging
from workers.celery_app import celery_app

logger = logging.getLogger(__name__)

@celery_app.task(
    name="workers.tasks.send_otp_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def send_otp_task(self, email: str, otp: str, purpose: str = "signup"):
    try:
        from utils.email import send_otp_email
        result = send_otp_email(to_email=email, otp=otp, purpose=purpose)
        if result:
            logger.info(f"[TASK:OTP] Sent OTP email to {email} (purpose={purpose})")
        else:
            logger.warning(f"[TASK:OTP] Email send returned False for {email}")
        return {"status": "sent", "email": email}
    except Exception as exc:
        logger.error(f"[TASK:OTP] Failed to send OTP to {email}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    name="workers.tasks.send_login_notification_task",
    bind=True,
    max_retries=2,
    default_retry_delay=30,
)
def send_login_notification_task(self, email: str, login_time: str, ip_address: str = None):
    try:
        from utils.email import send_login_notification
        send_login_notification(to_email=email, login_time=login_time, ip_address=ip_address)
        logger.info(f"[TASK:LOGIN] Login notification sent to {email}")
        return {"status": "sent"}
    except Exception as exc:
        logger.error(f"[TASK:LOGIN] Failed for {email}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    name="workers.tasks.send_order_confirmation_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def send_order_confirmation_task(self, email: str, order_data: dict):
    try:
        from utils.email import send_order_confirmation
        send_order_confirmation(to_email=email, order_data=order_data)
        logger.info(f"[TASK:ORDER] Order confirmation sent to {email} for order #{order_data.get('order_id')}")
        return {"status": "sent"}
    except Exception as exc:
        logger.error(f"[TASK:ORDER] Failed for {email}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    name="workers.tasks.send_payment_receipt_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def send_payment_receipt_task(self, email: str, payment_data: dict):
    try:
        from utils.email import send_payment_receipt
        send_payment_receipt(to_email=email, payment_data=payment_data)
        logger.info(f"[TASK:RECEIPT] Payment receipt sent to {email} ref={payment_data.get('reference')}")
        return {"status": "sent"}
    except Exception as exc:
        logger.error(f"[TASK:RECEIPT] Failed for {email}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    name="workers.tasks.send_status_update_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_status_update_task(self, email: str, order_id: int, new_status: str):
    try:
        from utils.email import send_order_status_update
        send_order_status_update(to_email=email, order_id=order_id, new_status=new_status)
        logger.info(f"[TASK:STATUS] Status update sent to {email} order=#{order_id} status={new_status}")
        return {"status": "sent"}
    except Exception as exc:
        logger.error(f"[TASK:STATUS] Failed for {email}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(
    name="workers.tasks.send_email_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def send_email_task(self, to_email: str, subject: str, html_body: str):
    try:
        from utils.email import send_email
        send_email(to_email=to_email, subject=subject, html_body=html_body)
        return {"status": "sent"}
    except Exception as exc:
        logger.error(f"[TASK:EMAIL] Generic send failed to {to_email}: {exc}")
        raise self.retry(exc=exc)
