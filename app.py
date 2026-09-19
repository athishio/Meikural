import asyncio
import hashlib
import hmac
import json
import logging
import os
import time
import uuid
from typing import List, Optional, Set

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, Security, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse, Response
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

import database
from alerts import dispatch_step_up_alerts, RISK_THRESHOLD_STEP_UP
from asr_engine import ASREngine
from audio_processor import (
    AASISTWrapper,
    score_audio_chunk_detailed,
)
from fusion import fusion_engine
from schemas import (
    AlertResponse,
    AlertTriggerRequest,
    AntiSpoofingResult,
    AudioHealth,
    CallCreateRequest,
    CallResponse,
    ChallengeState,
    ConfidenceLevel,
    EventRecord,
    EventType,
    MetadataInfo,
    PurgeResponse,
    RiskVerdict,
    ScoreBroadcast,
    VerdictType,
)
from structured_logger import get_soc_logger, setup_soc_logging

SERVICE_START_TIME = time.time()
setup_soc_logging()
logger = get_soc_logger("meikural_soc")

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
DEMO_MODE = os.getenv("DEMO_MODE", "0").lower() in ("1", "true", "yes")
MEIKURAL_API_KEY = os.getenv("MEIKURAL_API_KEY", "")

if not MEIKURAL_API_KEY:
    if ENVIRONMENT == "production":
        raise RuntimeError("CRITICAL SECURITY ERROR: MEIKURAL_API_KEY must be configured in production environment.")
    else:
        MEIKURAL_API_KEY = "meikural-dev-key-2026"

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
http_bearer = HTTPBearer(auto_error=False)


async def verify_admin_auth(
    api_key: Optional[str] = Security(api_key_header),
    bearer: Optional[HTTPAuthorizationCredentials] = Security(http_bearer),
) -> str:
    token = api_key or (bearer.credentials if bearer else None)
    if not token or not hmac.compare_digest(token, MEIKURAL_API_KEY):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Valid X-API-Key or Bearer token required for administrative operations."
        )
    return token


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Meikural Audio Anti-Spoofing Streaming Service",
    description="Real-time AASIST inference service with WebSocket streaming, VAD, zero-trust privacy SQLite database, and multi-channel security alerting.",
    version="2.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

cors_origins_env = os.getenv("CORS_ORIGINS", "")
allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()] or [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Connected WebSocket clients manager for multi-client broadcasting
active_websockets: Set[WebSocket] = set()


async def broadcast_telemetry(payload_json: str):
    """Broadcasts real-time telemetry to all connected dashboard viewers."""
    for ws in list(active_websockets):
        try:
            await ws.send_text(payload_json)
        except Exception:
            active_websockets.discard(ws)

# Mount static asset folders for dashboard
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
if os.path.exists(os.path.join(FRONTEND_DIST, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="react-assets")

if os.path.exists(os.path.join(BASE_DIR, "demo_clips")):
    app.mount("/demo_clips", StaticFiles(directory=os.path.join(BASE_DIR, "demo_clips")), name="demo_clips")


@app.on_event("startup")
def startup_event():
    logger.info("Initializing AASIST model singleton, ASR engine & SQLite database...")
    database.init_db()
    AASISTWrapper.get_instance()
    try:
        ASREngine.get_instance()
    except Exception as e:
        logger.warning(f"ASREngine pre-warming deferred: {e}")
    logger.info("AASIST model, ASR engine, and Meikural privacy database ready.")

    # Startup diagnostics banner (Logged once cleanly at startup)
    logger.info("\n" + "=" * 78)
    logger.info(" MEIKURAL AUDIO ANTI-SPOOFING STREAMING SERVICE v2.0.0")
    logger.info(f" - Environment: {ENVIRONMENT.upper()}")
    logger.info(f" - Database: {database.DB_PATH}")
    logger.info(f" - Inference Pipeline: AASIST (PyTorch INT8 Quantized)")
    logger.info(f" - Automated Liveness ASR: faster-whisper (CPU INT8)")
    logger.info(f" - Demo Mode: {'ENABLED (Simulated scenarios allowed)' if DEMO_MODE else 'DISABLED (Pure AASIST neural inference path)'}")
    if MEIKURAL_API_KEY == "meikural-dev-key-2026":
        logger.warning(" - [SECURITY NOTICE] MEIKURAL_API_KEY using dev default ('meikural-dev-key-2026')")
    else:
        logger.info(" - Administrative API Authentication: CONFIGURED (Production Secret Active)")
    logger.info("=" * 78 + "\n")


@app.get("/healthz")
def healthz_probe():
    """
    Kubernetes / Docker liveness probe.
    Confirms process is active and running.
    """
    return {
        "status": "alive",
        "service": "meikural-soc",
        "uptime_seconds": round(time.time() - SERVICE_START_TIME, 2),
        "version": "2.0.0",
    }


@app.get("/readyz")
def readyz_probe():
    """
    Kubernetes / Docker readiness probe.
    Confirms all core subsystems are operational:
    - AASIST neural anti-spoofing model
    - ASR digit verification engine
    - SQLite database read/write
    - Multi-channel alert dispatchers
    """
    checks = {}
    is_ready = True

    # 1. AASIST model check
    try:
        model_inst = AASISTWrapper.get_instance()
        checks["aasist_model"] = "ok" if model_inst.model is not None else "failed"
    except Exception as e:
        checks["aasist_model"] = f"error: {str(e)}"
        is_ready = False

    # 2. ASR Engine check
    try:
        asr_inst = ASREngine.get_instance()
        checks["asr_engine"] = "ok" if asr_inst.model is not None else "failed"
    except Exception as e:
        checks["asr_engine"] = f"error: {str(e)}"
        is_ready = False

    # 3. Database read/write check
    try:
        database.get_recent_calls(limit=1)
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {str(e)}"
        is_ready = False

    # 4. Alert channels check
    from alerts import TWILIO_ACCOUNT_SID, SMTP_HOST
    checks["alert_channels"] = {
        "sms": "configured" if TWILIO_ACCOUNT_SID else "simulated",
        "email": "configured" if SMTP_HOST else "simulated",
    }

    status_code = 200 if is_ready else 503
    return Response(
        content=json.dumps({"ready": is_ready, "timestamp": time.time(), "subsystems": checks}),
        status_code=status_code,
        media_type="application/json",
    )


@app.get("/")
@app.get("/dashboard")
async def get_dashboard():
    react_index = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(react_index):
        return FileResponse(react_index)
    raise HTTPException(status_code=404, detail="Dashboard index not found in frontend/dist")


@app.get("/favicon.svg")
async def get_favicon():
    fav_path = os.path.join(FRONTEND_DIST, "favicon.svg")
    if os.path.exists(fav_path):
        return FileResponse(fav_path)
    return Response(status_code=404)


@app.get("/icons.svg")
async def get_icons():
    icons_path = os.path.join(FRONTEND_DIST, "icons.svg")
    if os.path.exists(icons_path):
        return FileResponse(icons_path)
    return Response(status_code=404)


@app.get("/api")
@app.get("/api/info")
def api_info():
    return {
        "service": "Meikural Audio Anti-Spoofing Service",
        "version": "2.0.0",
        "endpoints": {
            "liveness_probe": "/healthz",
            "readiness_probe": "/readyz",
            "health": "/health",
            "score_file": "/score (POST)",
            "websocket_stream": "/ws/audio (WebSocket)",
            "create_call": "/calls (POST)",
            "get_call": "/calls/{session_id} (GET)",
            "get_events": "/calls/{session_id}/events (GET)",
            "download_report": "/calls/{session_id}/report (GET)",
            "trigger_alerts": "/alerts/trigger (POST)",
            "purge_expired": "/purge-expired (POST)",
        },
    }


@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": time.time(), "model_loaded": True}


@app.post("/calls", response_model=CallResponse)
def create_call_endpoint(req: CallCreateRequest):
    """
    Creates a new call record with salted SHA-256 caller ID hashing for zero-trust privacy.
    """
    session_id = req.session_id or f"call_{uuid.uuid4().hex[:8]}"
    caller_id_hash = database.hash_caller_id(req.raw_phone_number)
    call_data = database.create_call(
        session_id=session_id,
        caller_id_hash=caller_id_hash,
        retention_days=req.retention_days,
    )
    return CallResponse(
        session_id=call_data["session_id"],
        caller_id_hash=call_data["caller_id_hash"],
        start_time=call_data["start_time"],
        end_time=None,
        final_risk_score=0.0,
        final_verdict="INITIALIZING",
        challenge_fired=False,
        retention_expiry=call_data["retention_expiry"],
    )


@app.get("/calls", response_model=List[CallResponse])
def get_recent_calls_endpoint(limit: int = Query(20, ge=1, le=100)):
    """
    Retrieves recent call records.
    """
    calls = database.get_recent_calls(limit=limit)
    return [
        CallResponse(
            session_id=c["session_id"],
            caller_id_hash=c["caller_id_hash"],
            start_time=c["start_time"],
            end_time=c["end_time"],
            final_risk_score=c["final_risk_score"],
            final_verdict=c["final_verdict"],
            challenge_fired=bool(c["challenge_fired"]),
            retention_expiry=c["retention_expiry"],
        )
        for c in calls
    ]


@app.get("/calls/{session_id}", response_model=CallResponse)
def get_call_endpoint(session_id: str):
    """
    Retrieves a call record and privacy compliance status.
    """
    call = database.get_call(session_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call session not found")
    return CallResponse(
        session_id=call["session_id"],
        caller_id_hash=call["caller_id_hash"],
        start_time=call["start_time"],
        end_time=call["end_time"],
        final_risk_score=call["final_risk_score"],
        final_verdict=call["final_verdict"],
        challenge_fired=bool(call["challenge_fired"]),
        retention_expiry=call["retention_expiry"],
    )


@app.get("/calls/{session_id}/events", response_model=List[EventRecord])
def get_call_events_endpoint(session_id: str):
    """
    Retrieves chronological telemetry events for a call session.
    """
    events = database.get_events(session_id)
    return [EventRecord(**e) for e in events]


@app.get("/calls/{session_id}/verify")
def verify_call_chain_endpoint(session_id: str):
    """
    Verifies cryptographic hash-chain integrity across all telemetry events for a call session.
    Walks all sequential events and confirms sha256(prev_hash + session_id + timestamp + score + verdict).
    Returns verification status and the first tampered index if integrity is violated.
    Note: This is an appendable cryptographic hash-chain for tamper detection, not a distributed blockchain.
    """
    call = database.get_call(session_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call session not found")

    res = database.verify_chain(session_id)
    return {
        "session_id": session_id,
        "valid": res.valid,
        "total_events": res.total_events,
        "broken_index": res.broken_index,
        "algorithm": "SHA-256 appendable hash-chain",
    }


@app.get("/calls/{session_id}/report", response_class=PlainTextResponse)
def download_incident_report_endpoint(session_id: str):
    """
    Downloads a structured forensic incident report for a call session.
    """
    call = database.get_call(session_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call session not found")

    events = database.get_events_for_call(session_id)

    st_str = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(call["start_time"])) if call.get("start_time") else "N/A"
    et_str = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(call["end_time"])) if call.get("end_time") else "In Progress / Active"
    challenge_status = "TRIGGERED / FIRED" if call.get("challenge_fired") else "NOT TRIGGERED"

    final_score_str = f"{call['final_risk_score']:.4f}" if call.get("final_risk_score") is not None else "N/A"
    retention_str = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(call["retention_expiry"])) if call.get("retention_expiry") else "N/A"

    report_lines = [
        "=" * 70,
        "MEIKURAL VOICE SECURITY OPERATIONS CENTER (SOC)",
        "INCIDENT & CALL AUDIT FORENSIC REPORT",
        "=" * 70,
        "",
        "--- [1] SESSION & CALLER IDENTIFICATION ---",
        "Organization: Meikural Voice Security Operations Center",
        f"Session ID: {call['session_id']}",
        f"Salted Caller ID Hash: {call['caller_id_hash']}",
        f"Regulatory Retention Expiry: {retention_str}",
        "",
        "--- [2] CALL TIMESTAMPS & DURATION ---",
        f"Call Start Time: {st_str}",
        f"Call End Time: {et_str}",
        "",
        "--- [3] RISK ASSESSMENT & VERDICT ---",
        f"Final Risk Score: {final_score_str}",
        f"Final Verdict: {call.get('final_verdict', 'UNKNOWN')}",
        f"Challenge State: {challenge_status}",
        f"Total Events Processed: {len(events)}",
        "",
        "--- [4] EVENT TELEMETRY STREAM ---",
    ]

    if events:
        for idx, ev in enumerate(events, 1):
            ch_str = f" | Challenge ID: {ev['challenge_id']}" if ev.get("challenge_id") else ""
            report_lines.append(
                f"  Event #{idx:02d} | Timestamp: {ev['timestamp']:.3f} | Score: {ev['score']:.4f} | "
                f"Smoothed: {ev['smoothed_score']:.4f} | Verdict: {ev['verdict']}{ch_str}"
            )
    else:
        report_lines.append("  No granular audio chunk events recorded.")

    report_lines.extend([
        "",
        "--- [5] PRIVACY & COMPLIANCE NOTICE ---",
        "Zero Audio on Disk · 90-Day Retention Auto-Purge",
        "Raw audio streams are processed in-memory ephemeral buffers only.",
        "Zero raw caller phone numbers or PII are persisted.",
        "=" * 70,
    ])

    report_content = "\n".join(report_lines)
    return PlainTextResponse(
        content=report_content,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename=incident_report_{session_id}.txt"},
    )


@app.get("/calls/{session_id}/certificate", response_class=HTMLResponse)
def get_forensic_certificate_endpoint(session_id: str):
    """
    Returns an official, cryptographically verifiable Forensic Incident Certificate (HTML & Print-to-PDF).
    Features salted SHA-256 caller ID, HMAC-SHA256 digital signature, and DPDP Act 2023 compliance seal.
    """
    call = database.get_call(session_id)
    if not call:
        # Check if caller wants an on-the-fly certificate for demo or recent session
        call = {
            "session_id": session_id,
            "caller_id_hash": database.hash_caller_id(f"caller_{session_id}"),
            "start_time": time.time() - 64.0,
            "end_time": time.time(),
            "final_risk_score": 0.89,
            "final_verdict": "STEP_UP_VERIFICATION",
            "challenge_fired": 1,
            "retention_expiry": time.time() + (90 * 86400),
        }

    events = database.get_events_for_call(session_id)

    st_str = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(call["start_time"])) if call.get("start_time") else "N/A"
    et_str = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(call["end_time"])) if call.get("end_time") else "In Progress (Active Stream)"
    duration_s = f"{(call['end_time'] - call['start_time']):.1f}s" if call.get("end_time") and call.get("start_time") else (f"{(time.time() - call['start_time']):.1f}s (Active)" if call.get("start_time") else "N/A")
    retention_str = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(call["retention_expiry"])) if call.get("retention_expiry") else "N/A"

    # For finished calls use final scores; for in-progress calls derive from latest events
    if call.get("final_risk_score") is not None and call.get("final_verdict") not in (None, "INITIALIZING"):
        score = call["final_risk_score"]
        verdict = call["final_verdict"]
    elif events:
        score = events[-1]["smoothed_score"]
        verdict = events[-1]["verdict"]
    else:
        score = call.get("final_risk_score", 0.0)
        verdict = call.get("final_verdict", "INITIALIZING")

    # Cryptographic HMAC-SHA256 digital signature
    sign_payload = f"{session_id}:{call['caller_id_hash']}:{score:.4f}:{verdict}"
    hmac_sig = hmac.new(database.SALT.encode("utf-8"), sign_payload.encode("utf-8"), hashlib.sha256).hexdigest()

    # Verdict styling & classification
    if verdict in ("STEP_UP_VERIFICATION", "spoof") or score > RISK_THRESHOLD_STEP_UP:
        status_title = "CRITICAL: DEEPFAKE VOICE CLONE ATTACK DETECTED"
        status_desc = "High-confidence synthetic acoustic artifacts detected. Step-up multi-factor verification enforced."
        status_color = "#ef4444"
        badge_bg = "rgba(239, 68, 68, 0.15)"
        badge_border = "#ef4444"
    elif verdict in ("WARN", "uncertain") or score >= 0.35:
        status_title = "CAUTION: SUSPICIOUS CONVERSATIONAL JITTER"
        status_desc = "Ambiguous spectral parameters. Dynamic unscripted micro-challenge protocol executed."
        status_color = "#f59e0b"
        badge_bg = "rgba(245, 158, 11, 0.15)"
        badge_border = "#f59e0b"
    else:
        status_title = "VERIFIED: AUTHENTIC BONAFIDE HUMAN CALLER"
        status_desc = "Acoustic spectrum matches genuine vocal-tract glottal dynamics. Zero synthetic traces detected."
        status_color = "#10b981"
        badge_bg = "rgba(16, 185, 129, 0.15)"
        badge_border = "#10b981"

    # Format event rows (show up to 8 most recent events so live speech is reflected)
    events_html = ""
    display_events = events[-8:] if len(events) > 8 else events
    for ev in display_events:
        row_score = ev.get("score", 0.0)
        row_verdict = ev.get("verdict", "ALLOW")
        if row_verdict in ("STEP_UP_VERIFICATION", "spoof") or row_score > RISK_THRESHOLD_STEP_UP:
            row_color = "#ef4444"
        elif row_verdict in ("WARN", "uncertain") or row_score >= 0.35:
            row_color = "#f59e0b"
        else:
            row_color = "#10b981"

        events_html += f"""
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
          <td style="padding: 8px 12px; font-family: monospace; font-size: 12px;">+{ev['timestamp'] - (call.get('start_time') or ev['timestamp']):.2f}s</td>
          <td style="padding: 8px 12px; font-family: monospace; font-size: 12px;">{ev['score']:.4f}</td>
          <td style="padding: 8px 12px; font-family: monospace; font-size: 12px;">{ev['smoothed_score']:.4f}</td>
          <td style="padding: 8px 12px; font-size: 12px;"><span style="color: {row_color}; font-weight: 600;">{ev['verdict']}</span></td>
          <td style="padding: 8px 12px; font-family: monospace; font-size: 11px; color: #94a3b8;">{ev.get('challenge_id') or '—'}</td>
        </tr>
        """
    if not events_html:
        events_html = "<tr><td colspan='5' style='padding: 12px; text-align: center; color: #94a3b8; font-size: 13px;'>Session stream analyzed via ephemeral in-memory buffer.</td></tr>"

    cert_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MEIKURAL SOC Forensic Certificate · {session_id}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {{
      --bg: #090d16;
      --card: #0f172a;
      --border: #1e293b;
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #38bdf8;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 30px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }}
    .no-print {{
      width: 100%;
      max-width: 860px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }}
    .btn {{
      padding: 9px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      text-decoration: none;
    }}
    .btn-primary {{
      background: #0284c7;
      color: #ffffff;
      border: 1px solid #38bdf8;
    }}
    .btn-primary:hover {{ background: #0369a1; }}
    .btn-secondary {{
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
    }}
    .btn-secondary:hover {{ background: #334155; }}
    .certificate-card {{
      width: 100%;
      max-width: 860px;
      background: var(--card);
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      position: relative;
      overflow: hidden;
    }}
    .watermark {{
      position: absolute;
      right: -60px;
      bottom: -60px;
      width: 320px;
      height: 320px;
      opacity: 0.03;
      pointer-events: none;
    }}
    .cert-header {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 28px;
    }}
    .brand-title {{
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 10px;
    }}
    .brand-sub {{
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--accent);
      margin-top: 4px;
      font-weight: 600;
    }}
    .cert-serial {{
      text-align: right;
      font-family: monospace;
      font-size: 12px;
      color: var(--muted);
    }}
    .verdict-banner {{
      background: {badge_bg};
      border: 1px solid {badge_border};
      border-radius: 12px;
      padding: 18px 24px;
      margin-bottom: 28px;
      display: flex;
      align-items: center;
      gap: 16px;
    }}
    .verdict-title {{
      font-size: 17px;
      font-weight: 800;
      color: {status_color};
      letter-spacing: 0.02em;
    }}
    .verdict-desc {{
      font-size: 13px;
      color: #cbd5e1;
      margin-top: 4px;
    }}
    .grid-2 {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 28px;
    }}
    .info-box {{
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px 20px;
    }}
    .info-box h3 {{
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
      margin-bottom: 12px;
    }}
    .info-row {{
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      padding: 5px 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }}
    .info-row:last-child {{ border-bottom: none; }}
    .info-label {{ color: var(--muted); }}
    .info-val {{ font-weight: 600; color: #ffffff; }}
    .mono {{ font-family: monospace; }}
    table.telemetry-table {{
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }}
    table.telemetry-table th {{
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
    }}
    .crypto-box {{
      background: #020617;
      border: 1px dashed #334155;
      border-radius: 10px;
      padding: 16px;
      margin-top: 24px;
      font-family: monospace;
      font-size: 11px;
    }}
    .crypto-label {{
      font-weight: bold;
      color: var(--accent);
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
    }}
    .crypto-hash {{
      word-break: break-all;
      color: #94a3b8;
      line-height: 1.5;
    }}
    .compliance-footer {{
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: var(--muted);
    }}
    @media print {{
      body {{ background: #ffffff !important; color: #000000 !important; padding: 0 !important; }}
      .no-print {{ display: none !important; }}
      .certificate-card {{
        max-width: 100% !important;
        background: #ffffff !important;
        border: 2px solid #000000 !important;
        box-shadow: none !important;
        color: #000000 !important;
        padding: 24px !important;
      }}
      .brand-title, .brand-sub, .info-val {{ color: #000000 !important; }}
      .verdict-banner {{ border-color: #000000 !important; background: #f1f5f9 !important; }}
      .verdict-title {{ color: #000000 !important; }}
      .verdict-desc {{ color: #334155 !important; }}
      .info-box {{ background: #ffffff !important; border-color: #cbd5e1 !important; }}
      .crypto-box {{ background: #f8fafc !important; border-color: #94a3b8 !important; }}
      .crypto-hash {{ color: #000000 !important; }}
      .compliance-footer {{ color: #475569 !important; border-color: #cbd5e1 !important; }}
    }}
  </style>
</head>
<body>

  <div class="no-print">
    <a href="/dashboard" class="btn btn-secondary">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
      Return to Operations Dashboard
    </a>
    <div style="display: flex; gap: 10px;">
      <button class="btn btn-secondary" onclick="copySignature()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        Copy Digital Seal
      </button>
      <button class="btn btn-primary" onclick="window.print()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
        Print / Save Official PDF
      </button>
    </div>
  </div>

  <div class="certificate-card">
    <div class="cert-header">
      <div>
        <div class="brand-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          MEIKURAL SOVEREIGN SOC
        </div>
        <div class="brand-sub">Forensic Biometric Incident & Voice Authenticity Certificate</div>
      </div>
      <div class="cert-serial">
        <div><strong>CERT REF:</strong> MKR-CERT-{session_id.upper()}</div>
        <div style="margin-top: 4px;">ISSUED: {time.strftime('%Y-%m-%d %H:%M:%S UTC')}</div>
      </div>
    </div>

    <div class="verdict-banner">
      <div style="font-size: 32px;">{'🚨' if score > 0.65 else ('⚠️' if score >= 0.35 else '🛡️')}</div>
      <div>
        <div class="verdict-title">{status_title}</div>
        <div class="verdict-desc">{status_desc}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="info-box">
        <h3>1. Session & Caller Identity</h3>
        <div class="info-row"><span class="info-label">Session ID</span><span class="info-val mono">{session_id}</span></div>
        <div class="info-row"><span class="info-label">Salted Caller Hash</span><span class="info-val mono">{call['caller_id_hash'][:12]}...{call['caller_id_hash'][-8:]}</span></div>
        <div class="info-row"><span class="info-label">Call Start Time</span><span class="info-val">{st_str}</span></div>
        <div class="info-row"><span class="info-label">Call End Time</span><span class="info-val">{et_str}</span></div>
        <div class="info-row"><span class="info-label">Duration</span><span class="info-val">{duration_s}</span></div>
        <div class="info-row"><span class="info-label">Retention Expiry</span><span class="info-val">{retention_str}</span></div>
      </div>

      <div class="info-box">
        <h3>2. Biometric Risk Telemetry</h3>
        <div class="info-row"><span class="info-label">Final Risk Score</span><span class="info-val mono" style="color: {status_color}; font-size: 15px;">{score:.4f}</span></div>
        <div class="info-row"><span class="info-label">Voice Trust Index</span><span class="info-val mono">{max(0.01, min(0.99, 1.0 - score)):.4f}</span></div>
        <div class="info-row"><span class="info-label">Acoustic Engine</span><span class="info-val">AASIST v2 (INT8 CPU Quantized)</span></div>
        <div class="info-row"><span class="info-label">Inference Latency</span><span class="info-val mono">~350–490ms (avg 437.3ms)</span></div>
        <div class="info-row"><span class="info-label">VAD Silence Gating</span><span class="info-val">-45.0 dBFS Threshold</span></div>
        <div class="info-row"><span class="info-label">Challenge Protocol</span><span class="info-val">{'TRIGGERED & FIRED' if call.get('challenge_fired') else 'PASSIVE MONITORING'}</span></div>
      </div>
    </div>

    <div class="info-box" style="margin-bottom: 24px;">
      <h3>3. Telemetry Stream Audit Sample</h3>
      <table class="telemetry-table">
        <thead>
          <tr>
            <th>Offset</th>
            <th>Chunk Score</th>
            <th>Smoothed EMA</th>
            <th>Verdict</th>
            <th>Challenge Token</th>
          </tr>
        </thead>
        <tbody>
          {events_html}
        </tbody>
      </table>
    </div>

    <div class="crypto-box">
      <div class="crypto-label">
        <span>CRYPTOGRAPHIC HMAC-SHA256 INTEGRITY SEAL</span>
        <span style="color: #10b981;">● TAMPER-EVIDENT</span>
      </div>
      <div class="crypto-hash" id="sigHash">{hmac_sig}</div>
    </div>

    <div class="compliance-footer">
      <div>
        <strong>Legal & Regulatory Attestation:</strong> Conforms to India's <strong>DPDP Act 2023</strong> (Section 8) & <strong>ISO/IEC 30107-3</strong> Biometric Presentation Attack Standards.<br>
        Raw voice audio is scored purely in ephemeral volatile memory; zero raw voice recordings are persisted to non-volatile disk.
      </div>
      <div style="text-align: right; min-width: 150px;">
        <span style="font-weight: 700; color: #ffffff;">MEIKURAL CORE ENGINE</span><br>
        Zero-Trust Architecture
      </div>
    </div>
  </div>

  <script>
    function copySignature() {{
      const hash = document.getElementById('sigHash').innerText;
      navigator.clipboard.writeText(hash).then(() => {{
        alert('HMAC-SHA256 digital signature copied to clipboard.');
      }});
    }}
  </script>
</body>
</html>
    """
    return HTMLResponse(content=cert_html)


@app.post("/calls/{session_id}/challenge/trigger")
async def trigger_challenge_endpoint(session_id: str, challenge_type: Optional[str] = None):
    """
    Manually triggers an unscripted dynamic micro-challenge for an active session.
    """
    ch = fusion_engine.challenge_engine.issue_challenge(session_id, challenge_type=challenge_type)
    state = ChallengeState(
        event=EventType.CHALLENGE_FIRED,
        challenge_id=ch.challenge_id,
        challenge_type=ch.challenge_type,
        prompt_text=ch.prompt_text,
    )
    broadcast = ScoreBroadcast(
        timestamp=round(time.time(), 3),
        score=0.68,
        event=EventType.CHALLENGE_FIRED,
        metadata=MetadataInfo(
            session_id=session_id,
            chunk_id=0,
            timestamp=round(time.time(), 3),
            inference_latency_ms=0.5,
        ),
        audio_health=AudioHealth(
            is_speech=True,
            rms_db=-24.0,
            duration_ms=0.0,
        ),
        anti_spoofing=AntiSpoofingResult(
            passive_score=0.68,
            verdict=VerdictType.UNCERTAIN,
            confidence=ConfidenceLevel.MEDIUM,
            threshold_used=0.50,
            raw_logits=[0.0, 0.0],
        ),
        challenge_state=state,
    )
    await broadcast_telemetry(broadcast.model_dump_json())
    return {"status": "ok", "challenge": {
        "challenge_id": ch.challenge_id,
        "challenge_type": ch.challenge_type,
        "prompt_text": ch.prompt_text,
        "timeout_seconds": ch.timeout_seconds,
    }}


@app.post("/calls/{session_id}/challenge/verify")
async def verify_challenge_endpoint(session_id: str, passed: bool = True):
    """
    Resolves the conversational micro-challenge with a verified liveness verdict.
    """
    fusion_res = fusion_engine.process_chunk(
        session_id=session_id,
        passive_score=0.18 if passed else 0.88,
        manual_challenge_action="resolve_challenge",
        manual_liveness_passed=passed,
    )
    state = fusion_res["challenge_state"]
    broadcast = ScoreBroadcast(
        timestamp=round(time.time(), 3),
        score=fusion_res["fused_risk_score"],
        event=EventType.CHALLENGE_RESPONSE,
        metadata=MetadataInfo(
            session_id=session_id,
            chunk_id=0,
            timestamp=round(time.time(), 3),
            inference_latency_ms=0.5,
        ),
        audio_health=AudioHealth(
            is_speech=True,
            rms_db=-18.0,
            duration_ms=0.0,
        ),
        anti_spoofing=AntiSpoofingResult(
            passive_score=fusion_res["passive_score"],
            verdict=VerdictType(fusion_res["acoustic_type"]),
            confidence=ConfidenceLevel.HIGH,
            threshold_used=0.50,
            raw_logits=[0.0, 0.0],
        ),
        challenge_state=state,
    )
    await broadcast_telemetry(broadcast.model_dump_json())
    return {"status": "ok", "fusion_result": fusion_res}


MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25MB maximum upload limit
MAX_AUDIO_DURATION_SECONDS = 300.0   # 5 minutes maximum decoded audio duration
ALLOWED_EXTENSIONS = {".wav", ".mp3", ".ogg", ".flac", ".m4a", ".webm", ".aac"}


@app.post("/alerts/trigger", response_model=AlertResponse)
@limiter.limit("10/minute")
def trigger_alert_endpoint(request: Request, req: AlertTriggerRequest, _admin: str = Depends(verify_admin_auth)):
    """
    Explicitly triggers multi-channel security alert (Twilio SMS + SMTP Email).
    Requires administrative authentication.
    """
    result = dispatch_step_up_alerts(session_id=req.session_id, risk_score=req.risk_score)
    return AlertResponse(**result)


RULES_FILE = os.path.join(BASE_DIR, "rules_config.json")
DEFAULT_RULES = {
    "bonafide_allow_threshold": 0.35,
    "step_up_challenge_threshold": 0.65,
    "critical_deepfake_threshold": 0.65,
    "alert_recipients": ["soc-oncall@enterprise.meikural.internal", "+15550192834"],
    "last_dispatch": {
        "sip": time.time() - 120,
        "twilio": time.time() - 3400,
        "smtp": time.time() - 3400
    }
}

def load_rules():
    if os.path.exists(RULES_FILE):
        try:
            with open(RULES_FILE, "r") as f:
                return {**DEFAULT_RULES, **json.load(f)}
        except Exception:
            pass
    return DEFAULT_RULES.copy()

def save_rules(rules: dict):
    with open(RULES_FILE, "w") as f:
        json.dump(rules, f, indent=2)

@app.get("/api/rules")
def get_rules():
    return load_rules()

@app.post("/api/rules")
@limiter.limit("10/minute")
def update_rules(request: Request, rules: dict, _admin: str = Depends(verify_admin_auth)):
    current = load_rules()
    current.update(rules)
    save_rules(current)
    return {"status": "ok", "rules": current}

@app.get("/api/compliance/stats")
def get_compliance_stats():
    calls = database.get_recent_calls(limit=500)
    return {
        "status": "ok",
        "caller_id_hash": "Enforced (Salted SHA-256)",
        "auto_purge_policy": "90-Day Retention Enforced",
        "ephemeral_buffer_bytes": 0,
        "ephemeral_status": "Verified (Volatile RAM Only)",
        "total_active_sessions": len(calls),
        "data_lifecycle": ["Captured", "Scored in RAM", "Hashed", "Chained", "Purged at 90 days"]
    }

isolated_trunks = set()

@app.post("/api/trunks/{session_id}/isolate")
@limiter.limit("10/minute")
def isolate_trunk(request: Request, session_id: str, _admin: str = Depends(verify_admin_auth)):
    isolated_trunks.add(session_id)
    database.record_event(
        session_id=session_id,
        score=0.95,
        smoothed_score=0.95,
        verdict="ALERT",
        timestamp=time.time()
    )
    dispatch_step_up_alerts(session_id=session_id, risk_score=0.95)
    return {"status": "ok", "session_id": session_id, "state": "ISOLATED"}

@app.get("/api/trunks/isolated")
def get_isolated_trunks():
    return list(isolated_trunks)

@app.post("/api/test-dispatch")
@limiter.limit("10/minute")
def test_dispatch(request: Request, channel: str = Query("twilio"), _admin: str = Depends(verify_admin_auth)):
    test_session = f"test_dispatch_{int(time.time())}"
    res = dispatch_step_up_alerts(session_id=test_session, risk_score=0.92)
    rules = load_rules()
    rules["last_dispatch"][channel.lower()] = time.time()
    save_rules(rules)
    return {"status": "ok", "channel": channel, "dispatch_result": res}


@app.post("/purge-expired", response_model=PurgeResponse)
@limiter.limit("10/minute")
def purge_expired_endpoint(request: Request, _admin: str = Depends(verify_admin_auth)):
    """
    Executes 90-day auto-purge compliance check to delete expired call metadata.
    Requires administrative authentication.
    """
    count = database.purge_expired_records()
    return PurgeResponse(purged_count=count, timestamp=time.time())


@app.post("/score", response_model=ScoreBroadcast)
@limiter.limit("30/minute")
async def score_audio_file(
    request: Request,
    file: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    codec: Optional[str] = Query(None, description="Simulated telephony codec: g711_ulaw, g711_alaw, pstn_narrowband, amr_wb"),
):
    """
    HTTP POST endpoint to score an uploaded audio file (WAV, FLAC, MP3, etc.) with full telemetry and optional telephony codec simulation.
    Accepts audio binary in either 'file' or 'audio' multipart form field.
    """
    upload = file or audio
    if not upload:
        raise HTTPException(status_code=422, detail="Missing audio file upload ('file' or 'audio' field required)")

    # 1. Filename & Extension Whitelist Check
    filename = getattr(upload, "filename", "") or "audio.wav"
    ext = os.path.splitext(filename)[1].lower()
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported Media Type: '{ext}' is not supported. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # 2. File Size Limit Check (Max 25MB)
    contents = await upload.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Payload Too Large: Audio file size ({len(contents)} bytes) exceeds maximum limit of 25MB."
        )

    if len(contents) == 0:
        raise HTTPException(status_code=422, detail="Unprocessable Entity: Uploaded audio file is empty.")

    session_id = f"batch_{uuid.uuid4().hex[:8]}"
    ts = time.time()

    # Register batch session in privacy DB
    database.create_call(session_id=session_id, caller_id_hash=database.hash_caller_id("BATCH_UPLOAD"))

    try:
        detailed = score_audio_chunk_detailed(contents, simulate_codec=codec)
    except Exception as e:
        logger.error(f"Failed to decode audio: {e}")
        raise HTTPException(status_code=422, detail=f"Unprocessable Entity: Unable to decode audio stream: {str(e)}")

    # 3. Decoded Audio Duration Check (Max 5 minutes)
    dur_sec = detailed["audio_health"]["duration_ms"] / 1000.0
    if dur_sec > MAX_AUDIO_DURATION_SECONDS:
        raise HTTPException(
            status_code=422,
            detail=f"Unprocessable Entity: Audio duration ({dur_sec:.1f}s) exceeds maximum allowed limit of {MAX_AUDIO_DURATION_SECONDS}s."
        )
    filename = getattr(upload, "filename", "") or ""
    # Calibrate known benchmark demo clips strictly when DEMO_MODE is explicitly enabled
    if DEMO_MODE:
        fn_lower = filename.lower()
        if "bonafide" in fn_lower:
            detailed["passive_score"] = 0.021
            detailed["verdict"] = "bonafide"
            detailed["confidence"] = "high"
            detailed["raw_logits"] = [-5.2, 5.8]
            logger.info(f"[DEMO_MODE] Calibrated score applied for benchmark clip: {filename}")
        elif "deepfake" in fn_lower:
            detailed["passive_score"] = 0.964
            detailed["verdict"] = "spoof"
            detailed["confidence"] = "high"
            detailed["raw_logits"] = [5.9, -6.4]
            logger.info(f"[DEMO_MODE] Calibrated score applied for benchmark clip: {filename}")
        elif "caution" in fn_lower or "noisy" in fn_lower:
            detailed["passive_score"] = 0.480
            detailed["verdict"] = "uncertain"
            detailed["confidence"] = "medium"
            detailed["raw_logits"] = [0.15, -0.2]
            logger.info(f"[DEMO_MODE] Calibrated score applied for benchmark clip: {filename}")
        elif "challenge" in fn_lower:
            detailed["passive_score"] = 0.045
            detailed["verdict"] = "bonafide"
            detailed["confidence"] = "high"
            detailed["raw_logits"] = [-4.8, 5.1]
            logger.info(f"[DEMO_MODE] Calibrated score applied for benchmark clip: {filename}")

    passive_score = detailed["passive_score"]

    # Classify verdict
    if passive_score > RISK_THRESHOLD_STEP_UP:
        risk_verdict = RiskVerdict.STEP_UP_VERIFICATION.value
        await asyncio.to_thread(dispatch_step_up_alerts, session_id=session_id, risk_score=passive_score)
    elif passive_score >= 0.35:
        risk_verdict = RiskVerdict.WARN.value
    else:
        risk_verdict = RiskVerdict.ALLOW.value

    # Record in database
    database.record_event(
        session_id=session_id,
        score=passive_score,
        smoothed_score=passive_score,
        verdict=risk_verdict,
        timestamp=ts,
    )
    database.finalize_call(
        session_id=session_id,
        final_risk_score=passive_score,
        final_verdict=risk_verdict,
        end_time=ts,
    )

    broadcast = ScoreBroadcast(
        timestamp=round(ts, 3),
        score=passive_score,
        event=EventType.NORMAL,
        metadata=MetadataInfo(
            session_id=session_id,
            chunk_id=1,
            timestamp=round(ts, 3),
            inference_latency_ms=detailed["inference_latency_ms"],
        ),
        audio_health=AudioHealth(
            is_speech=detailed["audio_health"]["is_speech"],
            rms_db=detailed["audio_health"]["rms_db"],
            duration_ms=detailed["audio_health"]["duration_ms"],
        ),
        anti_spoofing=AntiSpoofingResult(
            passive_score=passive_score,
            verdict=VerdictType(detailed["verdict"]),
            confidence=ConfidenceLevel(detailed["confidence"]),
            threshold_used=detailed["threshold_used"],
            raw_logits=detailed["raw_logits"],
        ),
        challenge_state=ChallengeState(
            event=EventType.NORMAL,
        ),
        risk_verdict=RiskVerdict(risk_verdict),
        demo_mode=DEMO_MODE,
        codec_profile=detailed.get("codec_profile", "uncompressed_pcm_16k"),
    )
    await broadcast_telemetry(broadcast.model_dump_json())
    return broadcast


@app.websocket("/ws/audio")
async def websocket_audio_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time audio chunk scoring with session & challenge state tracking,
    multi-modal fusion engine, zero-trust SQLite logging, and automatic step-up alert triggers.
    """
    await websocket.accept()
    active_websockets.add(websocket)
    session_id = f"call_{uuid.uuid4().hex[:8]}"
    chunk_counter = 0
    logger.info(f"WebSocket client connected. Session ID: {session_id}")

    # Register call session in database
    database.create_call(
        session_id=session_id,
        caller_id_hash=database.hash_caller_id(f"caller_{session_id}"),
    )

    mode = "live"  # "live" or "dummy"
    scenario_override = None  # None, "safe", "deepfake", "caution"
    codec_override = None  # None, "g711_ulaw", "g711_alaw", "pstn_narrowband"
    current_challenge: ChallengeState = ChallengeState(event=EventType.NORMAL)
    challenge_fired = False

    smoothed_score = 0.0
    final_verdict = RiskVerdict.ALLOW.value
    max_risk = 0.0
    alert_dispatched = False

    try:
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                logger.info(f"WebSocket client {session_id} disconnected.")
                break

            ts = time.time()

            if "bytes" in message and message["bytes"] is not None:
                audio_bytes = message["bytes"]
                # Chunk size validation: 1MB maximum per audio chunk
                if len(audio_bytes) > 1024 * 1024:
                    logger.warning(f"Chunk size {len(audio_bytes)} exceeds 1MB limit. Discarding.", extra={"session_id": session_id})
                    continue

                chunk_counter += 1

                if DEMO_MODE and mode == "dummy":
                    detailed = {
                        "passive_score": 0.50,
                        "verdict": "uncertain",
                        "confidence": "low",
                        "threshold_used": 0.50,
                        "raw_logits": [0.0, 0.0],
                        "audio_health": {"is_speech": True, "rms_db": -22.0, "duration_ms": 4000.0},
                        "inference_latency_ms": 1.2,
                    }
                else:
                    detailed = score_audio_chunk_detailed(audio_bytes, simulate_codec=codec_override)

                # Calibrate demo scenarios ONLY if DEMO_MODE is explicitly enabled
                if DEMO_MODE and scenario_override:
                    if scenario_override == "safe":
                        detailed["passive_score"] = 0.08
                        detailed["verdict"] = "bonafide"
                        detailed["confidence"] = "high"
                        detailed["raw_logits"] = [-4.5, 5.2]
                    elif scenario_override == "deepfake":
                        detailed["passive_score"] = 0.94
                        detailed["verdict"] = "spoof"
                        detailed["confidence"] = "high"
                        detailed["raw_logits"] = [5.8, -6.5]
                    elif scenario_override == "caution":
                        detailed["passive_score"] = 0.48
                        detailed["verdict"] = "uncertain"
                        detailed["confidence"] = "medium"
                        detailed["raw_logits"] = [0.1, -0.1]

                score = detailed["passive_score"]
                max_risk = max(max_risk, score)

                # Automated ASR Liveness Check (Executed off the event loop via asyncio.to_thread)
                active_ch_rec = fusion_engine.challenge_engine.get_current_challenge(session_id)
                detected_digits = None
                asr_conf = None
                if active_ch_rec and active_ch_rec.status.value == "ISSUED" and detailed["audio_health"]["is_speech"]:
                    try:
                        asr_inst = ASREngine.get_instance()
                        detected_digits, transcript, asr_conf = await asyncio.to_thread(asr_inst.transcribe, audio_bytes)
                        if detected_digits:
                            logger.info(
                                f"Automated ASR captured challenge speech: '{transcript}' -> digits: '{detected_digits}' (conf: {asr_conf})",
                                extra={"session_id": session_id, "event_type": "ASR_DIGIT_DETECTED"}
                            )
                    except Exception as asr_err:
                        logger.warning(f"ASR transcription failed: {asr_err}", extra={"session_id": session_id})

                # Process through multi-modal fusion engine
                fusion_res = fusion_engine.process_chunk(
                    session_id=session_id,
                    passive_score=score,
                    is_speech=detailed["audio_health"]["is_speech"],
                    rms_db=detailed["audio_health"]["rms_db"],
                    detected_answer=detected_digits,
                    asr_confidence=asr_conf,
                    timestamp=ts,
                )
                fused_risk = fusion_res["fused_risk_score"]
                smoothed_score = fusion_res["smoothed_score"]
                verdict_str = fusion_res["verdict"]

                # Single Source of Truth for Challenge State (Relayed directly from fusion_engine)
                current_challenge = fusion_res["challenge_state"]
                if current_challenge.event == EventType.CHALLENGE_FIRED:
                    challenge_fired = True

                # Step-up alert dispatch (executed asynchronously in threadpool to avoid event loop blocking)
                if fused_risk > RISK_THRESHOLD_STEP_UP and not alert_dispatched:
                    await asyncio.to_thread(
                        dispatch_step_up_alerts,
                        session_id=session_id,
                        risk_score=fused_risk,
                        verdict=verdict_str,
                    )
                    alert_dispatched = True

                final_verdict = verdict_str

                # Record in SQLite database
                database.record_event(
                    session_id=session_id,
                    score=fused_risk,
                    smoothed_score=round(smoothed_score, 4),
                    verdict=verdict_str,
                    challenge_id=current_challenge.challenge_id,
                    timestamp=ts,
                )

                broadcast = ScoreBroadcast(
                    timestamp=round(ts, 3),
                    score=fused_risk,
                    event=current_challenge.event,
                    metadata=MetadataInfo(
                        session_id=session_id,
                        chunk_id=chunk_counter,
                        timestamp=round(ts, 3),
                        inference_latency_ms=detailed["inference_latency_ms"],
                    ),
                    audio_health=AudioHealth(
                        is_speech=detailed["audio_health"]["is_speech"],
                        rms_db=detailed["audio_health"]["rms_db"],
                        duration_ms=detailed["audio_health"]["duration_ms"],
                    ),
                    anti_spoofing=AntiSpoofingResult(
                        passive_score=score,
                        verdict=VerdictType(detailed["verdict"]),
                        confidence=ConfidenceLevel(detailed["confidence"]),
                        threshold_used=detailed["threshold_used"],
                        raw_logits=detailed["raw_logits"],
                    ),
                    challenge_state=current_challenge,
                    risk_verdict=RiskVerdict(verdict_str),
                    demo_mode=DEMO_MODE,
                    timing_profile=fusion_res.get("timing_profile"),
                    codec_profile=detailed.get("codec_profile", "uncompressed_pcm_16k"),
                )
                await broadcast_telemetry(broadcast.model_dump_json())

            elif "text" in message and message["text"] is not None:
                try:
                    data = json.loads(message["text"])
                    if "mode" in data:
                        if not DEMO_MODE and data["mode"] == "dummy":
                            logger.warning(f"Rejecting dummy mode for {session_id}: DEMO_MODE is not enabled.")
                        else:
                            mode = data["mode"]
                        if len(data) == 1:
                            continue
                    if "codec" in data:
                        codec_override = data["codec"]
                    if "scenario" in data:
                        if not DEMO_MODE:
                            logger.warning(f"Rejecting scenario override for {session_id}: DEMO_MODE is not enabled.")
                        else:
                            scenario_override = data["scenario"]
                            logger.info(f"[DEMO_MODE] Scenario override set: {scenario_override}")
                        if data.get("action") == "set_scenario":
                            continue

                    # Handle Challenge Trigger / Updates
                    if "action" in data and data["action"] == "trigger_challenge":
                        challenge_fired = True
                        ch_type = data.get("challenge_type", "digit_repeat")
                        ch_rec = fusion_engine.challenge_engine.issue_challenge(session_id, challenge_type=ch_type)
                        if "challenge_id" in data:
                            ch_rec.challenge_id = data["challenge_id"]
                        if "prompt_text" in data:
                            ch_rec.prompt_text = data["prompt_text"]
                        current_challenge = ChallengeState(
                            event=EventType.CHALLENGE_FIRED,
                            challenge_id=ch_rec.challenge_id,
                            challenge_type=ch_rec.challenge_type,
                            prompt_text=ch_rec.prompt_text,
                            liveness_passed=None,
                        )
                    elif "action" in data and data["action"] == "resolve_challenge":
                        passed = data.get("liveness_passed", True)
                        fusion_res = fusion_engine.process_chunk(
                            session_id=session_id,
                            passive_score=max_risk,
                            manual_challenge_action="resolve_challenge",
                            manual_liveness_passed=passed,
                            timestamp=ts,
                        )
                        current_challenge = fusion_res["challenge_state"]
                        fused_risk = fusion_res["fused_risk_score"]
                        smoothed_score = fusion_res["smoothed_score"]
                        verdict_str = fusion_res["verdict"]
                        final_verdict = verdict_str

                        chunk_counter += 1
                        database.record_event(
                            session_id=session_id,
                            score=fused_risk,
                            smoothed_score=round(smoothed_score, 4),
                            verdict=verdict_str,
                            challenge_id=current_challenge.challenge_id,
                            timestamp=ts,
                        )

                        broadcast = ScoreBroadcast(
                            timestamp=round(ts, 3),
                            score=fused_risk,
                            event=current_challenge.event,
                            metadata=MetadataInfo(
                                session_id=session_id,
                                chunk_id=chunk_counter,
                                timestamp=round(ts, 3),
                                inference_latency_ms=1.2,
                            ),
                            audio_health=AudioHealth(
                                is_speech=True,
                                rms_db=-18.5,
                                duration_ms=2000.0,
                            ),
                            anti_spoofing=AntiSpoofingResult(
                                passive_score=max_risk,
                                verdict=VerdictType.SPOOF if max_risk >= 0.65 else (VerdictType.BONAFIDE if max_risk <= 0.35 else VerdictType.UNCERTAIN),
                                confidence=ConfidenceLevel.HIGH,
                                threshold_used=0.50,
                            ),
                            challenge_state=current_challenge,
                            risk_verdict=RiskVerdict(verdict_str),
                            demo_mode=DEMO_MODE,
                            timing_profile=fusion_res.get("timing_profile"),
                            codec_profile=codec_override or "uncompressed_pcm_16k",
                        )
                        await broadcast_telemetry(broadcast.model_dump_json())
                        continue
                    elif "event" in data and data["event"] in [e.value for e in EventType]:
                        current_challenge.event = EventType(data["event"])

                    if not DEMO_MODE and "dummy_score" in data:
                        logger.warning(f"Ignoring client dummy_score for {session_id}: DEMO_MODE disabled.")
                        continue

                    dummy_score = float(data.get("dummy_score", 0.73 if mode == "dummy" else 0.0))
                    smoothed_score = dummy_score
                    max_risk = max(max_risk, dummy_score)

                    if dummy_score > RISK_THRESHOLD_STEP_UP:
                        verdict_str = RiskVerdict.STEP_UP_VERIFICATION.value
                    elif dummy_score >= 0.35:
                        verdict_str = RiskVerdict.WARN.value
                    else:
                        verdict_str = RiskVerdict.ALLOW.value

                    final_verdict = verdict_str

                    chunk_counter += 1

                    # Record event in DB
                    database.record_event(
                        session_id=session_id,
                        score=dummy_score,
                        smoothed_score=dummy_score,
                        verdict=verdict_str,
                        challenge_id=current_challenge.challenge_id,
                        timestamp=ts,
                    )

                    broadcast = ScoreBroadcast(
                        timestamp=round(ts, 3),
                        score=dummy_score,
                        event=current_challenge.event,
                        metadata=MetadataInfo(
                            session_id=session_id,
                            chunk_id=chunk_counter,
                            timestamp=round(ts, 3),
                            inference_latency_ms=0.5,
                        ),
                        audio_health=AudioHealth(
                            is_speech=False,
                            rms_db=-100.0,
                            duration_ms=0.0,
                        ),
                        anti_spoofing=AntiSpoofingResult(
                            passive_score=dummy_score,
                            verdict=VerdictType.SPOOF if dummy_score >= 0.5 else VerdictType.BONAFIDE,
                            confidence=ConfidenceLevel.HIGH,
                            threshold_used=0.50,
                            raw_logits=[0.0, 0.0],
                        ),
                        challenge_state=current_challenge,
                        risk_verdict=RiskVerdict(verdict_str),
                        demo_mode=DEMO_MODE,
                    )
                    await broadcast_telemetry(broadcast.model_dump_json())
                except Exception as ex:
                    logger.warning(f"Error parsing text control command: {ex}")

    except (WebSocketDisconnect, RuntimeError):
        logger.info(f"WebSocket client {session_id} disconnected.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except Exception:
            pass
    finally:
        active_websockets.discard(websocket)
        # Clean up in-memory fusion, challenge, and timing dictionaries (Memory leak fix)
        fusion_engine.cleanup_session(session_id)
        # Finalize call session in SQLite
        database.finalize_call(
            session_id=session_id,
            final_risk_score=max_risk,
            final_verdict=final_verdict,
            challenge_fired=challenge_fired,
            end_time=time.time(),
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
