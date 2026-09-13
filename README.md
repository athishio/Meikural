# MEIKURAL (மெய்குரல்)
> **Mei (true) + Kural (voice) — because not every voice is telling the truth.**  
> *AI-Powered Real-Time Detection & Prevention of Voice Cloning Impersonation Attacks*

**Problem Statement:** SIH26104 | **Organization:** AICTE | **Category:** Software (Blockchain & Cybersecurity)  
**Team:** Athish (Lead) · Kamalesh · Sunandha · Bavi · Swetha · Rohinth  
**Core Motto:** *"Passive detectors watch. We provoke."*

---

## 🚀 Quick Start Guide (1-Click Evaluation)

### 1. Clone & Setup Environment
```bash
# Clone the repository
git clone https://github.com/athishio/Meikural.git
cd Meikural

# Create & activate virtual environment
python -m venv .venv

# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# On Linux / macOS / Git Bash:
source .venv/bin/activate  # or source .venv/Scripts/activate

# Install dependencies
pip install --upgrade pip
pip install -r aasist/requirements.txt
pip install fastapi "uvicorn[standard]" websockets scipy python-multipart soundfile
```

### 2. Run the 1-Click Interactive Demo (Recommended for Hackathons & Juries)
```powershell
.\.venv\Scripts\python.exe run_demo.py
```
This automatically launches the FastAPI server, opens the **Operations Dashboard** in your default browser, and launches an interactive terminal menu:
- **`[1]` 🟢 Stream Bonafide Human Speech Clip** — Watch the dashboard turn green (Safe).
- **`[2]` 🔴 Stream Deepfake Voice Clone Attack** — Watch real-time AASIST spike >0.65, trigger Step-up Alert, and dispatch multi-channel simulated alerts.
- **`[3]` 🟡 Stream Cautionary Telecom Jitter** — Ambiguous telecom line hum provoking active verification.
- **`[4]` ⚡ Fire Active Dynamic Micro-Challenge** — Generates unscripted security prompt on the dashboard.
- **`[5]` ✅ Verify Spoken Challenge Response** — Executes multi-modal score fusion (`fusion.py`) and recovers trust score.
- **`[6]` 📜 Generate & Open Branded Forensic Certificate** — Opens tamper-evident HMAC-SHA256 certificate (print-to-PDF ready).
- **`[7]` 🧪 Run Full Automated Backend Test Suite** — Tests zero-trust privacy, 90-day auto-purge, and alert channels.
- **`[8]` 🌐 Open SOC Operations Dashboard** — Opens `http://localhost:8000/dashboard`.

---

### 3. Live Microphone Streaming (Web Audio API)
1. Start the server:
   ```powershell
   uvicorn app:app --host 0.0.0.0 --port 8000
   ```
2. Open **`http://localhost:8000/dashboard`** in Chrome / Edge / Brave.
3. Click the **`🎙️ Live mic`** button in the top test scenarios toolbar.
4. Allow browser microphone access when prompted.
5. Speak into your microphone — the browser captures 16kHz audio, converts it into 16-bit PCM binary chunks, and streams directly into the quantized AASIST model on CPU in real time (~441.9ms inference latency).

---

## 🛡️ Live Operator Dashboard (`dashboard.html` / `http://localhost:8000/dashboard`)

The live cybersecurity operator interface connects directly to `ws://localhost:8000/ws/audio` with:
- **Unified Glassmorphism Surface (`#090D16`)**: Seamless single-surface workspace with high-contrast status pills (Emerald `#10B981`, Amber `#F59E0B`, Crimson `#EF4444`).
- **Live In-Browser Microphone Streaming (`🎙️ Live mic`)**: Streams evaluator speech directly into the PyTorch AASIST model via Web Audio API.
- **Real-Time Scrolling Canvas Risk Chart**:
  - Inverted Voice Trust Score: $1.0 - \text{SpoofRisk}$ ($1.00 = \text{Safe Human}, 0.00 = \text{Synthetic Spoof}$).
  - Dynamic gradient shifts from deep cyan to warning amber to critical crimson on deepfake detection.
- **Active Micro-Challenge Display & Provocation**: Shows unscripted digit/phoneme challenges to break pre-rendered deepfakes.
- **Cryptographic Forensic Incident Certificate**: Direct 1-click generation of official audit certificates (`GET /calls/{session_id}/certificate`) with print-to-PDF styles.
- **Live Audit Table**: Real-time incident logs with **"Cert"** and **"Report"** forensic exports.

---

## 📊 Measured Model Performance & Edge Quantization Benchmark

To prove to evaluators that Meikural is lightweight and deployable directly on edge devices, PBX gateways, and contact center hardware, we apply dynamic INT8 quantization to the AASIST neural network:

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
| **WebSocket** | `ws://localhost:8000/ws/audio` | Real-time 16kHz audio stream scoring, VAD gating, & telemetry broadcast. |
| **Dashboard** | `http://localhost:8000/dashboard` | Live Operator SOC Dashboard with mic streaming, risk zones, & audit trail. |
| **REST** | `GET /calls/{session_id}/certificate` | Official Forensic Incident Certificate with HMAC-SHA256 signature (Print to PDF). |
| **REST** | `POST /calls/{session_id}/challenge/trigger` | Manually triggers unscripted conversational micro-challenge. |
| **REST** | `POST /calls/{session_id}/challenge/verify` | Submits challenge response & executes multi-modal score fusion. |
| **REST** | `POST /score` | Standalone audio scoring endpoint for uploaded WAV/FLAC files. |
| **REST** | `POST /calls` | Creates call session with salted SHA-256 caller ID hashing. |
| **REST** | `GET /calls/{session_id}` | Retrieves session metadata and retention expiry. |
| **REST** | `GET /calls/{session_id}/report` | Downloads structured text incident report for flagged calls. |
| **REST** | `POST /alerts/trigger` | Dispatches multi-channel Twilio SMS & SMTP security alerts. |
| **REST** | `POST /purge-expired` | Executes 90-day automated compliance purge for expired records. |
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
