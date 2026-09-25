"""
simulate_telephony_stream.py
Simulates a live Twilio Media Streams / Asterisk PBX connection piping
real-time 20ms G.711 mu-law audio frames into Meikural's WebSocket endpoint (/ws/audio).
"""

import asyncio
import base64
import json
import os
import sys
import time
import numpy as np
import soundfile as sf
import websockets

def audio_to_g711_ulaw_frames(audio_path: str, frame_duration_ms: float = 20.0):
    """
    Loads any audio file, resamples to 8000Hz mono, converts to 8-bit G.711 mu-law,
    and slices into 20ms chunks (160 bytes each).
    """
    data, sr = sf.read(audio_path)
    if data.ndim > 1:
        data = np.mean(data, axis=1)
        
    # Resample to 8000 Hz for telephony transmission
    if sr != 8000:
        import scipy.signal as signal
        num_target = int(round(len(data) * 8000.0 / sr))
        data = signal.resample(data, num_target)
        
    data = np.clip(data, -1.0, 1.0).astype(np.float32)
    
    # G.711 mu-law compression: 8-bit quantization
    mu = 255.0
    y = np.sign(data) * np.log(1.0 + mu * np.abs(data)) / np.log(1.0 + mu)
    # Map from [-1, 1] to 8-bit integer
    q = np.round(y * 127.0).astype(np.int8)
    # ITU-T G.711 byte representation
    ulaw_bytes = q.tobytes()
    
    # Slice into 20ms chunks (at 8000 Hz, 20ms = 160 samples = 160 bytes)
    samples_per_frame = int(8000 * (frame_duration_ms / 1000.0))
    frames = []
    for i in range(0, len(ulaw_bytes), samples_per_frame):
        chunk = ulaw_bytes[i : i + samples_per_frame]
        if len(chunk) == samples_per_frame:
            frames.append(chunk)
            
    return frames

async def receive_telemetry(ws):
    """Listens for and displays real-time telemetry from Meikural server."""
    try:
        async for msg in ws:
            try:
                data = json.loads(msg)
                event = data.get("event")
                if event == "connection_established":
                    sess = data.get("metadata", {}).get("session_id", "unknown")
                    print(f"\n[BRIDGE CONNECTED] Session: {sess}")
                elif "anti_spoofing" in data:
                    passive = data["anti_spoofing"]["passive_score"]
                    fused = data["score"]
                    verdict = data.get("risk_verdict", "UNKNOWN")
                    lat = data.get("metadata", {}).get("inference_latency_ms", 0.0)
                    ch_ev = data.get("challenge_state", {}).get("event", "NORMAL")
                    print(f"  --> Score: {fused:.3f} (AASIST: {passive:.3f}) | Verdict: {verdict:18s} | Latency: {lat:5.1f}ms | Event: {ch_ev}")
            except Exception as e:
                pass
    except websockets.exceptions.ConnectionClosed:
        pass

async def stream_audio(ws_url: str, audio_file: str, max_duration_sec: float = 12.0):
    print("=" * 70)
    print(f"MEIKURAL TELEPHONY BRIDGE SIMULATION (Twilio Media Streams)")
    print(f"Target WebSocket: {ws_url}")
    print(f"Audio File:       {audio_file}")
    print("=" * 70)
    
    frames = audio_to_g711_ulaw_frames(audio_file)
    print(f"Loaded {len(frames)} 20ms G.711 mu-law frames (~{len(frames)*0.02:.1f}s audio).")
    
    async with websockets.connect(ws_url) as ws:
        # Start background listener for telemetry responses
        recv_task = asyncio.create_task(receive_telemetry(ws))
        
        # 1. Send Twilio Start Event
        stream_sid = f"MZ_{int(time.time()*1000)}"
        start_payload = {
            "event": "start",
            "sequenceNumber": "1",
            "streamSid": stream_sid,
            "start": {
                "streamSid": stream_sid,
                "accountSid": "AC_mock_twilio_account",
                "callSid": "CA_mock_telephony_call",
                "tracks": ["inbound"],
                "mediaFormat": {"encoding": "audio/x-mulaw", "sampleRate": 8000, "channels": 1}
            }
        }
        await ws.send(json.dumps(start_payload))
        print(f"[STREAM START] streamSid: {stream_sid}")
        
        # 2. Stream 20ms frames in real-time
        start_time = time.time()
        frames_to_send = min(len(frames), int(max_duration_sec / 0.02))
        
        for idx, frame in enumerate(frames[:frames_to_send]):
            b64_data = base64.b64encode(frame).decode("utf-8")
            media_msg = {
                "event": "media",
                "sequenceNumber": str(idx + 2),
                "streamSid": stream_sid,
                "media": {
                    "track": "inbound",
                    "chunk": str(idx + 1),
                    "timestamp": str(int((idx * 20))),
                    "payload": b64_data
                }
            }
            await ws.send(json.dumps(media_msg))
            # Sleep 20ms to emulate physical telephony transmission
            await asyncio.sleep(0.02)
            
        print(f"\n[STREAM COMPLETED] Streamed {frames_to_send} frames in {time.time()-start_time:.1f}s.")
        
        # 3. Send Twilio Stop Event
        stop_payload = {
            "event": "stop",
            "sequenceNumber": str(frames_to_send + 2),
            "streamSid": stream_sid
        }
        await ws.send(json.dumps(stop_payload))
        
        # Wait a moment for final telemetry
        await asyncio.sleep(0.5)
        recv_task.cancel()

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "ws://127.0.0.1:8000/ws/audio"
    audio = sys.argv[2] if len(sys.argv) > 2 else "demo_clips/deepfake_voice_clone.wav"
    asyncio.run(stream_audio(url, audio))
