"""Send-to-Kindle: email an EPUB to <user>@kindle.com.

Amazon's free conversion service does the rest. We require SMTP creds set
in env (Tyler's family SMTP relay).
"""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from pathlib import Path

from app.config import get_settings

log = logging.getLogger("pages.kindle")
settings = get_settings()


def send(to_email: str, file_path: Path, *, title: str) -> None:
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_pass:
        raise RuntimeError("SMTP not configured — set SMTP_HOST/SMTP_USER/SMTP_PASS in .env")

    msg = EmailMessage()
    msg["Subject"] = title
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.set_content(f"Sending {title} to your Kindle.")

    with file_path.open("rb") as f:
        msg.add_attachment(
            f.read(),
            maintype="application",
            subtype="epub+zip",
            filename=file_path.name,
        )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as smtp:
        smtp.starttls()
        smtp.login(settings.smtp_user, settings.smtp_pass)
        smtp.send_message(msg)
    log.info("send-to-kindle: %s -> %s", file_path.name, to_email)
