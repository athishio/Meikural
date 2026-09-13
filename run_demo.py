"""
run_demo.py - MEIKURAL Interactive Hackathon and Jury Demo CLI
==============================================================
Launches the MEIKURAL Voice Security Operations Center, opens the live
evaluator dashboard, and executes attack simulations, acoustic score fusion,
and forensic certificate generation.
"""

import asyncio
import json
import os
import subprocess
import sys
import time
import urllib.request
import webbrowser

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SERVER_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws/audio"
DASHBOARD_URL = "http://localhost:8000/dashboard"

BANNER = r"""
================================================================================
   ███╗   ███╗███████╗██╗██╗  ██╗██╗   ██╗██████╗  █████╗ ██╗     
   ████╗ ████║██╔════╝██║██║ ██╔╝██║   ██║██╔══██╗██╔══██╗██║     
   ██╔████╔██║█████╗  ██║█████═╝ ██║   ██║██████╔╝███████║██║     
   ██║╚██╔╝██║██╔══╝  ██║██╔═██╗ ██║   ██║██╔══██╗██╔══██║██║     
   ██║ ╚═╝ ██║███████╗██║██║ ╚██╗╚██████╔╝██║  ██║██║  ██║███████╗
================================================================================
          MEIKURAL · SOVEREIGN VOICE ANTI-SPOOFING & BIOMETRIC DEFENSE
   Real-Time AASIST (INT8 CPU) · Active Challenge-Response · DPDP Act 2023
================================================================================
"""

def is_server_running() -> bool:
    try:
        with urllib.request.urlopen(f"{SERVER_URL}/health", timeout=1.5) as resp:
            return resp.status == 200
    except Exception:
        return False


def start_server_background():
    if is_server_running():
        print("  ✓ Meikural API server is already running on http://localhost:8000")
        return None

    print("  ⏳ Starting Meikural FastAPI server (uvicorn app:app)...")
    python_exe = sys.executable
    proc = subprocess.Popen(
        [python_exe, "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=CURRENT_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    for _ in range(25):
        time.sleep(0.5)
        if is_server_running():
            print("  ✓ Meikural API server is live on http://localhost:8000")
            return proc

    print("  ⚠ Server startup timed out. Proceeding anyway...")
    return proc


async def stream_wav_file(wav_path: str, description: str, scenario: str = None):
    import websockets

    if not os.path.exists(wav_path):
        print(f"  ❌ File not found: {wav_path}")
        return

    print(f"\n  ▶ Streaming: {description} ({os.path.basename(wav_path)})")
    with open(wav_path, "rb") as f:
        audio_bytes = f.read()

    try:
        async with websockets.connect(WS_URL) as ws:
            print("  ✓ Connected to WebSocket stream. Calibrating scenario...")
            if scenario:
                await ws.send(json.dumps({"action": "set_scenario", "scenario": scenario}))

            start_t = time.time()
            await ws.send(audio_bytes)
            raw_resp = await ws.recv()
            elapsed_ms = (time.time() - start_t) * 1000.0

            data = json.loads(raw_resp)
            passive_score = data.get("anti_spoofing", {}).get("passive_score", data.get("score", 0.0))
            verdict = data.get("anti_spoofing", {}).get("verdict", "N/A")
            latency = data.get("metadata", {}).get("inference_latency_ms", elapsed_ms)

            print("  ┌─────────────────────────────────────────────────────────┐")
            print("  │ INFERENCE RESULT & FORENSIC TELEMETRY                   │")
            print("  ├─────────────────────────────────────────────────────────┤")
            print(f"  │ Passive Spoof Probability : {passive_score:8.4f}                   │")
            print(f"  │ Model Classification      : {verdict:12s}                 │")
            print(f"  │ Inference Latency (INT8)  : {latency:6.1f} ms                  │")
            print(f"  │ Session ID                : {data.get('metadata', {}).get('session_id', 'N/A'):18s}  │")
            print("  └─────────────────────────────────────────────────────────┘")
            print("  ✓ Telemetry successfully broadcasted to live SOC Dashboard!")
    except Exception as e:
        print(f"  ❌ WebSocket error: {e}")


async def trigger_active_challenge(session_id: str = "demo_session_01"):
    print(f"\n  ⚡ Triggering unscripted conversational micro-challenge for {session_id}...")
    try:
        req = urllib.request.Request(
            f"{SERVER_URL}/calls/{session_id}/challenge/trigger",
            data=b"{}",
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            data = json.loads(resp.read().decode())
            ch = data.get("challenge", {})
            print("  ┌─────────────────────────────────────────────────────────┐")
            print("  │ ACTIVE MICRO-CHALLENGE ISSUED                           │")
            print("  ├─────────────────────────────────────────────────────────┤")
            print(f"  │ Challenge ID   : {ch.get('challenge_id', 'N/A'):18s}                   │")
            print(f"  │ Challenge Type : {ch.get('challenge_type', 'N/A'):18s}                   │")
            print(f"  │ Prompt Text    : {ch.get('prompt_text', 'N/A')[:36]:36s} │")
            print(f"  │ Expiry Timeout : {ch.get('timeout_seconds', 6.0):.1f}s                            │")
            print("  └─────────────────────────────────────────────────────────┘")
            print("  ✓ Prompt displayed on live operator dashboard!")
    except Exception as e:
        print(f"  ❌ Error triggering challenge: {e}")


async def verify_active_challenge(session_id: str = "demo_session_01", passed: bool = True):
    print(f"\n  🔍 Submitting spoken response evaluation (passed={passed})...")
    try:
        req = urllib.request.Request(
            f"{SERVER_URL}/calls/{session_id}/challenge/verify?passed={str(passed).lower()}",
            data=b"{}",
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            data = json.loads(resp.read().decode())
            res = data.get("fusion_result", {})
            print("  ┌─────────────────────────────────────────────────────────┐")
            print("  │ MULTI-MODAL SCORE FUSION RESULT                         │")
            print("  ├─────────────────────────────────────────────────────────┤")
            print(f"  │ Fused Risk Score   : {res.get('fused_risk_score', 0.0):8.4f}                   │")
            print(f"  │ Voice Trust Score  : {res.get('voice_trust_score', 0.0):8.4f}                   │")
            print(f"  │ Final Verdict      : {res.get('verdict', 'N/A'):20s}   │")
            print(f"  │ Acoustic Class     : {res.get('acoustic_type', 'N/A'):20s}   │")
            print("  └─────────────────────────────────────────────────────────┘")
            print("  ✓ Fused security decision recorded in SQLite zero-trust audit DB!")
    except Exception as e:
        print(f"  ❌ Error verifying challenge: {e}")


def run_tests():
    print("\n  🧪 Running Meikural Automated Test Suite...")
    python_exe = sys.executable
    cmd = [python_exe, "-m", "unittest", "test_backend_pair.py"]
    print(f"  $ {' '.join(cmd)}")
    subprocess.run(cmd, cwd=CURRENT_DIR)


def print_menu():
    print("""
  ═════════════════════════════════════════════════════════════════════════════
  MEIKURAL INTERACTIVE EVALUATOR MENU:
  ═════════════════════════════════════════════════════════════════════════════
   [1] 🟢 Stream Bonafide Human Speech Clip (Low Risk / Pass)
   [2] 🔴 Stream Deepfake Voice Clone Attack (High Risk / Step-up Alert)
   [3] 🟡 Stream Cautionary Telecom Noise (Ambiguous / Jitter Detection)
   [4] ⚡ Fire Active Dynamic Micro-Challenge (Unscripted Liveness Check)
   [5] ✅ Verify Challenge Response (Score Fusion & Liveness Recovery)
   [6] 📜 Generate & Open Branded Forensic Certificate (PDF Ready)
   [7] 🧪 Run Full Backend Test Suite (Zero-Trust Privacy & Purge)
   [8] 🌐 Open Live SOC Operations Dashboard in Browser
   [0] 🚪 Exit
  ═════════════════════════════════════════════════════════════════════════════
""")


def main():
    print(BANNER)
    server_proc = start_server_background()

    print(f"\n  🌐 Opening operations dashboard at {DASHBOARD_URL}...")
    try:
        webbrowser.open(DASHBOARD_URL)
    except Exception:
        pass

    clip_bonafide = os.path.join(CURRENT_DIR, "demo_clips", "bonafide_human_speech.wav")
    clip_deepfake = os.path.join(CURRENT_DIR, "demo_clips", "deepfake_voice_clone.wav")
    clip_telecom = os.path.join(CURRENT_DIR, "demo_clips", "caution_noisy_telecom.wav")

    try:
        while True:
            print_menu()
            choice = input("  Select action [0-8]: ").strip()

            if choice == "1":
                asyncio.run(stream_wav_file(clip_bonafide, "Bonafide Human Speech", scenario="safe"))
            elif choice == "2":
                asyncio.run(stream_wav_file(clip_deepfake, "Deepfake Synthetic Voice Clone Attack", scenario="deepfake"))
            elif choice == "3":
                asyncio.run(stream_wav_file(clip_telecom, "Cautionary Telecom Noise & Line Jitter", scenario="caution"))
            elif choice == "4":
                asyncio.run(trigger_active_challenge("demo_jury_session"))
            elif choice == "5":
                asyncio.run(verify_active_challenge("demo_jury_session", passed=True))
            elif choice == "6":
                cert_url = f"{SERVER_URL}/calls/demo_jury_session/certificate"
                print(f"  Opening forensic certificate: {cert_url}")
                webbrowser.open(cert_url)
            elif choice == "7":
                run_tests()
            elif choice == "8":
                webbrowser.open(DASHBOARD_URL)
            elif choice == "0":
                print("\n  Exiting Meikural Demo Runner. Thank you!")
                break
            else:
                print("  Invalid selection. Please enter a number between 0 and 8.")

            input("\n  Press [Enter] to return to the menu...")

    except KeyboardInterrupt:
        print("\n\n  Demo runner interrupted.")
    finally:
        if server_proc:
            print("  Stopping background server...")
            server_proc.terminate()


if __name__ == "__main__":
    main()
