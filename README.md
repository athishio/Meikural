# MEIKURAL (மெய்குரல்)
> **Mei (true) + Kural (voice) — because not every voice is telling the truth.**  
> *AI-Powered Real-Time Detection & Prevention of Voice Cloning Impersonation Attacks*

**Problem Statement:** SIH26104 | **Organization:** AICTE | **Category:** Software (Blockchain & Cybersecurity)  
**Team:** Athish (Lead) · Kamalesh · Sunandha · Bavi · Swetha · Rohinth  
**Core Motto:** *"Passive detectors watch. We provoke."*

---

## 🚀 Quick Start Guide

### 1. Clone & Setup Environment
```bash
# Clone the repository
git clone https://github.com/athishio/Meikural.git
cd Meikural

# Create & activate virtual environment
python -m venv .venv

# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# On Windows (Git Bash) / Linux / Mac:
source .venv/Scripts/activate

# Install dependencies
pip install --upgrade pip
pip install -r aasist/requirements.txt
pip install fastapi "uvicorn[standard]" websockets scipy python-multipart
```

### 2. Run the Streaming Server & Tests
```bash
# Start the FastAPI Server (WebSocket + REST + Swagger Docs)
uvicorn app:app --host 0.0.0.0 --port 8000

# In a second terminal, run verification tests:
python test_client.py
python test_backend_pair.py

# Run the Edge INT8 Quantization Benchmark:
python quantize_and_benchmark.py
```

---

## 📊 Measured Model Performance & Edge Quantization Benchmark

To prove to evaluators that Meikural is lightweight and deployable directly on edge devices, PBX gateways, and contact center hardware (Component 4), we apply dynamic INT8 quantization to the AASIST neural network:

| Metric | Baseline FP32 Model | Quantized INT8 Model | Real Measured Improvement |
| :--- | :---: | :---: | :---: |
| **Model Disk Size** | `1.22 MB` (1,281,532 B) | `1.02 MB` (1,065,095 B) | **16.9% Smaller** |
| **Average CPU Latency** | `860.7 ms` | `441.9 ms` | **~48.7% Faster (2x Speedup)** |
| **Audio Chunk Window** | `64,600 samples` (~4.04s) | `64,600 samples` (~4.04s) | Standard 16kHz ASVspoof format |
| **Quantization Scheme** | Full 32-bit Float | Dynamic INT8 (Linear layers) | Zero accuracy degradation |
| **Deployment Viability** | Server GPU/CPU | **Edge / IoT / PBX / IVR Ready** | Sub-500ms lightweight turnaround |

*Run `python quantize_and_benchmark.py` to regenerate the full `benchmark_results.json` telemetry.*

---

## 📡 Available API Endpoints

| Protocol | Endpoint | Description |
| :--- | :--- | :--- |
| **WebSocket** | `ws://localhost:8000/ws/audio` | Real-time 16kHz audio stream scoring & score broadcasting. |
| **REST** | `POST /score` | Standalone audio scoring endpoint for banking/telecom integration. |
| **REST** | `POST /calls` | Creates call session with salted SHA-256 caller ID hashing. |
| **REST** | `GET /calls/{session_id}` | Retrieves session metadata and retention expiry. |
| **REST** | `GET /calls/{session_id}/report` | Downloads structured incident security report for flagged calls. |
| **REST** | `POST /alerts/trigger` | Dispatches multi-channel Twilio SMS & SMTP security alerts. |
| **REST** | `GET /health` | Health & model warmup verification. |
| **Docs** | `http://localhost:8000/docs` | Interactive OpenAPI / Swagger UI documentation. |

---

## 📋 Score-Broadcast JSON Schema (Locked Team Contract)

When streaming audio over WebSockets or calling `/score`, the server broadcasts this standardized JSON payload:

```json
{
  "timestamp": 1788190064.21,
  "score": 0.73,
  "event": "normal",
  "metadata": {
    "session_id": "call_b00fbe53",
    "chunk_id": 3,
    "timestamp": 1788190064.21,
    "inference_latency_ms": 48.2
  },
  "audio_health": {
    "is_speech": true,
    "rms_db": -24.5,
    "duration_ms": 4037.5
  },
  "anti_spoofing": {
    "passive_score": 0.73,
    "verdict": "spoof",
    "confidence": "high",
    "threshold_used": 0.50,
    "raw_logits": [3.45, -2.10]
  },
  "challenge_state": {
    "event": "challenge_response",
    "challenge_id": "ch_4021",
    "challenge_type": "digit_repeat",
    "prompt_text": "Please repeat: 9 - 2 - 5",
    "liveness_passed": true
  }
}
```

### Schema Field Definitions:
* **`metadata`**: Session UUID, packet sequence `chunk_id`, and exact model latency in milliseconds.
* **`audio_health`**: Built-in VAD (`is_speech: false` on silence/noise below -45 dB) and volume level (`rms_db`).
* **`anti_spoofing`**: Passive spoof probability ($0.0 = \text{Human}$, $1.0 = \text{Deepfake}$), categorical `verdict` (`"bonafide"`, `"spoof"`, `"uncertain"`, or `"silence"`), and confidence level.
* **`challenge_state`**: Active verification protocol state (`"normal"`, `"challenge_fired"`, or `"challenge_response"`).

---

## 📦 Python Client SDK (`meikural-client/`)

Meikural includes an auto-generated, type-safe Python client SDK generated from our OpenAPI schema:
```bash
# Install the SDK locally
pip install ./meikural-client

# Use in any external banking Python application
import meikural_audio_anti_spoofing_streaming_service_client as meikural_client
```

---

## 👥 Team Responsibilities & File Ownership

| Member | Role | What They Own / Build |
| :--- | :--- | :--- |
| **Athish (Lead)** | ML & Backend Lead | Core AASIST model, 16kHz chunking engine, WebSocket server, quantization benchmark. |
| **Kamalesh** | Backend Pair | SQLite privacy logging (`database.py`), alerts (`alerts.py`), incident reports, Python SDK. |
| **Sunandha** | Active-Challenge & Fusion | 8–10 Helpdesk verification phrases, turn-around latency formula (`fusion.py`). |
| **Bavi** | Live Dashboard | Frontend UI, Chart.js risk zones, challenge alert modals (`static/index.html`). |
| **Swetha** | QA & Compliance | Coqui TTS audio clips (real, cloned, Tamil/Hindi) & edge-case attack testing. |
| **Rohinth** | Presentation Lead | 5-Minute pitch script, live demo narration, Evaluator Q&A defense. |

---

## 🔒 Privacy & Data Minimization Guarantee
* **Zero Audio Stored on Disk:** Audio exists strictly in volatile RAM as PyTorch tensors during scoring and is immediately discarded.
* **Salted SHA-256 Hashing:** Caller phone numbers are hashed with salt before storage.
* **90-Day Regulatory Expiry:** Database schema includes an automated purge expiry timestamp.
