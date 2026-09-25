"""
load_test_telephony.py - Concurrent Telephony Streaming Load Test for Meikural
=============================================================================
Executes 10-15 parallel asynchronous telephony streams pushing real-time 20ms
G.711 mu-law audio frames into Meikural's /ws/audio WebSocket endpoint.
Measures:
- Concurrent session concurrency & stability
- Frame transmission throughput (fps / KB/s)
- End-to-end inference latency under concurrent load (mean, median, p95, p99)
- Real-time factor (RTF) and error/drop rates
- Saves report to telephony_load_test_report.json
"""

import asyncio
import base64
import json
import os
import sys
import time
from typing import Dict, List, Any
import numpy as np
import soundfile as sf
import websockets

from simulate_telephony_stream import audio_to_g711_ulaw_frames


async def run_single_telephony_worker(
    worker_id: int,
    ws_url: str,
    frames: List[bytes],
    num_frames: int = 150,  # ~3 seconds of 20ms audio
    frame_interval_sec: float = 0.02,
) -> Dict[str, Any]:
    stream_sid = f"MZ_LOAD_{worker_id}_{int(time.time()*1000)}"
    latencies = []
    received_scores = []
    errors = []
    frames_sent = 0
    start_time = time.perf_counter()

    try:
        async with websockets.connect(ws_url, ping_interval=None) as ws:
            # Send initial Twilio Media Stream start handshake
            start_payload = {
                "event": "start",
                "sequenceNumber": "1",
                "streamSid": stream_sid,
                "start": {
                    "streamSid": stream_sid,
                    "accountSid": f"AC_load_worker_{worker_id}",
                    "callSid": f"CA_load_call_{worker_id}",
                    "tracks": ["inbound"],
                    "mediaFormat": {"encoding": "audio/x-mulaw", "sampleRate": 8000, "channels": 1},
                },
            }
            await ws.send(json.dumps(start_payload))

            # Background listener to collect telemetry broadcasts
            async def listener():
                try:
                    while True:
                        msg = await ws.recv()
                        data = json.loads(msg)
                        if "score" in data:
                            lat = data.get("metadata", {}).get("inference_latency_ms", 0.0)
                            latencies.append(lat)
                            received_scores.append(data["score"])
                except (websockets.exceptions.ConnectionClosed, asyncio.CancelledError):
                    pass

            listen_task = asyncio.create_task(listener())

            # Send frames at real-time cadence
            for idx in range(min(num_frames, len(frames))):
                f_bytes = frames[idx]
                b64_data = base64.b64encode(f_bytes).decode("utf-8")
                media_msg = {
                    "event": "media",
                    "sequenceNumber": str(idx + 2),
                    "streamSid": stream_sid,
                    "media": {
                        "track": "inbound",
                        "chunk": str(idx + 1),
                        "timestamp": str(idx * 20),
                        "payload": b64_data,
                    },
                }
                t_send = time.perf_counter()
                await ws.send(json.dumps(media_msg))
                frames_sent += 1

                # Pace the frames
                elapsed = time.perf_counter() - t_send
                sleep_time = max(0.0, frame_interval_sec - elapsed)
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)

            # Wait briefly for server buffer drain
            await asyncio.sleep(0.5)

            # Send stop event
            stop_payload = {
                "event": "stop",
                "sequenceNumber": str(frames_sent + 2),
                "streamSid": stream_sid,
            }
            await ws.send(json.dumps(stop_payload))
            await asyncio.sleep(0.2)
            listen_task.cancel()

    except Exception as e:
        errors.append(str(e))

    total_duration = time.perf_counter() - start_time
    return {
        "worker_id": worker_id,
        "frames_sent": frames_sent,
        "scores_received": len(received_scores),
        "latencies_ms": latencies,
        "duration_sec": total_duration,
        "errors": errors,
        "status": "SUCCESS" if len(errors) == 0 else "ERROR",
    }


async def run_concurrent_load_test(
    num_workers: int = 12,
    audio_file: str = "demo_clips/bonafide_human_speech.wav",
    ws_url: str = "ws://127.0.0.1:8000/ws/audio",
    frames_per_worker: int = 150,
):
    print("=" * 80)
    print(f"MEIKURAL TELEPHONY LOAD TEST: {num_workers} CONCURRENT TRUNK STREAMS")
    print("=" * 80)
    print(f"Target WebSocket:     {ws_url}")
    print(f"Audio Sample:         {audio_file}")
    print(f"Concurrent Workers:   {num_workers}")
    print(f"Frames per Stream:    {frames_per_worker} (20ms frames = {frames_per_worker * 0.02:.1f}s audio per call)")
    print("-" * 80)

    frames = audio_to_g711_ulaw_frames(audio_file)
    if not frames:
        print(f"ERROR: Unable to load audio frames from {audio_file}")
        return

    wall_start = time.perf_counter()
    tasks = [
        run_single_telephony_worker(
            worker_id=i,
            ws_url=ws_url,
            frames=frames,
            num_frames=frames_per_worker,
            frame_interval_sec=0.015,  # Slightly faster than real-time to create concurrent load pressure
        )
        for i in range(num_workers)
    ]

    results = await asyncio.gather(*tasks)
    total_wall_sec = time.perf_counter() - wall_start

    total_frames = sum(r["frames_sent"] for r in results)
    total_scores = sum(r["scores_received"] for r in results)
    all_latencies = [lat for r in results for lat in r["latencies_ms"]]
    total_errors = sum(len(r["errors"]) for r in results)
    total_audio_sec = total_frames * 0.02

    mean_lat = float(np.mean(all_latencies)) if all_latencies else 0.0
    p50_lat = float(np.percentile(all_latencies, 50)) if all_latencies else 0.0
    p95_lat = float(np.percentile(all_latencies, 95)) if all_latencies else 0.0
    p99_lat = float(np.percentile(all_latencies, 99)) if all_latencies else 0.0
    rtf = total_audio_sec / (total_wall_sec * num_workers) if total_wall_sec > 0 else 0.0
    throughput_fps = total_frames / total_wall_sec if total_wall_sec > 0 else 0.0

    print("=" * 80)
    print("LOAD TEST EXECUTION METRICS")
    print("=" * 80)
    print(f"Concurrent Telephony Trunks:     {num_workers} channels")
    print(f"Total Audio Processed:           {total_audio_sec:.1f} seconds across {num_workers} trunks")
    print(f"Total Wall Clock Duration:       {total_wall_sec:.2f} seconds")
    print(f"Aggregate Frame Throughput:      {throughput_fps:.1f} frames/sec ({total_frames} total frames)")
    print(f"Scoring Decisions Emitted:       {total_scores} scoring cycles")
    print(f"Connection Errors / Drops:       {total_errors} (Drop Rate: {0.0 if total_errors == 0 else (total_errors/num_workers)*100:.2f}%)")
    print("-" * 80)
    print(f"Neural Inference Latency (Mean): {mean_lat:.2f} ms")
    print(f"Neural Inference Latency (p50):  {p50_lat:.2f} ms")
    print(f"Neural Inference Latency (p95):  {p95_lat:.2f} ms")
    print(f"Neural Inference Latency (p99):  {p99_lat:.2f} ms")
    print(f"Real-Time Factor (RTF):          {rtf:.2f}x (Higher is better, >1.0x indicates real-time capability)")
    print("=" * 80)

    report = {
        "timestamp": time.time(),
        "concurrent_channels": num_workers,
        "frames_per_worker": frames_per_worker,
        "total_frames_sent": total_frames,
        "total_audio_duration_seconds": round(total_audio_sec, 2),
        "wall_clock_seconds": round(total_wall_sec, 2),
        "frame_throughput_fps": round(throughput_fps, 1),
        "total_scores_received": total_scores,
        "error_count": total_errors,
        "packet_drop_rate": 0.0 if total_errors == 0 else round((total_errors / num_workers) * 100, 2),
        "latency_metrics_ms": {
            "mean": round(mean_lat, 2),
            "p50": round(p50_lat, 2),
            "p95": round(p95_lat, 2),
            "p99": round(p99_lat, 2),
        },
        "real_time_factor": round(rtf, 2),
        "status": "PASS" if total_errors == 0 else "FAIL",
    }

    with open("telephony_load_test_report.json", "w") as f:
        json.dump(report, f, indent=2)
    print("Saved report to telephony_load_test_report.json")
    return report


if __name__ == "__main__":
    workers = int(sys.argv[1]) if len(sys.argv) > 1 else 12
    asyncio.run(run_concurrent_load_test(num_workers=workers))
