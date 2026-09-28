import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, MessageSquare, Mail, Send, CheckCircle2, Clock, Plus, Trash2, Save, RefreshCw } from 'lucide-react';
import type { RulesConfig } from '../../types/dashboard';

interface IntegrationsPageProps {
  rules?: RulesConfig;
  onTestDispatch: (channel: 'sip' | 'twilio' | 'smtp') => Promise<any>;
  onUpdateRecipients: (recipients: string[]) => Promise<void>;
  onToggleLiveEmail?: (enabled: boolean) => Promise<void>;
}

export const IntegrationsPage: React.FC<IntegrationsPageProps> = ({
  rules,
  onTestDispatch,
  onUpdateRecipients,
  onToggleLiveEmail,
}) => {
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [liveEmailEnabled, setLiveEmailEnabled] = useState(rules?.email_live_dispatch ?? false);
  const [isUpdatingToggle, setIsUpdatingToggle] = useState(false);
  const [recipients, setRecipients] = useState<string[]>(
    rules?.alert_recipients || ['mahendran3626@gmail.com', '+15550192834']
  );
  const [newRecipient, setNewRecipient] = useState('');
  const [isSavingRecipients, setIsSavingRecipients] = useState(false);

  const handleTest = async (channel: 'sip' | 'twilio' | 'smtp') => {
    setTestingChannel(channel);
    try {
      await onTestDispatch(channel);
      setTestSuccess(channel);
      setTimeout(() => setTestSuccess(null), 3500);
    } catch {
      // Handled
    }
    setTestingChannel(null);
  };

  const handleToggleEmailDispatch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.checked;
    setLiveEmailEnabled(newVal);
    if (onToggleLiveEmail) {
      setIsUpdatingToggle(true);
      try {
        await onToggleLiveEmail(newVal);
      } catch {
        setLiveEmailEnabled(!newVal);
      } finally {
        setIsUpdatingToggle(false);
      }
    }
  };

  const addRecipient = () => {
    if (newRecipient.trim() && !recipients.includes(newRecipient.trim())) {
      const updated = [...recipients, newRecipient.trim()];
      setRecipients(updated);
      setNewRecipient('');
    }
  };

  const removeRecipient = (index: number) => {
    const updated = recipients.filter((_, i) => i !== index);
    setRecipients(updated);
  };

  const saveRecipients = async () => {
    setIsSavingRecipients(true);
    await onUpdateRecipients(recipients);
    setIsSavingRecipients(false);
  };

  const formatTimestamp = (ts?: number) => {
    if (!ts) return 'Never';
    const date = new Date(ts > 1e12 ? ts : ts * 1000);
    return date.toLocaleTimeString() + ' (' + date.toLocaleDateString() + ')';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 select-none"
    >
      {/* Page Header */}
      <div>
        <h1 className="text-[20px] font-bold text-[#F2F4F5] tracking-tight">
          Telephony & Alert Integrations
        </h1>
        <p className="text-[12px] text-[#9BA3A8] mt-0.5">
          SIP media ingest endpoint and external emergency incident alert dispatch channels
        </p>
      </div>

      {/* Gateway Status Banner */}
      <div className="p-4 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-lg bg-[#22C55E]/20 border border-[#22C55E]/40 flex items-center justify-center text-[#22C55E] flex-shrink-0 mt-0.5">
          <Mail className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-[13px] font-semibold text-[#F2F4F5]">
              Integration Connectors · Live SMTP & Telephony Gateway
            </h4>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              SMTP VERIFIED LIVE
            </span>
          </div>
          <p className="text-[12px] text-[#9BA3A8] leading-relaxed">
            SMTP Operations Mailer is authenticated and active via TLS on <code className="text-[#F2F4F5] font-mono">smtp.gmail.com:587</code> delivering to <code className="text-[#F2F4F5] font-mono">mahendran3626@gmail.com</code>. Twilio SMS operates in local sandbox mode pending carrier production keys.
          </p>
        </div>
      </div>

      {/* 3 Gateway Rows */}
      <div className="space-y-3">
        {/* Gateway 1: SIP Ingest */}
        <div className="bg-[#0D0F11] border border-[#1E2225] hover:border-[#2A2F33] rounded-xl p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E] shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-[14px] font-semibold text-[#F2F4F5]">
                  Internal Audio Pipe (/ws/audio Ingest Node)
                </h3>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30 text-[10.5px] font-mono font-bold">
                  LOCAL INGEST (/ws/audio)
                </span>
              </div>
              <p className="text-[12px] text-[#9BA3A8] mt-0.5">
                Local WebSocket media stream endpoint: <code className="text-[#F2F4F5] font-mono">/ws/audio</code> (16kHz PCM / G.711u) — tests reachability of our local in-memory streaming pipe
              </p>
              <div className="flex items-center gap-2 text-[11px] font-mono text-[#5E666B] mt-1">
                <Clock className="w-3 h-3" />
                <span>Last Telemetry Ingest: {formatTimestamp(rules?.last_dispatch?.sip)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleTest('sip')}
            disabled={testingChannel === 'sip'}
            className="px-4 py-2 rounded-lg bg-[#141719] hover:bg-[#1E2225] border border-[#1E2225] text-[#F2F4F5] text-[12px] font-medium flex items-center gap-2 transition-all self-start md:self-auto cursor-pointer"
          >
            {testingChannel === 'sip' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FF4713]" />
            ) : testSuccess === 'sip' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
            ) : (
              <Radio className="w-3.5 h-3.5 text-[#9BA3A8]" />
            )}
            <span>{testSuccess === 'sip' ? 'Loopback Ingest Verified' : 'Test Audio Pipe (Loopback)'}</span>
          </button>
        </div>

        {/* Gateway 2: Twilio Voice & SMS (Remains Sandboxed) */}
        <div className="bg-[#0D0F11] border border-[#1E2225] hover:border-[#2A2F33] rounded-xl p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FF4713]/10 border border-[#FF4713]/30 flex items-center justify-center text-[#FF4713] shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-[14px] font-semibold text-[#F2F4F5]">
                  Twilio Voice & SMS Dispatch
                </h3>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 text-[10.5px] font-mono font-bold">
                  SANDBOX SIMULATION
                </span>
              </div>
              <p className="text-[12px] text-[#9BA3A8] mt-0.5">
                Automated multi-carrier SMS broadcast for High-Risk Voice Cloning & Step-Up alerts
              </p>
              <div className="flex items-center gap-2 text-[11px] font-mono text-[#5E666B] mt-1">
                <Clock className="w-3 h-3" />
                <span>Last Dispatch: {formatTimestamp(rules?.last_dispatch?.twilio)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleTest('twilio')}
            disabled={testingChannel === 'twilio'}
            className="px-4 py-2 rounded-lg bg-[#141719] hover:bg-[#1E2225] border border-[#1E2225] text-[#F2F4F5] text-[12px] font-medium flex items-center gap-2 transition-all self-start md:self-auto cursor-pointer"
          >
            {testingChannel === 'twilio' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FF4713]" />
            ) : testSuccess === 'twilio' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
            ) : (
              <Send className="w-3.5 h-3.5 text-[#FF4713]" />
            )}
            <span>{testSuccess === 'twilio' ? 'Simulated SMS Dispatched' : 'Send Test SMS (Sandbox)'}</span>
          </button>
        </div>

        {/* Gateway 3: SMTP SOC Operations Mailer (VERIFIED LIVE) */}
        <div className="bg-[#0D0F11] border border-[#1E2225] hover:border-[#22C55E]/40 rounded-xl p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E] shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-[14px] font-semibold text-[#F2F4F5]">
                  SMTP SOC Operations Mailer
                </h3>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 text-[10.5px] font-mono font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  VERIFIED LIVE
                </span>
              </div>
              <p className="text-[12px] text-[#9BA3A8] mt-0.5">
                Encrypted forensic incident dossier delivery via TLS (<code className="text-[#F2F4F5] font-mono">smtp.gmail.com:587</code>) with cryptographic certificates
              </p>
              <div className="flex items-center gap-2 text-[11px] font-mono text-[#5E666B] mt-1">
                <Clock className="w-3 h-3" />
                <span>Last Dispatch: {formatTimestamp(rules?.last_dispatch?.smtp)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleTest('smtp')}
            disabled={testingChannel === 'smtp'}
            className="px-4 py-2 rounded-lg bg-[#141719] hover:bg-[#1E2225] border border-[#22C55E]/40 text-[#F2F4F5] text-[12px] font-medium flex items-center gap-2 transition-all self-start md:self-auto cursor-pointer"
          >
            {testingChannel === 'smtp' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#22C55E]" />
            ) : testSuccess === 'smtp' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
            ) : (
              <Mail className="w-3.5 h-3.5 text-[#22C55E]" />
            )}
            <span>{testSuccess === 'smtp' ? 'Live Email Dispatched' : 'Send Test Email (Live)'}</span>
          </button>
        </div>

        {/* Live Email Rehearsal Guard Toggle */}
        <div className="p-4 rounded-xl bg-[#0D0F11] border border-[#1E2225] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[#F2F4F5]">
                Automated Threat Dispatch Guard
              </span>
              <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                liveEmailEnabled
                  ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                  : 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
              }`}>
                {liveEmailEnabled ? 'LIVE AUTOMATED DISPATCH ACTIVE' : 'REHEARSAL MODE (SAFE - ZERO SPAM)'}
              </span>
            </div>
            <p className="text-[12px] text-[#9BA3A8] leading-relaxed max-w-2xl">
              {liveEmailEnabled
                ? 'Automated live emails are ACTIVE: High-risk deepfake detections (>65%) will instantly dispatch an email alert to the destination address.'
                : 'Automated emails are suppressed during rehearsal and benchmark playback to prevent inbox spam. The "Send Test Email (Live)" button above remains live on demand.'}
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={liveEmailEnabled}
              onChange={handleToggleEmailDispatch}
              disabled={isUpdatingToggle}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#1E2225] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#22C55E]" />
          </label>
        </div>
      </div>

      {/* Editable Alert Recipients */}
      <div className="bg-[#0D0F11] border border-[#1E2225] rounded-xl p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-[#F2F4F5]">Emergency Alert Roster</h3>
            <p className="text-[12px] text-[#9BA3A8]">
              Authorized SOC emails and mobile phone numbers for real-time Twilio & SMTP incident paging
            </p>
          </div>

          <button
            onClick={saveRecipients}
            disabled={isSavingRecipients}
            className="px-3.5 py-1.5 rounded-lg bg-[#FF4713] hover:bg-[#FF4713]/90 text-white text-[12px] font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(255,71,19,0.2)]"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Roster</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Add phone (+1...) or email (soc@...)"
            value={newRecipient}
            onChange={(e) => setNewRecipient(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addRecipient();
            }}
            className="flex-1 bg-[#050607] border border-[#1E2225] rounded-lg px-3 py-2 text-[12.5px] text-[#F2F4F5] placeholder:text-[#5E666B] focus:outline-none focus:border-[#FF4713]"
          />
          <button
            onClick={addRecipient}
            className="px-4 py-2 rounded-lg bg-[#141719] hover:bg-[#1E2225] border border-[#1E2225] text-[#F2F4F5] text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add to Roster</span>
          </button>
        </div>

        <div className="space-y-2">
          {recipients.map((r, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-lg bg-[#141719] border border-[#1E2225]"
            >
              <span className="font-mono text-[12px] text-[#F2F4F5]">{r}</span>
              <button
                onClick={() => removeRecipient(idx)}
                className="text-[#5E666B] hover:text-[#EF4444] transition-colors p-1"
                aria-label="Remove recipient"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
