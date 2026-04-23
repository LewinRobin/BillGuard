import smtplib
from email.mime.text import MIMEText
from app.core.config import settings


def send_otp_email(to_email: str, otp: str) -> None:
    body = f"""
Your BillCheck verification code is: {otp}

This code expires in {settings.OTP_EXPIRE_MINUTES} minutes.

If you did not request this, please ignore this email.
"""
    msg = MIMEText(body)
    msg["Subject"] = "Your BillCheck OTP"
    msg["From"] = settings.SMTP_USER
    msg["To"] = to_email

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
