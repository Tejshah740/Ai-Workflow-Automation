import smtplib
from email.message import EmailMessage

from app.config import settings


def send_email(to: str, subject: str, body: str) -> None:
   
    if not settings.smtp_host:
        print(f"[email:fallback, no SMTP_HOST configured] to={to} subject={subject!r}\n{body}")
        return

    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)