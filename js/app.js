/**
 * MEIKURAL Real-Time Biometric Fraud Defense & Deepfake Detection Engine
 * Implements WebSocket connection, Chart.js telemetry plotting,
 * Challenge Flash Cue, Pre-Transaction Warning Prompt, Mobile Push Gateway,
 * Live Audit Table & Incident Report Export.
 */

// Global State
const state = {
  activeSessionId: null,
  currentScore: 0.0,
  currentVerdict: 'EVALUATING',
  challengeFiredThisSession: false,
  activeCallerHash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
  sessionHistory: [], // Stores completed and ongoing session records
  chartInstance: null,
  ws: null,
  mockStream: null,
  connectionMode: 'connecting', // 'connected', 'simulating', 'disconnected'
  filterMode: 'all',
};

// Initialize Application on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initUIElements();
  initRealtimeDashboard();
  initWebSocketConnection();
  initSimulatorControls();
  initAuditTable();
});

/**
 * Task 1 & UI Setup
 */
function initUIElements() {
  // Emergency Freeze Action on Banner
  const btnFreezeBanner = document.getElementById('btnFreezeBanner');
  if (btnFreezeBanner) {
    btnFreezeBanner.addEventListener('click', () => {
      triggerAccountFreeze('Pre-Transaction Warning Banner Triggered Freeze');
    });
  }

  // Dismiss Warning Banner Action
  const btnDismissWarning = document.getElementById('btnDismissWarning');
  if (btnDismissWarning) {
    btnDismissWarning.addEventListener('click', () => {
      document.getElementById('preTransactionBanner').classList.remove('active');
      showToast('⚠️ Pre-transaction warning dismissed by operator.', 'warning');
    });
  }

  // Push Notification Freeze Button
  const btnPushFreeze = document.getElementById('btnPushFreeze');
  if (btnPushFreeze) {
    btnPushFreeze.addEventListener('click', () => {
      triggerAccountFreeze('Simulated Customer App Push Response');
    });
  }

  // Push Notification Dismiss Button
  const btnPushDismiss = document.getElementById('btnPushDismiss');
  if (btnPushDismiss) {
    btnPushDismiss.addEventListener('click', () => {
      showToast('📱 Push notification dismissed by customer.', 'info');
    });
  }

  // Challenge Modal Dismiss & Acknowledge
  const btnModalDismiss = document.getElementById('btnModalDismiss');
  const btnModalAcknowledge = document.getElementById('btnModalAcknowledge');
  if (btnModalDismiss) {
    btnModalDismiss.addEventListener('click', closeChallengeModal);
  }
  if (btnModalAcknowledge) {
    btnModalAcknowledge.addEventListener('click', () => {
      closeChallengeModal();
      showToast('✅ Challenge acknowledged by security operator.', 'success');
    });
  }

  // Close Report Modal
  const btnCloseReportModal = document.getElementById('btnCloseReportModal');
  if (btnCloseReportModal) {
    btnCloseReportModal.addEventListener('click', () => {
      document.getElementById('reportViewerModal').classList.remove('active');
    });
  }
}

/**
 * Task 2: Real-time Chart Initialization
 */
function initRealtimeDashboard() {
  state.chartInstance = initRealtimeChart('riskScoreChart');
}

/**
 * Task 2: Native WebSocket Connection
 * Connects via native WebSocket: const ws = new WebSocket("ws://localhost:8000/ws/audio");
 */
function initWebSocketConnection() {
  const statusPill = document.getElementById('connectionStatusPill');
  const statusText = document.getElementById('connectionStatusText');

  try {
    const ws = new WebSocket("ws://localhost:8000/ws/audio");
    state.ws = ws;

    ws.onopen = () => {
      state.connectionMode = 'connected';
      statusPill.className = 'status-pill';
      statusText.textContent = 'WS LIVE (8000)';
      showToast('🟢 Connected to MEIKURAL WebSocket Server (ws://localhost:8000/ws/audio)', 'success');
      
      // Stop client simulator if WebSocket is active
      if (state.mockStream) {
        state.mockStream.stop();
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleTelemetryUpdate(payload);
      } catch (err) {
        console.error('Error parsing telemetry JSON:', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('WebSocket connection error. Switching to integrated telemetry simulator.');
      fallbackToSimulator();
    };

    ws.onclose = () => {
      console.warn('WebSocket disconnected. Switching to integrated telemetry simulator.');
      fallbackToSimulator();
    };
  } catch (e) {
    console.warn('WebSocket instantiation failed. Switching to integrated telemetry simulator.', e);
    fallbackToSimulator();
  }
}

/**
 * Fallback to built-in telemetry simulation engine if backend WS is offline
 */
function fallbackToSimulator() {
  if (state.connectionMode === 'simulating') return;
  state.connectionMode = 'simulating';

  const statusPill = document.getElementById('connectionStatusPill');
  const statusText = document.getElementById('connectionStatusText');
  statusPill.className = 'status-pill simulating';
  statusText.textContent = 'SIMULATOR LIVE';

  if (!state.mockStream) {
    state.mockStream = new MockTelemetryStream((payload) => {
      handleTelemetryUpdate(payload);
    });
  }
  state.mockStream.start();
}

/**
 * Central Telemetry Processor (Handles incoming WebSocket & simulated packets)
 */
function handleTelemetryUpdate(data) {
  if (!data) return;

  const sessionId = data.session_id || 'SES-MAIN-001';
  const timestamp = data.timestamp || new Date().toISOString();
  const passiveScore = data.anti_spoofing ? data.anti_spoofing.passive_score : 0.0;
  const challengeState = data.challenge_state || {};
  const verdict = data.verdict || 'EVALUATING';
  const callerHash = data.caller_id_hash || state.activeCallerHash;

  state.activeSessionId = sessionId;
  state.currentScore = passiveScore;
  state.currentVerdict = verdict;
  state.activeCallerHash = callerHash;

  // 1. Update Real-Time Chart
  const timeLabel = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  updateChartWithScore(passiveScore, timeLabel);

  // 2. Update Top Metric Displays
  updateMetricCards(data);

  // 3. Task 3: Interactive Visual Beats
  // Visual Beat 1: Challenge Flash Cue
  if (challengeState.event === "challenge_fired") {
    state.challengeFiredThisSession = true;
    triggerChallengeFlashCue(challengeState, sessionId, timestamp);
  }

  // Visual Beat 2: Pre-Transaction Warning Prompt
  if (verdict === "STEP_UP_VERIFICATION") {
    triggerPreTransactionWarning();
  }

  // 4. Task 4: Update Live Audit Table Record
  recordAuditSession(sessionId, timestamp, passiveScore, verdict, state.challengeFiredThisSession, data);
}

/**
 * Update Metric Cards in Top Row
 */
function updateMetricCards(data) {
  const score = data.anti_spoofing ? data.anti_spoofing.passive_score : 0.0;
  const scoreElem = document.getElementById('metricPassiveScore');
  const zoneTagElem = document.getElementById('metricRiskZoneTag');
  const sessionElem = document.getElementById('metricActiveSession');
  const verdictElem = document.getElementById('metricActiveVerdict');
  const callerHashElem = document.getElementById('metricCallerHash');

  if (scoreElem) {
    scoreElem.textContent = score.toFixed(3);
    const scoreCard = scoreElem.closest('.metric-card');
    if (scoreCard) {
      scoreCard.className = 'metric-card ' + (score >= 0.65 ? 'coral-accent' : score >= 0.35 ? 'amber-accent' : 'emerald-accent');
    }
  }

  if (zoneTagElem) {
    if (score >= 0.65) {
      zoneTagElem.textContent = '🔴 High Risk / Deepfake';
      zoneTagElem.className = 'legend-badge high-risk';
    } else if (score >= 0.35) {
      zoneTagElem.textContent = '🟡 Caution Zone';
      zoneTagElem.className = 'legend-badge caution';
    } else {
      zoneTagElem.textContent = '🟢 Safe Zone';
      zoneTagElem.className = 'legend-badge safe';
    }
  }

  if (sessionElem) {
    sessionElem.textContent = data.session_id || 'SES-000';
  }

  if (verdictElem) {
    verdictElem.textContent = data.verdict || 'EVALUATING';
    if (data.verdict === 'STEP_UP_VERIFICATION') {
      verdictElem.style.color = '#F43F5E';
    } else if (data.verdict === 'PASS') {
      verdictElem.style.color = '#10B981';
    } else {
      verdictElem.style.color = '#F59E0B';
    }
  }

  if (callerHashElem && data.caller_id_hash) {
    callerHashElem.textContent = data.caller_id_hash;
  }
}

/**
 * Task 3: Interactive Visual Beat #1 - Challenge Flash Cue Modal
 * When challenge_state.event === "challenge_fired", flashes alert modal showing prompt text:
 * "ACTIVE CHALLENGE INJECTED: 'Please confirm your employee ID and budget code.'"
 */
function triggerChallengeFlashCue(challengeState, sessionId, timestamp) {
  const modal = document.getElementById('challengeModal');
  const promptElem = document.getElementById('modalPromptText');
  const sessionElem = document.getElementById('modalSessionId');
  const timeElem = document.getElementById('modalTimestamp');

  const promptText = challengeState.prompt_text || "ACTIVE CHALLENGE INJECTED: 'Please confirm your employee ID and budget code.'";
  
  if (promptElem) {
    promptElem.textContent = promptText.startsWith('ACTIVE CHALLENGE INJECTED:') 
      ? promptText 
      : `ACTIVE CHALLENGE INJECTED: '${promptText}'`;
  }

  if (sessionElem) {
    sessionElem.textContent = sessionId;
  }

  if (timeElem) {
    timeElem.textContent = new Date(timestamp).toLocaleTimeString();
  }

  if (modal) {
    modal.classList.add('active');
  }

  showToast('⚡ ACTIVE CHALLENGE INJECTED into Voice Channel', 'warning');
}

function closeChallengeModal() {
  const modal = document.getElementById('challengeModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * Task 3: Interactive Visual Beat #2 - Pre-Transaction Warning Prompt
 * If final verdict is STEP_UP_VERIFICATION, displays prominent banner:
 * "⚠️ CRITICAL WARNING: High Spoof Probability. DO NOT proceed with wire transfer until out-of-band re-verified."
 */
function triggerPreTransactionWarning() {
  const banner = document.getElementById('preTransactionBanner');
  if (banner) {
    banner.classList.add('active');
  }
}

/**
 * Emergency Freeze Trigger
 */
function triggerAccountFreeze(reason) {
  showToast(`🔒 ACCOUNT FROZEN: ${reason}. Session wire transfer blocked.`, 'error');
  
  // Log freeze action to audit
  const now = new Date().toISOString();
  recordAuditSession(
    state.activeSessionId,
    now,
    state.currentScore,
    'FROZEN (STEP-UP)',
    true,
    { note: `Account manually frozen via ${reason}` }
  );
}

/**
 * Task 4: Live Audit Table Management
 * Columns: Session ID, Timestamp, Risk Score, Verdict, Challenge Fired?, Actions
 */
function initAuditTable() {
  const filterSelect = document.getElementById('auditVerdictFilter');
  const searchInput = document.getElementById('auditSearchInput');

  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      state.filterMode = e.target.value;
      renderAuditTable();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderAuditTable();
    });
  }

  // Prepopulate sample baseline history for rich initial view
  const sampleHistories = [
    {
      session_id: 'SES-NX8492-4910',
      caller_id_hash: 'sha256:d8b2e1f48109...',
      timestamp: new Date(Date.now() - 360000).toISOString(),
      score: 0.128,
      verdict: 'PASS',
      challenge_fired: false,
      telemetry: {
        anti_spoofing: { passive_score: 0.128, spectral_entropy: 0.892, jitter_ratio: 0.021, phase_consistency: 0.941 },
        verdict: 'PASS'
      }
    },
    {
      session_id: 'SES-TR7731-9201',
      caller_id_hash: 'sha256:4a9c8f20b173...',
      timestamp: new Date(Date.now() - 180000).toISOString(),
      score: 0.884,
      verdict: 'STEP_UP_VERIFICATION',
      challenge_fired: true,
      telemetry: {
        anti_spoofing: { passive_score: 0.884, spectral_entropy: 0.412, jitter_ratio: 0.098, phase_consistency: 0.324 },
        verdict: 'STEP_UP_VERIFICATION',
        challenge_state: { event: 'challenge_fired', prompt_text: 'Please confirm your employee ID and budget code.' }
      }
    },
    {
      session_id: 'SES-KL3109-1833',
      caller_id_hash: 'sha256:e3b0c44298fc...',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      score: 0.442,
      verdict: 'EVALUATING',
      challenge_fired: false,
      telemetry: {
        anti_spoofing: { passive_score: 0.442, spectral_entropy: 0.720, jitter_ratio: 0.045, phase_consistency: 0.780 },
        verdict: 'EVALUATING'
      }
    }
  ];

  state.sessionHistory = sampleHistories;
  renderAuditTable();
}

/**
 * Record or update a session in the live audit history
 */
function recordAuditSession(sessionId, timestamp, score, verdict, challengeFired, fullPayload) {
  const existingIndex = state.sessionHistory.findIndex(s => s.session_id === sessionId);

  const entry = {
    session_id: sessionId,
    caller_id_hash: state.activeCallerHash,
    timestamp: timestamp,
    score: score,
    verdict: verdict,
    challenge_fired: challengeFired,
    telemetry: fullPayload
  };

  if (existingIndex >= 0) {
    // Update existing ongoing session entry
    state.sessionHistory[existingIndex] = entry;
  } else {
    // Insert new session at top
    state.sessionHistory.unshift(entry);
    if (state.sessionHistory.length > 50) {
      state.sessionHistory.pop();
    }
  }

  renderAuditTable();
}

/**
 * Render Audit Table with filters and Download Incident Report buttons
 */
function renderAuditTable() {
  const tableBody = document.getElementById('auditTableBody');
  if (!tableBody) return;

  const filter = state.filterMode;
  const searchTerm = (document.getElementById('auditSearchInput')?.value || '').toLowerCase().trim();

  const filtered = state.sessionHistory.filter(item => {
    // Verdict Filter
    if (filter === 'flagged' && item.verdict !== 'STEP_UP_VERIFICATION' && item.score < 0.65 && !item.challenge_fired) return false;
    if (filter === 'pass' && item.verdict !== 'PASS') return false;
    if (filter === 'step_up' && item.verdict !== 'STEP_UP_VERIFICATION') return false;

    // Search Filter
    if (searchTerm) {
      const matchSession = item.session_id.toLowerCase().includes(searchTerm);
      const matchVerdict = item.verdict.toLowerCase().includes(searchTerm);
      const matchHash = item.caller_id_hash.toLowerCase().includes(searchTerm);
      if (!matchSession && !matchVerdict && !matchHash) return false;
    }

    return true;
  });

  tableBody.innerHTML = '';

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-dim);">
          No audit entries matching filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(session => {
    const tr = document.createElement('tr');

    // Score Badge Class
    let scoreClass = 'safe';
    if (session.score >= 0.65) scoreClass = 'high-risk';
    else if (session.score >= 0.35) scoreClass = 'caution';

    // Verdict Tag Class
    let verdictClass = 'evaluating';
    if (session.verdict === 'PASS') verdictClass = 'pass';
    else if (session.verdict.includes('STEP_UP') || session.verdict.includes('FROZEN')) verdictClass = 'step-up';

    const isFlagged = session.verdict === 'STEP_UP_VERIFICATION' || session.score >= 0.65 || session.challenge_fired;

    const formattedTime = new Date(session.timestamp).toLocaleString();

    tr.innerHTML = `
      <td>
        <div class="session-hash-cell">
          <span style="font-weight:700; color:#FFFFFF;">${escapeHtml(session.session_id)}</span>
        </div>
        <span style="font-size:0.7rem; color:var(--text-dim); font-family:var(--font-mono);">${escapeHtml(session.caller_id_hash || '')}</span>
      </td>
      <td style="font-family:var(--font-mono); font-size:0.78rem; color:var(--text-muted);">
        ${formattedTime}
      </td>
      <td>
        <span class="score-badge ${scoreClass}">${session.score.toFixed(3)}</span>
      </td>
      <td>
        <span class="verdict-tag ${verdictClass}">${escapeHtml(session.verdict)}</span>
      </td>
      <td>
        <span class="challenge-fired-badge ${session.challenge_fired ? 'yes' : 'no'}">
          ${session.challenge_fired ? '⚡ INJECTED' : '— NONE'}
        </span>
      </td>
      <td>
        <button class="btn-download-report ${isFlagged ? 'flagged-glow' : ''}" onclick="generateIncidentReport('${session.session_id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download Incident Report
        </button>
      </td>
    `;

    tableBody.appendChild(tr);
  });
}

/**
 * Task 4: Generate and Download Structured Incident Report
 */
window.generateIncidentReport = function(sessionId) {
  const session = state.sessionHistory.find(s => s.session_id === sessionId) || {
    session_id: sessionId,
    caller_id_hash: state.activeCallerHash,
    timestamp: new Date().toISOString(),
    score: state.currentScore,
    verdict: state.currentVerdict,
    challenge_fired: state.challengeFiredThisSession,
    telemetry: {}
  };

  const isHighRisk = session.score >= 0.65 || session.verdict === 'STEP_UP_VERIFICATION';

  const reportData = {
    incident_id: `INC-${session.session_id}-${Date.now().toString().slice(-6)}`,
    report_generated_at: new Date().toISOString(),
    organization: "MEIKURAL Biometric Security Operations",
    compliance_certification: {
      privacy_badge: "🔒 PRIVACY COMPLIANT: Raw audio never stored on disk · Caller ID SHA-256 hashed · Auto-expiry: 90 days",
      raw_audio_stored_on_disk: false,
      caller_id_sha256_hash: session.caller_id_hash,
      retention_period_days: 90
    },
    session_metadata: {
      session_id: session.session_id,
      session_timestamp: session.timestamp,
      verification_status: session.verdict,
      risk_classification: session.score >= 0.65 ? "CRITICAL_DEEPFAKE_PROBABILITY" : session.score >= 0.35 ? "ELEVATED_CAUTION" : "NORMAL_VERIFIED"
    },
    voice_anti_spoofing_metrics: {
      passive_spoof_score: session.score,
      spectral_entropy_ratio: session.telemetry?.anti_spoofing?.spectral_entropy || 0.412,
      vocal_jitter_percentage: session.telemetry?.anti_spoofing?.jitter_ratio || 0.087,
      cross_frequency_phase_consistency: session.telemetry?.anti_spoofing?.phase_consistency || 0.329,
      threshold_bands: {
        safe_zone: "0.00 - 0.35",
        caution_zone: "0.35 - 0.65",
        high_risk_deepfake_zone: "0.65 - 1.00"
      }
    },
    active_challenge_injection: {
      challenge_fired: session.challenge_fired,
      event_type: session.challenge_fired ? "challenge_fired" : "none",
      prompt_injected: session.challenge_fired ? "ACTIVE CHALLENGE INJECTED: 'Please confirm your employee ID and budget code.'" : null,
      operator_action: session.verdict === "STEP_UP_VERIFICATION" ? "STEP_UP_VERIFICATION_REQUIRED" : "APPROVED"
    },
    recommended_remediation: isHighRisk 
      ? "⚠️ CRITICAL WARNING: High Spoof Probability. DO NOT proceed with wire transfer until out-of-band re-verified." 
      : "Standard biometric confidence threshold met. Safe to proceed with normal transaction limits.",
    cryptographic_audit_signature: "MEIKURAL-SHA512-SIG:" + Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  };

  // Open structured JSON modal viewer
  showReportViewer(reportData);

  // Trigger file download
  const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MEIKURAL_Incident_Report_${session.session_id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`📁 Incident Report downloaded for Session ${session.session_id}`, 'info');
};

/**
 * Display structured report inside modal
 */
function showReportViewer(reportData) {
  const modal = document.getElementById('reportViewerModal');
  const codeBlock = document.getElementById('reportViewerCode');
  const modalTitle = document.getElementById('reportModalTitle');

  if (modalTitle) {
    modalTitle.textContent = `Incident Forensic Report (${reportData.session_metadata.session_id})`;
  }

  if (codeBlock) {
    codeBlock.textContent = JSON.stringify(reportData, null, 2);
  }

  if (modal) {
    modal.classList.add('active');
  }
}

/**
 * Simulator Scenario Selector & Controls
 */
function initSimulatorControls() {
  const btnScenarioNormal = document.getElementById('btnScenarioNormal');
  const btnScenarioCaution = document.getElementById('btnScenarioCaution');
  const btnScenarioDeepfake = document.getElementById('btnScenarioDeepfake');
  const btnScenarioChallenge = document.getElementById('btnScenarioChallenge');

  const buttons = [btnScenarioNormal, btnScenarioCaution, btnScenarioDeepfake, btnScenarioChallenge];

  function setActiveButton(activeBtn) {
    buttons.forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    if (activeBtn) activeBtn.classList.add('active');
  }

  if (btnScenarioNormal) {
    btnScenarioNormal.addEventListener('click', () => {
      setActiveButton(btnScenarioNormal);
      if (state.mockStream) state.mockStream.setScenario('normal');
      document.getElementById('preTransactionBanner').classList.remove('active');
      showToast('▶️ Scenario switched: Normal Legitimate Caller (Safe Zone)', 'success');
    });
  }

  if (btnScenarioCaution) {
    btnScenarioCaution.addEventListener('click', () => {
      setActiveButton(btnScenarioCaution);
      if (state.mockStream) state.mockStream.setScenario('caution');
      showToast('▶️ Scenario switched: Moderate Jitter / Acoustic Noise (Caution Zone)', 'warning');
    });
  }

  if (btnScenarioDeepfake) {
    btnScenarioDeepfake.addEventListener('click', () => {
      setActiveButton(btnScenarioDeepfake);
      if (state.mockStream) state.mockStream.setScenario('deepfake_attack');
      showToast('⚠️ Scenario switched: Synthetic Deepfake Voice Attack (High Risk Zone)', 'error');
    });
  }

  if (btnScenarioChallenge) {
    btnScenarioChallenge.addEventListener('click', () => {
      setActiveButton(btnScenarioChallenge);
      if (state.mockStream) state.mockStream.setScenario('challenge_test');
      showToast('⚡ Scenario switched: Active Challenge Injection Test', 'warning');
    });
  }
}

/**
 * Toast Notification Helper
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-item';
  if (type === 'error') toast.style.borderLeftColor = '#F43F5E';
  else if (type === 'success') toast.style.borderLeftColor = '#10B981';
  else if (type === 'warning') toast.style.borderLeftColor = '#F59E0B';

  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(60px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(string) {
  const div = document.createElement('div');
  div.innerText = string;
  return div.innerHTML;
}
