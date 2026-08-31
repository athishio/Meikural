import json
import logging
import time
import uuid
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from audio_processor import (
    AASISTWrapper,
    score_audio_chunk_detailed,
)
from schemas import (
    AntiSpoofingResult,
    AudioHealth,
    ChallengeState,
    ConfidenceLevel,
    EventType,
    MetadataInfo,
    ScoreBroadcast,
    VerdictType,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("meikural_aasist_api")

app = FastAPI(
    title="Meikural Audio Anti-Spoofing Streaming Service",
    description="Real-time AASIST inference service with WebSocket streaming, VAD, and detailed score broadcasting.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    logger.info("Initializing AASIST model singleton...")
    AASISTWrapper.get_instance()
    logger.info("AASIST model ready.")


@app.get("/")
def root():
    return {
        "service": "Meikural Audio Anti-Spoofing Service",
        "version": "2.0.0",
        "endpoints": {
            "health": "/health",
            "score_file": "/score (POST)",
            "websocket_stream": "/ws/audio (WebSocket)",
        },
    }


@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": time.time(), "model_loaded": True}


@app.post("/score", response_model=ScoreBroadcast)
async def score_audio_file(file: UploadFile = File(...)):
    """
    HTTP POST endpoint to score an uploaded audio file (WAV, FLAC, etc.) with full telemetry.
    """
    contents = await file.read()
    session_id = f"batch_{uuid.uuid4().hex[:8]}"
    ts = time.time()
    
    detailed = score_audio_chunk_detailed(contents)

    return ScoreBroadcast(
        timestamp=round(ts, 3),
        score=detailed["passive_score"],
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
            passive_score=detailed["passive_score"],
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
    WebSocket endpoint for real-time audio chunk scoring with session & challenge state tracking.
    """
    await websocket.accept()
    session_id = f"call_{uuid.uuid4().hex[:8]}"
    chunk_counter = 0
    logger.info(f"WebSocket client connected. Session ID: {session_id}")

    mode = "live"  # "live" or "dummy"
    current_event = EventType.NORMAL
    current_challenge: ChallengeState = ChallengeState(event=EventType.NORMAL)

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

                broadcast = ScoreBroadcast(
                    timestamp=round(ts, 3),
                    score=detailed["passive_score"],
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
                        passive_score=detailed["passive_score"],
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

                    chunk_counter += 1
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
