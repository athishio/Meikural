# MEIKURAL · Real-Time Deepfake Biometric Fraud Defense

A real-time voice biometric fraud defense dashboard engineered with Chart.js, native WebSockets, active challenge injection modal cues, pre-transaction wire transfer freeze banners, simulated mobile push notification gateway, and structured incident reporting.

---

## 🛡️ Task Implementation Overview

### Task 1: Clean Layout & Branding (`index.html` & `css/styles.css`)
- **Theme Palette**:
  - Dark Navy background (`#0F172A`)
  - Slate Cards (`#1E293B`) with border (`#334155`)
  - Accent Coral (`#F43F5E`) for high-risk / spoof alerts
  - Emerald (`#10B981`) for safe verified states
  - Amber (`#F59E0B`) for caution states
  - Sky Blue (`#38BDF8`) for telemetry highlights
- **Header**:
  - MEIKURAL animated audio waveform brand logo + tagline: *"Real-Time Conversational AI Biometric Verification & Deepfake Spoof Detection"*
  - **Static Privacy Badge**:
    `"🔒 PRIVACY COMPLIANT: Raw audio never stored on disk · Caller ID SHA-256 hashed · Auto-expiry: 90 days"`

---

### Task 2: Real-Time Scrolling Chart (`Chart.js` & `js/chart-config.js`)
- **WebSocket Telemetry**: Connects via native WebSocket `const ws = new WebSocket("ws://localhost:8000/ws/audio");`
- **Cadence**: Plots incoming `anti_spoofing.passive_score` (0.0 to 1.0) on a real-time line chart updating every second with a 30-second sliding window.
- **3 Distinct Colored Risk Background Bands**:
  - 🟢 **Safe Zone (0.00 – 0.35)**: Emerald background (`rgba(16, 185, 129, 0.13)`)
  - 🟡 **Caution Zone (0.35 – 0.65)**: Amber background (`rgba(245, 158, 11, 0.13)`)
  - 🔴 **High Risk / Deepfake Zone (0.65 – 1.00)**: Coral/Red background (`rgba(244, 63, 94, 0.16)`)

---

### Task 3: Interactive Visual Beats (The "Aha!" Moments)
1. **Challenge Flash Cue**:
   - Triggered when `challenge_state.event === "challenge_fired"`
   - Flashes an alert modal showing the prompt text:
     `"ACTIVE CHALLENGE INJECTED: 'Please confirm your employee ID and budget code.'"`
2. **Pre-Transaction Warning Prompt**:
   - If the final verdict is `STEP_UP_VERIFICATION`, displays a prominent banner:
     `"⚠️ CRITICAL WARNING: High Spoof Probability. DO NOT proceed with wire transfer until out-of-band re-verified."`
3. **Simulated End-User Push Notification Panel**:
   - Displays a mocked mobile notification preview:
     `"Customer SMS/App Preview: 'We detected suspicious voice activity on an active call. If this is not you, tap to freeze account immediately.' (Labeled: Simulated Gateway)"`
   - Interactive `Freeze Account Immediately` action button with live freeze toast & audit dispatch.

---

### Task 4: Live Audit Table & Report Export
- **Columns**: `Session ID`, `Timestamp`, `Risk Score`, `Verdict`, `Challenge Fired?`, `Actions`
- **Dynamic Search & Verdict Filter**: Filter between All Verdicts, Flagged Calls Only, STEP_UP_VERIFICATION, or PASS.
- **Download Incident Report**: Button on flagged calls (and each row) that triggers a structured JSON forensic incident report download with complete SHA-256 caller ID hash, acoustic entropy breakdown, challenge prompts, and cryptographic signature.

---

## 🚀 How to Run

### Option 1: Standalone Instant Browser Preview
Double-click or open `index.html` directly in any web browser.
- The integrated simulator automatically activates if no WebSocket server is running.
- Use the **Interactive Visual Beat Scenarios** buttons in the right column to trigger Normal Caller, Caution Jitter, Deepfake Attack, and Active Challenge Injection on demand.

### Option 2: Run with Python FastAPI WebSocket Backend
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start server:
   ```bash
   python server.py
   ```
3. Open `http://localhost:8000` in your browser. The dashboard connects to `ws://localhost:8000/ws/audio` with live 1s telemetry broadcasts.
