"""
alerts.py - Meikural Real Multi-Channel Alert Delivery Module
============================================================
Dispatches real-time SMS and Email alerts when suspicious voice spoofing
or deepfake activity triggers STEP_UP_VERIFICATION (Risk > 0.65).

Supported Channels:
1. Twilio SMS (Real Delivery using Twilio REST Client with fallback simulation)
2. SMTP Email (Real Delivery using standard smtplib + MIMEText with fallback simulation)
"""

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("meikural_alerts")

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
VERIFIED_PHONE_NUMBER = os.getenv("VERIFIED_PHONE_NUMBER", "")

# SMTP Configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
ALERT_EMAIL_FROM = os.getenv("ALERT_EMAIL_FROM", SMTP_USER)
ALERT_EMAIL_TO = os.getenv("ALERT_EMAIL_TO", "")

RISK_THRESHOLD_STEP_UP = 0.65


def send_sms_alert(
    session_id: str,
    risk_score: float,
    verdict: str = "STEP_UP_VERIFICATION",
    to_phone: Optional[str] = None,
    custom_body: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Sends a real SMS alert via Twilio REST API with fallback simulation.
    """
    recipient = to_phone or VERIFIED_PHONE_NUMBER
    body = custom_body or (
        f"[MEIKURAL ALERT] Suspicious voice clone detected on Call ID: {session_id} "
        f"(Risk: {risk_score:.2f}, Verdict: {verdict}). Transaction locked and step-up verification initiated."
    )

    if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER and recipient):
        msg = "Twilio credentials or recipient phone number not fully configured. SMS alert simulated."
        logger.warning(f"{msg} | Session: {session_id} | Risk: {risk_score:.2f} | Verdict: {verdict}")
        return {
            "status": "simulated",
            "message": msg,
            "session_id": session_id,
            "risk_score": risk_score,
            "verdict": verdict,
            "body": body,
            "to": recipient,
        }

    try:
        from twilio.rest import Client

        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=body,
            from_=TWILIO_PHONE_NUMBER,
            to=recipient,
        )
        logger.info(f"Twilio SMS sent successfully! SID: {message.sid} to {recipient}")
        return {
            "status": "delivered",
            "sid": message.sid,
            "session_id": session_id,
            "risk_score": risk_score,
            "verdict": verdict,
            "to": recipient,
            "body": body,
        }
    except Exception as e:
        logger.error(f"Failed to deliver Twilio SMS alert: {e}")
        return {
            "status": "error",
            "error": str(e),
            "session_id": session_id,
            "risk_score": risk_score,
            "verdict": verdict,
            "body": body,
            "to": recipient,
        }


def send_email_alert(
    session_id: str,
    risk_score: float,
    verdict: str = "STEP_UP_VERIFICATION",
    to_email: Optional[str] = None,
    subject: Optional[str] = None,
    html_content: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Sends a real security alert email via SMTP with fallback simulation.
    """
    recipient = to_email or ALERT_EMAIL_TO
    email_subject = subject or f"[URGENT - MEIKURAL SECURITY ALERT] Voice Clone Detected ({session_id})"

    if not (SMTP_USER and SMTP_PASSWORD and recipient):
        msg = "SMTP credentials or recipient email not fully configured. Email alert simulated."
        logger.warning(f"{msg} | Session: {session_id} | Risk: {risk_score:.2f} | Verdict: {verdict}")
        return {
            "status": "simulated",
            "message": msg,
            "session_id": session_id,
            "risk_score": risk_score,
            "verdict": verdict,
            "to": recipient,
            "subject": email_subject,
        }

    msg = MIMEMultipart("alternative")
    msg["Subject"] = email_subject
    msg["From"] = ALERT_EMAIL_FROM
    msg["To"] = recipient

    plain_text = (
        f"MEIKURAL ANTI-SPOOFING SECURITY ALERT\n"
        f"=====================================\n"
        f"Call Session ID: {session_id}\n"
        f"Calculated Risk Score: {risk_score:.4f}\n"
        f"Verdict: {verdict}\n"
        f"Action: Voice biometric clone suspected. Immediate transaction freeze and challenge step-up triggered.\n"
    )

    if html_content:
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))
    else:
        msg.attach(MIMEText(plain_text, "plain"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(ALERT_EMAIL_FROM, [recipient], msg.as_string())
            logger.info(f"SMTP Security Alert Email successfully sent to {recipient}")
            return {
                "status": "delivered",
                "session_id": session_id,
                "risk_score": risk_score,
                "verdict": verdict,
                "to": recipient,
                "subject": email_subject,
            }
    except Exception as e:
        logger.error(f"Failed to send SMTP email alert: {e}")
        return {
            "status": "error",
            "error": str(e),
            "session_id": session_id,
            "risk_score": risk_score,
            "verdict": verdict,
            "to": recipient,
        }


def dispatch_step_up_alerts(
    session_id: str,
    risk_score: float,
    verdict: str = "STEP_UP_VERIFICATION",
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Dispatches multi-channel alerts (Twilio SMS + SMTP Email) when STEP_UP_VERIFICATION is triggered.
    """
    logger.warning(
        f"[STEP_UP_VERIFICATION] Triggering multi-channel alert delivery for session: {session_id} with risk: {risk_score:.2f}"
    )

    sms_res = send_sms_alert(session_id=session_id, risk_score=risk_score, verdict=verdict)
    email_res = send_email_alert(session_id=session_id, risk_score=risk_score, verdict=verdict)

    return {
        "session_id": session_id,
        "risk_score": risk_score,
        "verdict": verdict,
        "sms": sms_res,
        "email": email_res,
    }


# Aliases for backward compatibility
send_twilio_sms = send_sms_alert
send_smtp_email = send_email_alert
