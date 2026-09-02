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

# Run the Edge INT8 Quantization Benchmark:
python quantize_and_benchmark.py
```

---

## 📡 Available API Endpoints

| Protocol | Endpoint | Description |
| :--- | :--- | :--- |
| **WebSocket** | `ws://localhost:8000/ws/audio` | Real-time 16kHz audio stream scoring & score broadcasting. |
| **REST** | `POST /analyze` | Standalone audio scoring endpoint for banking/telecom integration. |
| **REST** | `GET /health` | Health & model warmup verification. |
| **Docs** | `http://localhost:8000/docs` | Interactive OpenAPI / Swagger UI documentation. |

---

## 📋 Score-Broadcast JSON Schema (Locked Team Contract)

When streaming audio over WebSockets or calling `/analyze`, the server broadcasts this standardized JSON payload:

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

## 👥 Team Responsibilities & File Ownership

| Member | Role | What They Own / Build |
| :--- | :--- | :--- |
| **Athish (Lead)** | ML & Backend Lead | Core AASIST model, 16kHz chunking engine, WebSocket server, quantization benchmark. |
| **Kamalesh** | Backend Pair | SQLite privacy logging (`database.py`), Twilio SMS / Email alerts (`alerts.py`). |
| **Sunandha** | Active-Challenge & Fusion | 8–10 Helpdesk verification phrases, turn-around latency formula (`fusion.py`). |
| **Bavi** | Live Dashboard | Frontend UI, Chart.js risk zones, challenge alert modals (`static/index.html`). |
| **Swetha** | QA & Compliance | Coqui TTS audio clips (real, cloned, Tamil/Hindi) & edge-case attack testing. |
| **Rohinth** | Presentation Lead | 5-Minute pitch script, live demo narration, Evaluator Q&A defense. |

----

## 🔒 Privacy & Data Minimization Guarantee
* **Zero Audio Stored on Disk:** Audio exists strictly in volatile RAM as PyTorch tensors during scoring and is immediately discarded.
* **Salted SHA-256 Hashing:** Caller phone numbers are hashed with salt before storage.
* **90-Day Regulatory Expiry:** Database schema includes an automated purge expiry timestamp.
