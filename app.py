import json
import logging
import time
import uuid
from typing import List, Optional

import os
from fastapi import FastAPI, File, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

import database
from alerts import dispatch_step_up_alerts, RISK_THRESHOLD_STEP_UP
from audio_processor import (
    AASISTWrapper,
    score_audio_chunk_detailed,
)
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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("meikural_aasist_api")

app = FastAPI(
    title="Meikural Audio Anti-Spoofing Streaming Service",
    description="Real-time AASIST inference service with WebSocket streaming, VAD, zero-trust privacy SQLite database, and multi-channel security alerting.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Mount static asset folders for Bavi's dashboard
if os.path.exists(os.path.join(BASE_DIR, "css")):
    app.mount("/css", StaticFiles(directory=os.path.join(BASE_DIR, "css")), name="css")
if os.path.exists(os.path.join(BASE_DIR, "js")):
    app.mount("/js", StaticFiles(directory=os.path.join(BASE_DIR, "js")), name="js")
if os.path.exists(os.path.join(BASE_DIR, "static")):
    app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")


@app.on_event("startup")
def startup_event():
    logger.info("Initializing AASIST model singleton & SQLite database...")
    database.init_db()
    AASISTWrapper.get_instance()
    logger.info("AASIST model and Meikural privacy database ready.")


@app.get("/dashboard")
async def get_dashboard():
    return FileResponse(os.path.join(BASE_DIR, "static", "index.html"))


@app.get("/")
def root():
    return {
        "service": "Meikural Audio Anti-Spoofing Service",
        "version": "2.0.0",
        "endpoints": {
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


@app.post("/alerts/trigger", response_model=AlertResponse)
def trigger_alert_endpoint(req: AlertTriggerRequest):
    """
    Explicitly triggers multi-channel security alert (Twilio SMS + SMTP Email).
    """
    result = dispatch_step_up_alerts(session_id=req.session_id, risk_score=req.risk_score)
    return AlertResponse(**result)


@app.post("/purge-expired", response_model=PurgeResponse)
def purge_expired_endpoint():
    """
    Executes 90-day auto-purge compliance check to delete expired call metadata.
    """
    count = database.purge_expired_records()
    return PurgeResponse(purged_count=count, timestamp=time.time())


@app.post("/score", response_model=ScoreBroadcast)
async def score_audio_file(file: UploadFile = File(...)):
    """
    HTTP POST endpoint to score an uploaded audio file (WAV, FLAC, etc.) with full telemetry.
    """
    contents = await file.read()
    session_id = f"batch_{uuid.uuid4().hex[:8]}"
    ts = time.time()

    # Register batch session in privacy DB
    database.create_call(session_id=session_id, caller_id_hash=database.hash_caller_id("BATCH_UPLOAD"))

    detailed = score_audio_chunk_detailed(contents)
    passive_score = detailed["passive_score"]

    # Classify verdict
    if passive_score > RISK_THRESHOLD_STEP_UP:
        risk_verdict = RiskVerdict.STEP_UP_VERIFICATION.value
        dispatch_step_up_alerts(session_id=session_id, risk_score=passive_score)
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

    return ScoreBroadcast(
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
    )


@app.websocket("/ws/audio")
async def websocket_audio_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time audio chunk scoring with session & challenge state tracking,
    zero-trust SQLite logging, and automatic step-up alert triggers.
    """
    await websocket.accept()
    session_id = f"call_{uuid.uuid4().hex[:8]}"
    chunk_counter = 0
    logger.info(f"WebSocket client connected. Session ID: {session_id}")

    # Register call session in database
    database.create_call(
        session_id=session_id,
        caller_id_hash=database.hash_caller_id(f"caller_{session_id}"),
    )

    mode = "live"  # "live" or "dummy"
    current_event = EventType.NORMAL
    current_challenge: ChallengeState = ChallengeState(event=EventType.NORMAL)
    challenge_fired = False

    smoothed_score = 0.0
    ema_alpha = 0.4
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
                chunk_counter += 1
                audio_bytes = message["bytes"]

                if mode == "dummy":
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
                    detailed = score_audio_chunk_detailed(audio_bytes)

                score = detailed["passive_score"]
                smoothed_score = (ema_alpha * score) + ((1.0 - ema_alpha) * smoothed_score) if chunk_counter > 1 else score
                max_risk = max(max_risk, score)

                # Determine Risk Verdict
                if score > RISK_THRESHOLD_STEP_UP:
                    verdict_str = RiskVerdict.STEP_UP_VERIFICATION.value
                    if not alert_dispatched:
                        dispatch_step_up_alerts(session_id=session_id, risk_score=score)
                        alert_dispatched = True
                elif score >= 0.35:
                    verdict_str = RiskVerdict.WARN.value
                else:
                    verdict_str = RiskVerdict.ALLOW.value

                final_verdict = verdict_str

                # Record in SQLite database
                database.record_event(
                    session_id=session_id,
                    score=score,
                    smoothed_score=round(smoothed_score, 4),
                    verdict=verdict_str,
                    challenge_id=current_challenge.challenge_id,
                    timestamp=ts,
                )

                broadcast = ScoreBroadcast(
                    timestamp=round(ts, 3),
                    score=score,
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
                )
                await websocket.send_text(broadcast.model_dump_json())

            elif "text" in message and message["text"] is not None:
                try:
                    data = json.loads(message["text"])
                    if "mode" in data:
                        mode = data["mode"]

                    # Handle Challenge Trigger / Updates
                    if "action" in data and data["action"] == "trigger_challenge":
                        challenge_fired = True
                        current_challenge = ChallengeState(
                            event=EventType.CHALLENGE_FIRED,
                            challenge_id=data.get("challenge_id", f"ch_{uuid.uuid4().hex[:6]}"),
                            challenge_type=data.get("challenge_type", "digit_repeat"),
                            prompt_text=data.get("prompt_text", "Please repeat: 7 - 3 - 9"),
                            liveness_passed=None,
                        )
                    elif "action" in data and data["action"] == "resolve_challenge":
                        current_challenge = ChallengeState(
                            event=EventType.CHALLENGE_RESPONSE,
                            challenge_id=data.get("challenge_id", current_challenge.challenge_id),
                            challenge_type=current_challenge.challenge_type,
                            prompt_text=current_challenge.prompt_text,
                            liveness_passed=data.get("liveness_passed", True),
                        )
                    elif "event" in data and data["event"] in [e.value for e in EventType]:
                        current_challenge.event = EventType(data["event"])

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
                    )
                    await websocket.send_text(broadcast.model_dump_json())
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
