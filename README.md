# Meikural - Real-Time Audio Anti-Spoofing Streaming Service (AASIST v2)

## 1. Production-Grade Score-Broadcast JSON Schema

When streaming audio over WebSockets or calling `/score`, the server broadcasts a structured JSON message:

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

### Schema Sections:
1. **`metadata`**:
   - `session_id`: Unique session/call ID for logging & tracing.
   - `chunk_id`: Monotonically increasing sequence number per stream.
   - `inference_latency_ms`: Execution time taken by the AASIST model.
2. **`audio_health`**:
   - `is_speech`: VAD (Voice Activity Detection) flag. `false` on background noise / silence.
   - `rms_db`: Root Mean Square volume level in dB (below -45 dB treated as silence).
   - `duration_ms`: Duration of the incoming audio slice.
3. **`anti_spoofing`**:
   - `passive_score`: Raw AASIST spoof probability (`0.0` = authentic, `1.0` = spoof).
   - `verdict`: Categorical classification: `"bonafide"`, `"spoof"`, `"uncertain"`, or `"silence"`.
   - `confidence`: Confidence indicator: `"low"`, `"medium"`, or `"high"`.
4. **`challenge_state`**:
   - `event`: Protocol lifecycle (`"normal"`, `"challenge_fired"`, or `"challenge_response"`).
   - `challenge_id`, `challenge_type`, `prompt_text`: Active challenge details.
   - `liveness_passed`: Active verification outcome (`true` / `false` / `null`).

---

## 2. WebSocket Control API (`ws://localhost:8000/ws/audio`)

### A. Send Binary Audio Frames
Stream raw 16-bit PCM (16kHz mono) or WAV binary bytes. The server returns the JSON broadcast above.

### B. Send JSON Control Commands
- **Trigger Challenge:**
  ```json
  {
    "action": "trigger_challenge",
    "challenge_id": "ch_4021",
    "challenge_type": "digit_repeat",
    "prompt_text": "Please repeat: 9 - 2 - 5"
  }
  ```
- **Resolve Challenge:**
  ```json
  {
    "action": "resolve_challenge",
    "challenge_id": "ch_4021",
    "liveness_passed": true
  }
  ```
- **Switch Modes:**
  ```json
  { "mode": "dummy" }  // or { "mode": "live" }
  ```

---

## 3. Running the Service

```bash
# Activate environment
.\.venv\Scripts\activate

# Run FastAPI server with Uvicorn
uvicorn app:app --host 0.0.0.0 --port 8000

# Run automated integration tests
python test_client.py
```
