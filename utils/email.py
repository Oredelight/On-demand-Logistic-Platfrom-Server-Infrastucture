import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional
from jinja2 import Template
from config import settings

logger = logging.getLogger(__name__)


_BASE_STYLE = """
body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; }
.wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.header { background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); padding: 40px 30px; text-align: center; }
.header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
.header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
.content { padding: 40px 30px; }
.content h2 { color: #1a1a2e; font-size: 22px; margin: 0 0 16px; }
.content p { color: #555; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
.otp-box { background: linear-gradient(135deg, #f8f9ff 0%, #eef0ff 100%); border: 2px dashed #FF6B35; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0; }
.otp-code { font-size: 42px; font-weight: 700; color: #FF6B35; letter-spacing: 8px; display: block; }
.otp-note { color: #888; font-size: 13px; margin-top: 8px; }
.btn { display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); color: #fff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 16px 0; }
.order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
.order-table th { background: #f8f8f8; color: #333; font-weight: 600; padding: 10px 14px; text-align: left; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #eee; }
.order-table td { padding: 12px 14px; color: #444; font-size: 14px; border-bottom: 1px solid #f0f0f0; }
.total-row td { font-weight: 700; color: #FF6B35; font-size: 16px; border-top: 2px solid #eee; border-bottom: none; }
.status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.status-pending { background: #fff3e0; color: #e65100; }
.status-paid { background: #e8f5e9; color: #2e7d32; }
.alert-box { background: #fff8e1; border-left: 4px solid #FFC107; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 20px 0; }
.footer { background: #f8f8f8; padding: 24px 30px; text-align: center; border-top: 1px solid #eee; }
.footer p { color: #999; font-size: 12px; margin: 0; line-height: 1.6; }
.divider { height: 1px; background: linear-gradient(to right, transparent, #eee, transparent); margin: 24px 0; }
"""

OTP_TEMPLATE = Template("""
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>{{ style }}</style></head>
<body><div class="wrapper">
  <div class="header">
    <h1>🍽️ {{ app_name }}</h1>
    <p>{{ subtitle }}</p>
  </div>
  <div class="content">
    <h2>{{ heading }}</h2>
    <p>{{ greeting }}</p>
    <div class="otp-box">
      <span class="otp-code">{{ otp }}</span>
      <p class="otp-note">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
    </div>
    <p>If you didn't request this, please ignore this email or contact our support team.</p>
  </div>
  <div class="footer">
    <p>© {{ year }} {{ app_name }}. All rights reserved.<br>This is an automated message, please do not reply.</p>
  </div>
</div></body></html>
""")

LOGIN_ALERT_TEMPLATE = Template("""
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>{{ style }}</style></head>
<body><div class="wrapper">
  <div class="header">
    <h1>🍽️ {{ app_name }}</h1>
    <p>Security Alert</p>
  </div>
  <div class="content">
    <h2>New Login Detected</h2>
    <p>Hi there! We noticed a new sign-in to your {{ app_name }} account.</p>
    <div class="alert-box">
      <p style="margin:0;"><strong>Time:</strong> {{ login_time }}</p>
      {% if ip_address %}<p style="margin:8px 0 0;"><strong>IP Address:</strong> {{ ip_address }}</p>{% endif %}
    </div>
    <p>If this was you, you can safely ignore this email. If you didn't sign in, please <strong>change your password immediately</strong> and contact our support team.</p>
  </div>
  <div class="footer">
    <p>© {{ year }} {{ app_name }}. All rights reserved.</p>
  </div>
</div></body></html>
""")

ORDER_CONFIRMATION_TEMPLATE = Template("""
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>{{ style }}</style></head>
<body><div class="wrapper">
  <div class="header">
    <h1>🍽️ {{ app_name }}</h1>
    <p>Order Confirmation</p>
  </div>
  <div class="content">
    <h2>🎉 Order Placed Successfully!</h2>
    <p>Thank you for your order! We've received it and it's now being prepared. Here's your order summary:</p>
    <p><strong>Order ID:</strong> #{{ order_id }} &nbsp;|&nbsp;
       <span class="status-badge status-pending">{{ status }}</span></p>
    <table class="order-table">
      <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
      <tbody>
        {% for item in items %}
        <tr>
          <td>
            <strong>{{ item.food }}</strong>
            {% if item.protein %}<br><small style="color:#888">+ {{ item.protein }}</small>{% endif %}
            {% if item.extras %}<br><small style="color:#888">+ {{ item.extras | join(', ') }}</small>{% endif %}
          </td>
          <td>{{ item.quantity }}</td>
          <td>₦{{ "%.2f"|format(item.item_total) }}</td>
        </tr>
        {% endfor %}
      </tbody>
      <tfoot>
        <tr><td colspan="2" style="text-align:right;padding:10px 14px;color:#888;font-size:13px;">Subtotal</td><td>₦{{ "%.2f"|format(subtotal) }}</td></tr>
        <tr><td colspan="2" style="text-align:right;padding:10px 14px;color:#888;font-size:13px;">Delivery Fee</td><td>₦{{ "%.2f"|format(delivery_fee) }}</td></tr>
        <tr><td colspan="2" style="text-align:right;padding:10px 14px;color:#888;font-size:13px;">Service Fee</td><td>₦{{ "%.2f"|format(service_fee) }}</td></tr>
        <tr><td colspan="2" style="text-align:right;padding:10px 14px;color:#888;font-size:13px;">Tax (7.5%)</td><td>₦{{ "%.2f"|format(tax) }}</td></tr>
        <tr class="total-row"><td colspan="2" style="text-align:right;padding:12px 14px;">Total</td><td>₦{{ "%.2f"|format(total) }}</td></tr>
      </tfoot>
    </table>
    {% if instructions %}<div class="alert-box"><p style="margin:0;"><strong>Special Instructions:</strong> {{ instructions }}</p></div>{% endif %}
    <p style="color:#888;font-size:13px;">You'll receive updates as your order progresses. Estimated delivery time: <strong>30–45 minutes</strong>.</p>
  </div>
  <div class="footer">
    <p>© {{ year }} {{ app_name }}. All rights reserved.</p>
  </div>
</div></body></html>
""")

PAYMENT_RECEIPT_TEMPLATE = Template("""
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>{{ style }}</style></head>
<body><div class="wrapper">
  <div class="header">
    <h1>🍽️ {{ app_name }}</h1>
    <p>Payment Receipt</p>
  </div>
  <div class="content">
    <h2>Payment Successful!</h2>
    <p>Your payment has been confirmed. Your order is now being prepared.</p>
    <table class="order-table">
      <tbody>
        <tr><td><strong>Reference</strong></td><td>{{ reference }}</td></tr>
        <tr><td><strong>Order ID</strong></td><td>#{{ order_id }}</td></tr>
        <tr><td><strong>Amount Paid</strong></td><td><strong style="color:#FF6B35;">₦{{ "%.2f"|format(amount_ngn) }}</strong></td></tr>
        <tr><td><strong>Payment Method</strong></td><td>{{ channel | default("Card", true) | title }}</td></tr>
        <tr><td><strong>Date</strong></td><td>{{ paid_at }}</td></tr>
        <tr><td><strong>Status</strong></td><td><span class="status-badge status-paid">Paid</span></td></tr>
      </tbody>
    </table>
  </div>
  <div class="footer">
    <p>Keep this email as your payment receipt.<br>© {{ year }} {{ app_name }}. All rights reserved.</p>
  </div>
</div></body></html>
""")

STATUS_UPDATE_TEMPLATE = Template("""
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>{{ style }}</style></head>
<body><div class="wrapper">
  <div class="header">
    <h1>🍽️ {{ app_name }}</h1>
    <p>Order Update</p>
  </div>
  <div class="content">
    <h2>Order Status Update</h2>
    <p>Your order <strong>#{{ order_id }}</strong> status has been updated:</p>
    <div class="otp-box">
      <span style="font-size:28px;font-weight:700;color:#FF6B35;letter-spacing:1px;">{{ new_status }}</span>
      <p class="otp-note">{{ status_message }}</p>
    </div>
    <p>You can check your full order details in the app at any time.</p>
  </div>
  <div class="footer">
    <p>© {{ year }} {{ app_name }}. All rights reserved.</p>
  </div>
</div></body></html>
""")

STATUS_MESSAGES = {
    "Processing": "Great news! We've confirmed your order and are preparing your food.",
    "Shipped": "Your order is on its way! A delivery rider has picked up your food.",
    "Delivered": "Your order has been delivered. Enjoy your meal! 🎉",
    "Cancelled": "Your order has been cancelled. If you have questions, contact support.",
}


def _send_via_smtp(to_email: str, subject: str, html_body: str) -> bool:
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.FROM_NAME} <{settings.FROM_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(settings.FROM_EMAIL, to_email, msg.as_string())

        logger.info(f"[EMAIL-SMTP] Sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"[EMAIL-SMTP] Failed to send to {to_email}: {e}")
        return False


def _send_via_sendgrid(to_email: str, subject: str, html_body: str) -> bool:
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        message = Mail(
            from_email=(settings.FROM_EMAIL, settings.FROM_NAME),
            to_emails=to_email,
            subject=subject,
            html_content=html_body
        )
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(f"[EMAIL-SENDGRID] Sent to {to_email}: {subject} | status={response.status_code}")
        return response.status_code in (200, 202)
    except Exception as e:
        logger.error(f"[EMAIL-SENDGRID] Failed to send to {to_email}: {e}")
        return False


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    if settings.EMAIL_PROVIDER == "sendgrid" and settings.SENDGRID_API_KEY:
        success = _send_via_sendgrid(to_email, subject, html_body)
        if not success:
            logger.warning("[EMAIL] SendGrid failed, falling back to SMTP")
            return _send_via_smtp(to_email, subject, html_body)
        return success
    return _send_via_smtp(to_email, subject, html_body)


def send_otp_email(to_email: str, otp: str, purpose: str = "signup") -> bool:
    purposes = {
        "signup": ("Verify Your Email", "Complete your registration", "Welcome! Verify your account"),
        "resend": ("New OTP Code", "Your new verification code", "Here's your new OTP"),
        "password_reset": ("Reset Your Password", "Password reset OTP", "Reset your password"),
    }
    subject, subtitle, heading = purposes.get(purpose, purposes["signup"])

    html = OTP_TEMPLATE.render(
        style=_BASE_STYLE,
        app_name=settings.APP_NAME,
        subtitle=subtitle,
        heading=heading,
        greeting=f"Here is your one-time verification code:",
        otp=otp,
        year=datetime.utcnow().year
    )
    return send_email(to_email, f"{settings.APP_NAME} — {subject}", html)


def send_login_notification(to_email: str, login_time: str, ip_address: Optional[str] = None) -> bool:
    html = LOGIN_ALERT_TEMPLATE.render(
        style=_BASE_STYLE,
        app_name=settings.APP_NAME,
        login_time=login_time,
        ip_address=ip_address,
        year=datetime.utcnow().year
    )
    return send_email(to_email, f"{settings.APP_NAME} — New Login to Your Account", html)


def send_order_confirmation(to_email: str, order_data: dict) -> bool:
    html = ORDER_CONFIRMATION_TEMPLATE.render(
        style=_BASE_STYLE,
        app_name=settings.APP_NAME,
        order_id=order_data["order_id"],
        status=order_data.get("status", "Pending"),
        items=order_data.get("items", []),
        subtotal=order_data.get("subtotal", 0),
        delivery_fee=order_data.get("delivery_fee", 0),
        service_fee=order_data.get("service_fee", 0),
        tax=order_data.get("tax", 0),
        total=order_data.get("total", 0),
        instructions=order_data.get("instructions"),
        year=datetime.utcnow().year
    )
    return send_email(to_email, f"{settings.APP_NAME} — Order #{ order_data['order_id']} Confirmed!", html)


def send_payment_receipt(to_email: str, payment_data: dict) -> bool:
    html = PAYMENT_RECEIPT_TEMPLATE.render(
        style=_BASE_STYLE,
        app_name=settings.APP_NAME,
        reference=payment_data.get("reference"),
        order_id=payment_data.get("order_id"),
        amount_ngn=payment_data.get("amount_ngn", 0),
        channel=payment_data.get("channel"),
        paid_at=payment_data.get("paid_at", datetime.utcnow().strftime("%d %b %Y, %H:%M")),
        year=datetime.utcnow().year
    )
    return send_email(to_email, f"{settings.APP_NAME} — Payment Receipt", html)


def send_order_status_update(to_email: str, order_id: int, new_status: str) -> bool:
    msg = STATUS_MESSAGES.get(new_status, "Your order status has been updated.")
    html = STATUS_UPDATE_TEMPLATE.render(
        style=_BASE_STYLE,
        app_name=settings.APP_NAME,
        order_id=order_id,
        new_status=new_status,
        status_message=msg,
        year=datetime.utcnow().year
    )
    return send_email(to_email, f"{settings.APP_NAME} — Order #{order_id} is now {new_status}", html)
