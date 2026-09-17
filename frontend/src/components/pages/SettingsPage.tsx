import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Bell, Cpu, Save, Radio, Check } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'neural' | 'telephony' | 'api' | 'alerts'>('neural');
  const [threshold, setThreshold] = useState(65);
  const [autoQuarantine, setAutoQuarantine] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
          className="px-4 py-2 rounded-lg bg-accent-primary hover:bg-accent-primary/90 text-white text-12 font-medium shadow-glow flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Configuration Saved' : 'Save Changes'}
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
                  Secure access keys for Meikural FastAPI microservice
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-ground border border-card-border space-y-3 font-mono text-12">
                <div className="text-text-subtle text-11">Production API Key (Header: X-Meikural-Key)</div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    readOnly
                    value="mk_live_8923409823480923840923840923"
                    className="flex-1 bg-surface-elevated border border-card-border rounded px-3 py-1.5 text-text-primary"
                  />
                  <button
                    onClick={() => alert('API Key copied to clipboard')}
                    className="px-3 py-1.5 rounded bg-surface-elevated border border-card-border text-text-secondary hover:text-text-primary"
                  >
                    Copy
                  </button>
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
