"""
services/email_service.py

Minimal SMTP sender using the same settings as the verification emails.
"""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from config import get_settings

logger = logging.getLogger(__name__)


class EmailNotConfigured(RuntimeError):
    """SMTP settings are missing, so nothing was attempted."""


class EmailSendError(RuntimeError):
    """SMTP was configured but the message could not be delivered."""


def send_email(to: str, subject: str, body: str) -> None:
    settings = get_settings()
    if not settings.smtp_host:
        raise EmailNotConfigured("SMTP is not configured")
    sender = settings.smtp_from_email or settings.smtp_username
    if not sender:
        raise EmailNotConfigured("SMTP sender address is not configured")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = to
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
    except Exception as exc:
        logger.exception("Failed to send email")
        raise EmailSendError(str(exc)[:200]) from exc
