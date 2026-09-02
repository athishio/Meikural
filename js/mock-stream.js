/**
 * MEIKURAL Client-Side Simulation & Demo Engine
 * Generates realistic voice biometric telemetry packets matching the backend schema.
 */

class MockTelemetryStream {
  constructor(onMessageCallback) {
    this.onMessageCallback = onMessageCallback;
    this.intervalId = null;
    this.currentScenario = 'normal'; // 'normal', 'caution', 'deepfake_attack', 'challenge_test'
    this.sessionId = this.generateSessionId();
    this.callerHash = this.generateCallerHash();
    this.tickCount = 0;
    this.currentScore = 0.14;
    this.isRunning = false;
  }

  generateSessionId() {
    return 'SES-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4);
  }

  generateCallerHash() {
    return 'sha256:' + Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('') + '...';
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.sessionId = this.generateSessionId();
    this.callerHash = this.generateCallerHash();
    this.tickCount = 0;

    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  setScenario(scenarioName) {
    this.currentScenario = scenarioName;
    this.tickCount = 0;
    if (scenarioName === 'normal') {
      this.currentScore = 0.12;
    } else if (scenarioName === 'caution') {
      this.currentScore = 0.48;
    } else if (scenarioName === 'deepfake_attack') {
      this.currentScore = 0.62;
    } else if (scenarioName === 'challenge_test') {
      this.currentScore = 0.72;
    }
  }

  tick() {
    this.tickCount++;
    const now = new Date();
    const timestampStr = now.toISOString();

    let score = this.currentScore;
    let challengeEvent = null;
    let verdict = 'EVALUATING';

    if (this.currentScenario === 'normal') {
      // Gentle jitter in safe zone (0.05 to 0.25)
      score += (Math.random() - 0.5) * 0.04;
      score = Math.max(0.04, Math.min(0.28, score));
      verdict = this.tickCount > 5 ? 'PASS' : 'EVALUATING';
    } else if (this.currentScenario === 'caution') {
      // Fluctuates in caution zone (0.38 to 0.58)
      score += (Math.random() - 0.5) * 0.06;
      score = Math.max(0.36, Math.min(0.62, score));
      verdict = 'EVALUATING';
    } else if (this.currentScenario === 'deepfake_attack') {
      // Escalates into high risk zone
      if (this.tickCount < 4) {
        score = 0.45 + (this.tickCount * 0.08);
      } else {
        score = 0.75 + Math.random() * 0.20;
        score = Math.min(0.98, score);
      }

      if (this.tickCount === 4) {
        challengeEvent = 'challenge_fired';
      }

      if (score >= 0.65 && this.tickCount >= 6) {
        verdict = 'STEP_UP_VERIFICATION';
      }
    } else if (this.currentScenario === 'challenge_test') {
      // Specifically trigger challenge fired event on tick 2
      score = 0.72 + Math.random() * 0.15;
      if (this.tickCount === 2) {
        challengeEvent = 'challenge_fired';
      }
      if (this.tickCount >= 4) {
        verdict = 'STEP_UP_VERIFICATION';
      }
    }

    this.currentScore = score;

    const payload = {
      session_id: this.sessionId,
      caller_id_hash: this.callerHash,
      timestamp: timestampStr,
      anti_spoofing: {
        passive_score: parseFloat(score.toFixed(4)),
        spectral_entropy: parseFloat((0.82 + Math.random() * 0.15).toFixed(3)),
        jitter_ratio: parseFloat((0.02 + Math.random() * 0.03).toFixed(3)),
        phase_consistency: parseFloat((0.91 - score * 0.4).toFixed(3))
      },
      challenge_state: {
        event: challengeEvent,
        prompt_text: challengeEvent === 'challenge_fired' ? 'Please confirm your employee ID and budget code.' : null,
        status: challengeEvent ? 'ACTIVE' : 'IDLE',
        injected_at: challengeEvent ? timestampStr : null
      },
      verdict: verdict,
      compliance: {
        raw_audio_persisted: false,
        caller_id_sha256: true,
        retention_days: 90
      }
    };

    if (this.onMessageCallback) {
      this.onMessageCallback(payload);
    }
  }
}

window.MockTelemetryStream = MockTelemetryStream;
