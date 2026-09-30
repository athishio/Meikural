# Meikural (மெய்குரல்)

> **Real-time AI voice deepfake detection for live phone calls.**  
> *Mei (True) + Kural (Voice) — Detecting cloned voices before fraud happens.*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-meikural--soc.onrender.com-46E3B7.svg?logo=render&logoColor=white)](https://meikural-soc.onrender.com/dashboard)
[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688.svg)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-AASIST%20INT8-EE4C2C.svg)](https://pytorch.org/)

**Problem Statement:** SIH26104 (AICTE) — AI Voice Deepfake Detection  
**Team:** Athish (Lead) · Kamalesh · Sunandha · Bavi · Swetha · Rohinth  

---

### 🌐 Try the Live Dashboard
**👉 [https://meikural-soc.onrender.com/dashboard](https://meikural-soc.onrender.com/dashboard)**  
Test it directly in your browser with your live microphone or try the built-in sample audio clips.

---

## What is Meikural?

Scammers now use AI voice clones (ElevenLabs, RVC) to impersonate CEOs, bank managers, and family members over phone calls. Most existing detectors are passive — they just listen and guess.

**Meikural does two things differently:**
1. **Listens in real time:** Chunks live audio every 1.5 seconds and runs it through a quantized AASIST model on CPU in under 450ms.
2. **Challenges suspicious calls:** If the model isn't sure (score between 0.35 and 0.65), Meikural interrupts the caller with a random spoken verification code (e.g. *"Please say 8 - 4 - 1"*). Real humans answer in ~300ms. AI voice bots take 1–2 seconds to transcribe, generate, and speak, exposing the clone.

---

## How It Works

```
Live Call Stream (SIP / Web Audio)
       │
       ▼
 [ 16kHz Audio Chunker & VAD ]
       │
       ▼
 [ AASIST Neural Detector ] ────► Fast CPU inference (~440ms)
       │
       ├─► Score < 0.35 (Human) ──────────► ALLOW (Call continues normally)
       │
       ├─► Score 0.35 - 0.65 (Uncertain) ──► DYNAMIC VOICE CHALLENGE
       │                                       │
       │                                       ├─ Spoken digits verified + fast response ──► ALLOW
       │                                       ├─ Unclear response ────────────────────────► WARN
       │                                       └─ Wrong digits or high delay (>1.4s) ──────► BLOCK
       │
       └─► Score > 0.65 (Fake Voice) ─────► BLOCK CALL & ALERT SOC
```

---

## Key Features

- **Sub-500ms Detection:** Uses a dynamic INT8 quantized AASIST model (~1.0 MB) running entirely on CPU. No GPUs required.
- **Language Agnostic:** Tested across English, Tamil, and Hindi. Works on raw audio waveforms, so it detects synthetic voice artifacts regardless of language or accent.
- **Works on Normal Phone Audio:** Tested on compressed telephone codecs (G.711 μ-law, A-law, and 8kHz narrowband) with zero drop in accuracy.
- **Privacy First (DPDP Act 2023):** Raw audio is processed in memory and never saved to disk. Phone numbers are hashed using salted SHA-256. All session records auto-expire after 90 days.
- **Tamper-Evident Audit:** Every verification score is linked via an append-only SHA-256 hash chain so logs cannot be secretly modified.

---

## Quick Start (Run Locally)

### 1. Clone & install
```bash
git clone https://github.com/athishio/Meikural.git
cd Meikural

python -m venv .venv
# Windows:
.\.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Run the server
```bash
python run_server.py
```
Open **`http://localhost:8000/dashboard`** in your browser.

### 3. Or run with Docker
```bash
docker compose up --build
```

---

## Project Structure

```
Meikural/
├── app.py                  # FastAPI server & WebSocket streaming endpoint
├── audio_processor.py      # Audio chunking, resampling & AASIST inference
├── asr_engine.py           # Whisper model for spoken challenge verification
├── database.py             # SQLite ledger with SHA-256 hash chains & 90-day purge
├── alerts.py               # Email and webhook alerts for detected deepfakes
├── fusion.py               # Combines acoustic score + response timing
├── sip_signaler.py         # SIP trunk call drop / transfer trigger
├── rules_config.json       # Configurable risk thresholds
├── run_server.py           # Local dev startup script
├── run_demo.py             # Terminal evaluation script
│
├── aasist/                 # AASIST model definition
├── demo_clips/             # Sample human and cloned audio files for testing
├── frontend/               # React + Tailwind Cyber SOC dashboard
├── benchmarks/             # Telephony benchmarks & evaluation reports
└── tests/                  # Unit and integration test suite
```

---

## Team

- **Athish M (Lead)** – Model integration, quantization & WebSocket pipeline
- **Kamalesh** – SQLite privacy ledger, SHA-256 hash chains & alerting
- **Sunandha** – Dynamic micro-challenges & response latency fusion
- **Bavi** – Frontend SOC dashboard & audio visualizer
- **Swetha** – Multilingual testing (English, Tamil, Hindi) & compliance
- **Rohinth** – Evaluation benchmarks & demonstration
