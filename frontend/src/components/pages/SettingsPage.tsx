import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, Bell, Cpu, Save, Radio, Check, Trash2, RefreshCw } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'neural' | 'telephony' | 'api' | 'alerts'>('neural');
  const [threshold, setThreshold] = useState(65);
  const [autoQuarantine, setAutoQuarantine] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/rules')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.critical_deepfake_threshold === 'number') {
          setThreshold(Math.round(data.critical_deepfake_threshold * 100));
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'meikural-dev-key-2026',
        },
        body: JSON.stringify({
          critical_deepfake_threshold: threshold / 100,
          step_up_challenge_threshold: threshold / 100,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunPurge = async () => {
    setPurging(true);
    setPurgeResult(null);
    try {
      const resp = await fetch('/purge-expired', {
        method: 'POST',
        headers: {
          'X-API-Key': 'meikural-dev-key-2026',
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        setPurgeResult(data.purged_count ?? 0);
      }
    } catch (e) {
      console.error('Purge error:', e);
    } finally {
      setPurging(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-20 font-bold text-text-primary tracking-tight">Security & Engine Configuration</h1>
          <p className="text-12 text-text-muted mt-0.5">
            Manage neural detection weights, telephony SIP interconnects, and real-time response policies
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 rounded-lg bg-accent-primary hover:bg-accent-primary/90 text-white text-12 font-medium shadow-glow flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer disabled:opacity-50"
        >
          {saved ? <Check className="w-4 h-4" /> : isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? 'Configuration Saved' : isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="space-y-1 bg-card-panel border border-card-border rounded-xl p-2 h-fit">
          <button
            onClick={() => setActiveTab('neural')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-12 font-medium transition-all ${
              activeTab === 'neural'
                ? 'bg-surface-elevated text-text-primary border border-card-border shadow-sm'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-ground'
            }`}
          >
            <Cpu className="w-4 h-4 text-accent-primary" />
            Neural Models & Scoring
          </button>
          <button
            onClick={() => setActiveTab('telephony')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-12 font-medium transition-all ${
              activeTab === 'telephony'
                ? 'bg-surface-elevated text-text-primary border border-card-border shadow-sm'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-ground'
            }`}
          >
            <Radio className="w-4 h-4 text-accent-success" />
            SIP & Voice Connectors
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-12 font-medium transition-all ${
              activeTab === 'api'
                ? 'bg-surface-elevated text-text-primary border border-card-border shadow-sm'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-ground'
            }`}
          >
            <Key className="w-4 h-4 text-accent-warning" />
            API Keys & Webhooks
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-12 font-medium transition-all ${
              activeTab === 'alerts'
                ? 'bg-surface-elevated text-text-primary border border-card-border shadow-sm'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-ground'
            }`}
          >
            <Bell className="w-4 h-4 text-text-muted" />
            Alert Routing & SOC SLA
          </button>
        </div>

        {/* Content Pane */}
        <div className="md:col-span-3 bg-card-panel border border-card-border rounded-xl p-6 shadow-card space-y-6">
          {activeTab === 'neural' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-14 font-semibold text-text-primary">Detection Sensitivity & Thresholds</h3>
                <p className="text-11 text-text-muted mt-0.5">
                  Tune threshold sensitivity to balance False Acceptance Rate (FAR) vs False Rejection Rate (FRR)
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-ground border border-card-border space-y-3">
                <div className="flex items-center justify-between text-12 font-mono">
                  <span className="text-text-primary">Deepfake Quarantine Threshold:</span>
                  <span className="font-bold text-accent-primary">{threshold}/100</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="90"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-accent-primary bg-surface-elevated h-2 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-10 font-mono text-text-subtle">
                  <span>30 (Strict / Low Tolerance)</span>
                  <span>65 (Balanced Enterprise)</span>
                  <span>90 (Lenient)</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-lg bg-surface-ground border border-card-border cursor-pointer">
                  <div>
                    <div className="text-13 font-medium text-text-primary">Automated Call Quarantine</div>
                    <div className="text-11 text-text-muted">
                      Instantly inject warning tone and alert agent when risk exceeds threshold
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoQuarantine}
                    onChange={(e) => setAutoQuarantine(e.target.checked)}
                    className="w-4 h-4 accent-accent-primary cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-lg bg-surface-ground border border-card-border cursor-pointer">
                  <div>
                    <div className="text-13 font-medium text-text-primary">RawNet3 Glottal Feature Weighting</div>
                    <div className="text-11 text-text-muted">
                      Inspect micro-variations in biological vocal fold opening and closing dynamics
                    </div>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-accent-primary cursor-pointer" />
                </label>
              </div>

              {/* DPDP 90-Day Auto-Purge Control */}
              <div className="p-4 rounded-xl bg-surface-ground border border-card-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-accent-primary font-semibold text-13">
                    <Trash2 className="w-4 h-4" />
                    <span>DPDP Act 2023 90-Day Retention Auto-Purge</span>
                  </div>
                  <span className="text-10 font-mono px-2 py-0.5 rounded bg-accent-success/10 border border-accent-success/30 text-accent-success font-medium">
                    ACTIVE RETENTION POLICY
                  </span>
                </div>
                <p className="text-11 text-text-muted">
                  Permanently expunges call sessions and associated telemetry blocks older than 90 calendar days to guarantee zero unnecessary data hoarding.
                </p>
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={handleRunPurge}
                    disabled={purging}
                    className="px-3.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-elevated/80 border border-card-border hover:border-accent-primary/40 text-text-primary text-12 font-medium flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {purging ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent-primary" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 text-accent-primary" />
                    )}
                    <span>{purging ? 'Purging Expired Records...' : 'Execute 90-Day Retention Purge'}</span>
                  </button>

                  {purgeResult !== null && (
                    <span className="text-11 font-mono text-accent-success flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      {purgeResult} expired records purged
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'telephony' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-14 font-semibold text-text-primary">SIP Interconnect & Media Forking</h3>
                <p className="text-11 text-text-muted mt-0.5">
                  Configure live SIP trunk streams for real-time acoustic inspection
                </p>
              </div>

              <div className="space-y-3 font-mono text-12">
                <div className="p-3 rounded-lg bg-surface-ground border border-card-border flex items-center justify-between">
                  <div>
                    <div className="text-text-primary font-medium">Twilio Media Stream WebSocket</div>
                    <div className="text-11 text-text-subtle">ws://127.0.0.1:8000/ws/audio</div>
                  </div>
                  <span className="text-accent-success text-11 font-mono">Connected</span>
                </div>

                <div className="p-3 rounded-lg bg-surface-ground border border-card-border flex items-center justify-between">
                  <div>
                    <div className="text-text-primary font-medium">Genesys Cloud Ingest Connector</div>
                    <div className="text-11 text-text-subtle">TLS 1.3 • SIP-REC Active</div>
                  </div>
                  <span className="text-accent-success text-11 font-mono">Connected</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-14 font-semibold text-text-primary">Enterprise REST & WebSocket Credentials</h3>
                <p className="text-11 text-text-muted mt-0.5">
                  Access credentials for administrative endpoints (Header: <code className="text-accent-primary">X-API-Key</code> or <code className="text-accent-primary">X-Meikural-Key</code>)
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-ground border border-card-border space-y-3 font-mono text-12">
                <div className="text-text-subtle text-11 flex items-center justify-between">
                  <span>Administrative API Key</span>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="text-10 text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {showKey ? 'Mask Secret' : 'Reveal Value'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={showKey ? 'meikural-dev-key-2026' : 'mk_live_••••••••••••••••••••••••3840'}
                    className="flex-1 bg-surface-elevated border border-card-border rounded px-3 py-1.5 text-text-primary select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('meikural-dev-key-2026');
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    }}
                    className="px-3 py-1.5 rounded bg-surface-elevated hover:bg-surface-elevated/80 border border-card-border text-text-secondary hover:text-text-primary transition-all cursor-pointer flex items-center gap-1"
                  >
                    {copied ? (
                      <span className="text-accent-success flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Copied!
                      </span>
                    ) : (
                      'Copy'
                    )}
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-surface-elevated/50 border border-card-border text-11 text-text-subtle font-sans leading-relaxed">
                  <span className="font-semibold text-text-muted">Client-Side Secret Transparency Notice: </span>
                  This credential is used by this browser session to authenticate administrative management calls (such as trunk isolation and regulatory purging). Any user with access to this browser session or developer tools can inspect this key. In enterprise deployments, live secrets are configured on the backend via <code className="font-mono text-accent-primary">MEIKURAL_API_KEY</code> and secured behind network ingress ACLs or gateway mTLS.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-14 font-semibold text-text-primary">SOC Incident Notification Channels</h3>
                <p className="text-11 text-text-muted mt-0.5">
                  Real-time webhook and PagerDuty routing when high-confidence deepfakes are intercepted
                </p>
              </div>

              <div className="space-y-3 text-12">
                <div className="p-3 rounded-lg bg-surface-ground border border-card-border flex items-center justify-between">
                  <div>
                    <div className="font-medium text-text-primary">SecOps Slack Channel (#voice-security-alerts)</div>
                    <div className="text-11 text-text-muted">Instant push with spectrogram snapshot</div>
                  </div>
                  <span className="text-accent-success font-mono text-11">Active</span>
                </div>

                <div className="p-3 rounded-lg bg-surface-ground border border-card-border flex items-center justify-between">
                  <div>
                    <div className="font-medium text-text-primary">PagerDuty Incident Escalation</div>
                    <div className="text-11 text-text-muted">High-severity alerts for Executive Voice Cloning</div>
                  </div>
                  <span className="text-accent-success font-mono text-11">Active</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
