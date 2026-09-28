"""
alerts.py - Meikural Real Multi-Channel Alert Delivery Module
============================================================
Dispatches real-time SMS and Email alerts when suspicious voice spoofing
or deepfake activity triggers STEP_UP_VERIFICATION (Risk > 0.65).

Supported Channels:
1. Twilio SMS (Real Delivery using Twilio REST Client with fallback simulation)
2. SMTP Email (Real Delivery using standard smtplib + MIMEText with fallback simulation)
"""

import json
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, Optional
if os.getenv("ENVIRONMENT", "").lower() != "production":
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


def is_live_email_dispatch_enabled() -> bool:
    """
    Returns True if live email dispatch is enabled.
    Checks EMAIL_LIVE_DISPATCH environment variable first, then rules_config.json dynamic setting.
    Defaults to False to prevent inbox spam during rehearsal/benchmarking.
    """
    env_val = os.getenv("EMAIL_LIVE_DISPATCH", "").strip().lower()
    if env_val in ("true", "1", "yes"):
        return True

    try:
        rules_path = os.path.join(os.path.dirname(__file__), "rules_config.json")
        if os.path.exists(rules_path):
            with open(rules_path, "r") as f:
                cfg = json.load(f)
                if "email_live_dispatch" in cfg:
                    return bool(cfg["email_live_dispatch"])
    except Exception:
        pass
    return False


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
        logger.warning(
            f"{msg} | Session: {session_id} | Risk: {risk_score:.2f} | Verdict: {verdict}",
            extra={"session_id": session_id, "event_type": "sms_alert_simulated"},
        )
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
        logger.info(
            f"Twilio SMS sent successfully! SID: {message.sid} to {recipient}",
            extra={"session_id": session_id, "event_type": "sms_alert_delivered"},
        )
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
        logger.error(
            f"Failed to deliver Twilio SMS alert: {e}",
            extra={"session_id": session_id, "event_type": "sms_alert_failed"},
        )
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
    force_live: bool = False,
) -> Dict[str, Any]:
    """
    Sends a real security alert email via SMTP with fallback simulation.
    If force_live is True or live email dispatch is enabled, attempts real SMTP delivery.
    Otherwise, simulates safely to avoid inbox flooding during rehearsal/benchmarking.
    """
    smtp_host = os.getenv("SMTP_HOST", SMTP_HOST)
    smtp_port = int(os.getenv("SMTP_PORT", str(SMTP_PORT)))
    smtp_user = os.getenv("SMTP_USER", SMTP_USER)
    smtp_password = os.getenv("SMTP_PASSWORD", SMTP_PASSWORD)
    alert_from = os.getenv("ALERT_EMAIL_FROM", ALERT_EMAIL_FROM) or smtp_user
    recipient = to_email or os.getenv("ALERT_EMAIL_TO", ALERT_EMAIL_TO)
    email_subject = subject or f"[URGENT - MEIKURAL SECURITY ALERT] Voice Clone Detected ({session_id})"

    if not (smtp_user and smtp_password and recipient):
        msg = "SMTP credentials or recipient email not fully configured. Email alert simulated."
        logger.warning(
            f"{msg} | Session: {session_id} | Risk: {risk_score:.2f} | Verdict: {verdict}",
            extra={"session_id": session_id, "event_type": "email_alert_simulated"},
        )
        return {
            "status": "simulated",
            "message": msg,
            "session_id": session_id,
            "risk_score": risk_score,
            "verdict": verdict,
            "to": recipient,
            "subject": email_subject,
        }

    # Rehearsal safety guard: prevent inbox spam unless explicitly requested or toggled ON
    if not (force_live or is_live_email_dispatch_enabled()):
        msg = (
            "SMTP credentials configured, but automated live dispatch is disabled (EMAIL_LIVE_DISPATCH=false) "
            "to prevent rehearsal inbox spam. Email alert simulated."
        )
        logger.info(
            f"{msg} | Session: {session_id} | Risk: {risk_score:.2f} | Verdict: {verdict}",
            extra={"session_id": session_id, "event_type": "email_alert_simulated_guard"},
        )
        return {
            "status": "simulated",
            "message": msg,
            "session_id": session_id,
            "risk_score": risk_score,
            "verdict": verdict,
            "to": recipient,
            "subject": email_subject,
            "rehearsal_guard": True,
        }

    msg = MIMEMultipart("alternative")
    msg["Subject"] = email_subject
    msg["From"] = alert_from
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
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0D0F11; color: #F2F4F5; border: 1px solid #1E2225; border-radius: 12px; padding: 24px;">
            <div style="border-bottom: 2px solid #FF4713; padding-bottom: 12px; margin-bottom: 20px;">
                <span style="font-size: 20px; font-weight: bold; color: #FF4713; letter-spacing: -0.5px;">MEIKURAL</span>
                <span style="font-size: 11px; background: rgba(255, 71, 19, 0.15); color: #FF4713; padding: 3px 8px; border-radius: 4px; margin-left: 10px; font-weight: 600;">LIVE INCIDENT ALERT</span>
            </div>
            <h2 style="font-size: 16px; margin: 0 0 16px 0; color: #F2F4F5;">High-Risk Synthetic Voice / Deepfake Detected</h2>
            <div style="background: #141719; border: 1px solid #1E2225; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <div style="margin-bottom: 8px; font-size: 13px;"><strong style="color: #9BA3A8;">Session ID:</strong> <span style="font-family: monospace; color: #F2F4F5;">{session_id}</span></div>
                <div style="margin-bottom: 8px; font-size: 13px;"><strong style="color: #9BA3A8;">Calculated Risk:</strong> <span style="color: #EF4444; font-weight: bold;">{risk_score:.4f} ({risk_score*100:.1f}%)</span></div>
                <div style="margin-bottom: 8px; font-size: 13px;"><strong style="color: #9BA3A8;">Enforced Policy:</strong> <span style="color: #F59E0B; font-weight: 600;">{verdict}</span></div>
                <div style="font-size: 13px;"><strong style="color: #9BA3A8;">Security Action:</strong> Transaction frozen. Step-Up challenge dispatched.</div>
            </div>
            <p style="font-size: 11px; color: #5E666B; margin: 0; line-height: 1.5;">
                This cryptographic alert was triggered by Meikural Real-Time Voice Biometric Anti-Spoofing Gateway. Delivered via verified SMTP transport.
            </p>
        </div>
        """
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(alert_from, [recipient], msg.as_string())
            logger.info(
                f"SMTP Security Alert Email successfully sent to {recipient}",
                extra={"session_id": session_id, "event_type": "email_alert_delivered"},
            )
            return {
                "status": "delivered",
                "session_id": session_id,
                "risk_score": risk_score,
                "verdict": verdict,
                "to": recipient,
                "subject": email_subject,
            }
    except Exception as e:
        logger.error(
            f"Failed to send SMTP email alert: {e}",
            extra={"session_id": session_id, "event_type": "email_alert_failed"},
        )
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
    force_live_email: bool = False,
) -> Dict[str, Any]:
    """
    Dispatches multi-channel alerts (Twilio SMS + SMTP Email) when STEP_UP_VERIFICATION is triggered.
    """
    logger.warning(
        f"[STEP_UP_VERIFICATION] Triggering multi-channel alert delivery for session: {session_id} with risk: {risk_score:.2f}",
        extra={"session_id": session_id, "event_type": "step_up_alert_triggered"},
    )

    sms_res = send_sms_alert(session_id=session_id, risk_score=risk_score, verdict=verdict)
    email_res = send_email_alert(
        session_id=session_id,
        risk_score=risk_score,
        verdict=verdict,
        force_live=force_live_email,
    )

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
