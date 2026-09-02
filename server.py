"""
MEIKURAL Real-Time WebSocket Telemetry Server
Exposes WebSocket endpoint at ws://localhost:8000/ws/audio
and serves static dashboard files at http://localhost:8000
"""

import asyncio
import datetime
import json
import random
import os
from typing import Set

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="MEIKURAL Biometric Security Server", version="1.0.0")

# Mount static asset folders
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app.mount("/css", StaticFiles(directory=os.path.join(BASE_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(BASE_DIR, "js")), name="js")

# Connected WebSocket clients
active_connections: Set[WebSocket] = set()

# Server Simulation State
server_state = {
    "scenario": "mixed", # "normal", "deepfake", "challenge", "mixed"
    "current_score": 0.14,
    "session_id": "SES-NX8492-4910",
    "caller_hash": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    "tick": 0
}


@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(BASE_DIR, "index.html"))


@app.websocket("/ws/audio")
async def websocket_audio_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    print(f"[MEIKURAL WS] Client connected: {websocket.client}")

    try:
        while True:
            # We also listen for incoming commands from the client if any
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                data = json.loads(msg)
                if "scenario" in data:
                    server_state["scenario"] = data["scenario"]
                    server_state["tick"] = 0
                    print(f"[MEIKURAL WS] Scenario switched to: {server_state['scenario']}")
            except asyncio.TimeoutError:
                pass
            await asyncio.sleep(0.9)
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        print(f"[MEIKURAL WS] Client disconnected: {websocket.client}")
    except Exception as e:
        if websocket in active_connections:
            active_connections.remove(websocket)
        print(f"[MEIKURAL WS] Error: {e}")


async def telemetry_broadcaster():
    """Broadcasts biometric anti-spoofing telemetry every 1 second to all connected clients."""
    while True:
        await asyncio.sleep(1.0)
        if not active_connections:
            continue

        server_state["tick"] += 1
        tick = server_state["tick"]
        scenario = server_state["scenario"]

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        challenge_event = None
        prompt_text = None
        verdict = "EVALUATING"
        score = server_state["current_score"]

        # Mixed simulation: Rotates between Normal -> Escalation -> Challenge -> Step-Up Verdict
        if scenario == "mixed":
            cycle_step = tick % 25
            if cycle_step < 8:
                # Normal human speech (Safe zone: 0.08 - 0.25)
                score = 0.12 + random.uniform(-0.04, 0.05)
                verdict = "PASS" if cycle_step > 3 else "EVALUATING"
            elif cycle_step < 14:
                # Jitter / Caution zone (0.38 - 0.55)
                score = 0.42 + random.uniform(-0.05, 0.08)
                verdict = "EVALUATING"
            elif cycle_step < 18:
                # Synthetic injection attack (High Risk zone: 0.70 - 0.95)
                score = 0.76 + random.uniform(0.02, 0.18)
                if cycle_step == 15:
                    challenge_event = "challenge_fired"
                    prompt_text = "Please confirm your employee ID and budget code."
                verdict = "STEP_UP_VERIFICATION"
            else:
                # High Risk Step Up verification state
                score = 0.88 + random.uniform(-0.05, 0.08)
                verdict = "STEP_UP_VERIFICATION"
        elif scenario == "normal":
            score = max(0.05, min(0.28, score + random.uniform(-0.03, 0.03)))
            verdict = "PASS" if tick > 3 else "EVALUATING"
        elif scenario == "deepfake":
            score = min(0.96, 0.72 + random.uniform(0.05, 0.22))
            if tick == 3:
                challenge_event = "challenge_fired"
                prompt_text = "Please confirm your employee ID and budget code."
            verdict = "STEP_UP_VERIFICATION" if tick >= 4 else "EVALUATING"

        server_state["current_score"] = max(0.02, min(0.99, score))

        payload = {
            "session_id": server_state["session_id"],
            "caller_id_hash": server_state["caller_hash"],
            "timestamp": now,
            "anti_spoofing": {
                "passive_score": round(server_state["current_score"], 4),
                "spectral_entropy": round(random.uniform(0.75, 0.95), 3),
                "jitter_ratio": round(random.uniform(0.015, 0.045), 3),
                "phase_consistency": round(max(0.1, 1.0 - server_state["current_score"]), 3)
            },
            "challenge_state": {
                "event": challenge_event,
                "prompt_text": prompt_text,
                "status": "ACTIVE" if challenge_event else "IDLE",
                "injected_at": now if challenge_event else None
            },
            "verdict": verdict,
            "compliance": {
                "raw_audio_persisted": False,
                "caller_id_sha256": True,
                "retention_days": 90
            }
        }

        # Broadcast to all connected sockets
        msg = json.dumps(payload)
        dead_sockets = set()
        for ws in active_connections:
            try:
                await ws.send_text(msg)
            except Exception:
                dead_sockets.add(ws)

        for ws in dead_sockets:
            active_connections.remove(ws)


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(telemetry_broadcaster())
    print("[MEIKURAL] WebSocket audio server started at ws://localhost:8000/ws/audio")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
