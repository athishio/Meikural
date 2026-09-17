import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sliders, RotateCcw, Save, ShieldCheck, Zap, ShieldAlert, Check, AlertTriangle } from 'lucide-react';
import type { RulesConfig } from '../../types/dashboard';

interface RulesPageProps {
  initialRules?: RulesConfig;
  onSaveRules: (rules: RulesConfig) => Promise<void>;
}

const defaultRules: RulesConfig = {
  bonafide_allow_threshold: 0.35,
  step_up_challenge_threshold: 0.65,
  critical_deepfake_threshold: 0.65,
  alert_recipients: ['soc-oncall@enterprise.meikural.internal', '+15550192834'],
  last_dispatch: {
    sip: Date.now() - 120000,
    twilio: Date.now() - 3400000,
    smtp: Date.now() - 3400000,
  },
};

export const RulesPage: React.FC<RulesPageProps> = ({
  initialRules = defaultRules,
  onSaveRules,
}) => {
  const [allowThreshold, setAllowThreshold] = useState(initialRules.bonafide_allow_threshold);
  const [criticalThreshold, setCriticalThreshold] = useState(initialRules.step_up_challenge_threshold);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Divider 1 adjustment: moves allow threshold, ensuring allow <= critical - 0.05
  const handleAllowChange = (val: number) => {
    const clamped = Math.max(0.1, Math.min(criticalThreshold - 0.05, Math.round(val * 100) / 100));
    setAllowThreshold(clamped);
    setHasUnsavedChanges(true);
  };

  // Divider 2 adjustment: moves critical threshold, ensuring critical >= allow + 0.05
  const handleCriticalChange = (val: number) => {
    const clamped = Math.max(allowThreshold + 0.05, Math.min(0.9, Math.round(val * 100) / 100));
    setCriticalThreshold(clamped);
    setHasUnsavedChanges(true);
  };

  const handleReset = () => {
    setAllowThreshold(0.35);
    setCriticalThreshold(0.65);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updated: RulesConfig = {
      ...initialRules,
      bonafide_allow_threshold: allowThreshold,
      step_up_challenge_threshold: criticalThreshold,
      critical_deepfake_threshold: criticalThreshold,
    };
    await onSaveRules(updated);
    setIsSaving(false);
    setHasUnsavedChanges(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 select-none"
    >
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-[#F2F4F5] tracking-tight">
            Security Rules & Decision Thresholds
          </h1>
          <p className="text-[12px] text-[#9BA3A8] mt-1">
            Contiguous risk bands governing autonomous call allow, dynamic challenge, and quarantine alert actions
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-[11px] font-mono text-[#F59E0B] flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              Unsaved changes
            </span>
          )}

          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg bg-[#141719] hover:bg-[#1E2225] border border-[#1E2225] text-[12px] text-[#9BA3A8] hover:text-[#F2F4F5] flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || (!hasUnsavedChanges && !savedSuccess)}
            className="px-4 py-1.5 rounded-lg bg-[#FF4713] hover:bg-[#FF4713]/90 text-white text-[12px] font-semibold shadow-[0_0_15px_rgba(255,71,19,0.25)] flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Thresholds Persisted</span>
              </>
            ) : isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Thresholds</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Contiguous Spectrum Visualizer */}
      <div className="bg-[#0D0F11] border border-[#1E2225] rounded-xl p-6 shadow-card space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-[#F2F4F5] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#FF4713]" />
              Contiguous Three-Band Decision Plane
            </span>
            <span className="text-[11px] font-mono text-[#5E666B]">
              Continuous range [0.00 – 1.00] · Zero overlap / Zero gaps
            </span>
          </div>

          {/* Color-segmented track */}
          <div className="relative h-10 w-full rounded-xl overflow-hidden flex border border-[#1E2225] font-mono text-[11.5px] font-bold text-white select-none">
            {/* Safe Band */}
            <div
              style={{ width: `${allowThreshold * 100}%` }}
              className="bg-[#22C55E]/80 hover:bg-[#22C55E] flex items-center justify-center transition-all cursor-default"
            >
              <span className="truncate px-2">ALLOW (Safe)</span>
            </div>

            {/* Caution Band */}
            <div
              style={{ width: `${(criticalThreshold - allowThreshold) * 100}%` }}
              className="bg-[#F59E0B]/80 hover:bg-[#F59E0B] flex items-center justify-center transition-all cursor-default text-[#050607]"
            >
              <span className="truncate px-2">WARN (Challenge)</span>
            </div>

            {/* Alert Band */}
            <div
              style={{ width: `${(1.0 - criticalThreshold) * 100}%` }}
              className="bg-[#EF4444]/80 hover:bg-[#EF4444] flex items-center justify-center transition-all cursor-default"
            >
              <span className="truncate px-2">ALERT (Quarantine)</span>
            </div>
          </div>
        </div>

        {/* 3 Interactive Cards with Contiguous Sliders & Live Numeric Readout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Band 1: Allow */}
          <div className="p-4 rounded-xl bg-[#050607] border border-[#22C55E]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#22C55E]">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[13px] font-bold">1. Bonafide Allow</span>
              </div>
              <span className="text-[13px] font-mono font-bold text-[#22C55E]">
                &le; {allowThreshold.toFixed(2)}
              </span>
            </div>
            <p className="text-[11.5px] text-[#9BA3A8]">
              Verified natural glottal harmonic dynamics. Automated call pass through with zero operator latency.
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-[10.5px] font-mono text-[#5E666B]">
                <span>Allow Threshold Cutoff</span>
                <span>{allowThreshold.toFixed(2)} P(Spoof)</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.60"
                step="0.01"
                value={allowThreshold}
                onChange={(e) => handleAllowChange(parseFloat(e.target.value))}
                className="w-full accent-[#22C55E] bg-[#141719] h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Band 2: Challenge */}
          <div className="p-4 rounded-xl bg-[#050607] border border-[#F59E0B]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#F59E0B]">
                <Zap className="w-4 h-4" />
                <span className="text-[13px] font-bold">2. Dynamic Challenge</span>
              </div>
              <span className="text-[13px] font-mono font-bold text-[#F59E0B]">
                {allowThreshold.toFixed(2)} &lt; P &lt; {criticalThreshold.toFixed(2)}
              </span>
            </div>
            <p className="text-[11.5px] text-[#9BA3A8]">
              Ambiguous conversational jitter or codec compression. Immediately pops 15s security digits prompt.
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-[10.5px] font-mono text-[#5E666B]">
                <span>Contiguous Width</span>
                <span>{(criticalThreshold - allowThreshold).toFixed(2)} band</span>
              </div>
              <div className="h-1.5 w-full bg-[#F59E0B]/30 rounded-full" />
            </div>
          </div>

          {/* Band 3: Alert */}
          <div className="p-4 rounded-xl bg-[#050607] border border-[#EF4444]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#EF4444]">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-[13px] font-bold">3. Critical Alert</span>
              </div>
              <span className="text-[13px] font-mono font-bold text-[#EF4444]">
                &ge; {criticalThreshold.toFixed(2)}
              </span>
            </div>
            <p className="text-[11.5px] text-[#9BA3A8]">
              Definite synthetic voice cloning or neural TTS signature. Automatically isolates trunk and dispatches SMS/SMTP.
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-[10.5px] font-mono text-[#5E666B]">
                <span>Alert Threshold Cutoff</span>
                <span>{criticalThreshold.toFixed(2)} P(Spoof)</span>
              </div>
              <input
                type="range"
                min="0.40"
                max="0.90"
                step="0.01"
                value={criticalThreshold}
                onChange={(e) => handleCriticalChange(parseFloat(e.target.value))}
                className="w-full accent-[#EF4444] bg-[#141719] h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
