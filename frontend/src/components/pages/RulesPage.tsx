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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="space-y-6 select-none"
    >
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold font-mono text-[#1A1D20] dark:text-[#F0EEE9] tracking-tight">
            Security Rules & Decision Thresholds
          </h1>
          <p className="text-[12px] text-[#525860] dark:text-[#A2A8B0] mt-1">
            Contiguous risk bands governing autonomous call allow, dynamic challenge, and quarantine alert actions
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-[11px] font-mono text-[#924A00] dark:text-[#FBBF24] flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              Unsaved changes
            </span>
          )}

          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-sm bg-[#FFFFFF] dark:bg-[#181B1F] hover:bg-[#F7F5F0] dark:hover:bg-[#1F2328] border border-[#D8D3C8] dark:border-[#2B3037] text-[12px] font-mono text-[#525860] dark:text-[#A2A8B0] hover:text-[#1A1D20] dark:hover:text-[#F0EEE9] flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || (!hasUnsavedChanges && !savedSuccess)}
            className="px-4 py-1.5 rounded-sm bg-[#1A1D20] hover:bg-[#33383F] dark:bg-[#F0EEE9] dark:hover:bg-[#FFFFFF] text-white dark:text-[#121417] text-[12px] font-mono font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {savedSuccess ? (
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 text-[#165A34] dark:text-[#165A34]" />
                <span>Thresholds Persisted</span>
              </motion.div>
            ) : isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
      <div className="bg-[#FFFFFF] dark:bg-[#181B1F] border border-[#D8D3C8] dark:border-[#2B3037] rounded-sm p-6 shadow-xs space-y-6 transition-colors">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-bold font-mono uppercase tracking-wider text-[#1A1D20] dark:text-[#F0EEE9] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#1A1D20] dark:text-[#F0EEE9]" />
              Contiguous Three-Band Decision Plane
            </span>
            <span className="text-[11px] font-mono text-[#78808A] dark:text-[#6E7681]">
              Continuous range [0.00 – 1.00] · Zero overlap / Zero gaps
            </span>
          </div>

          {/* Color-segmented track */}
          <div className="relative h-10 w-full rounded-sm overflow-hidden flex border border-[#D8D3C8] dark:border-[#2B3037] font-mono text-[11.5px] font-bold select-none">
            {/* Safe Band */}
            <div
              style={{ width: `${allowThreshold * 100}%` }}
              className="bg-[#EAF5EE] dark:bg-[#0E2316] text-[#165A34] dark:text-[#34D399] border-r border-[#9CD1B2] dark:border-[#1B5233] flex items-center justify-center transition-[width] duration-100 ease-out cursor-default"
            >
              <span className="truncate px-2">ALLOW (Safe)</span>
            </div>

            {/* Caution Band */}
            <div
              style={{ width: `${(criticalThreshold - allowThreshold) * 100}%` }}
              className="bg-[#FDF6E8] dark:bg-[#291B06] text-[#924A00] dark:text-[#FBBF24] border-r border-[#E5BA78] dark:border-[#5C3E08] flex items-center justify-center transition-[width] duration-100 ease-out cursor-default"
            >
              <span className="truncate px-2">WARN (Challenge)</span>
            </div>

            {/* Alert Band */}
            <div
              style={{ width: `${(1.0 - criticalThreshold) * 100}%` }}
              className="bg-[#FDEFEF] dark:bg-[#2B0F0F] text-[#941818] dark:text-[#F87171] flex items-center justify-center transition-[width] duration-100 ease-out cursor-default"
            >
              <span className="truncate px-2">ALERT (Quarantine)</span>
            </div>
          </div>
        </div>

        {/* 3 Interactive Cards with Contiguous Sliders & Live Numeric Readout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Band 1: Allow */}
          <div className="p-4 rounded-sm bg-[#FAF9F5] dark:bg-[#15171A] border border-[#9CD1B2] dark:border-[#1B5233] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#165A34] dark:text-[#34D399]">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[13px] font-bold font-mono">1. Bonafide Allow</span>
              </div>
              <span className="text-[13px] font-mono font-bold text-[#165A34] dark:text-[#34D399]">
                &le; {allowThreshold.toFixed(2)}
              </span>
            </div>
            <p className="text-[11.5px] text-[#525860] dark:text-[#A2A8B0]">
              Verified natural glottal harmonic dynamics. Automated call pass through with zero operator latency.
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-[10.5px] font-mono text-[#78808A] dark:text-[#6E7681]">
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
                className="w-full h-2 rounded-sm cursor-pointer"
              />
            </div>
          </div>

          {/* Band 2: Challenge */}
          <div className="p-4 rounded-sm bg-[#FAF9F5] dark:bg-[#15171A] border border-[#E5BA78] dark:border-[#5C3E08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#924A00] dark:text-[#FBBF24]">
                <Zap className="w-4 h-4" />
                <span className="text-[13px] font-bold font-mono">2. Dynamic Challenge</span>
              </div>
              <span className="text-[13px] font-mono font-bold text-[#924A00] dark:text-[#FBBF24]">
                {allowThreshold.toFixed(2)} &lt; P &lt; {criticalThreshold.toFixed(2)}
              </span>
            </div>
            <p className="text-[11.5px] text-[#525860] dark:text-[#A2A8B0]">
              Ambiguous conversational jitter or codec compression. Immediately pops 15s security digits prompt.
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-[10.5px] font-mono text-[#78808A] dark:text-[#6E7681]">
                <span>Contiguous Width</span>
                <span>{(criticalThreshold - allowThreshold).toFixed(2)} band</span>
              </div>
              <div className="h-1.5 w-full bg-[#E5BA78]/40 dark:bg-[#5C3E08]/40 rounded-sm" />
            </div>
          </div>

          {/* Band 3: Alert */}
          <div className="p-4 rounded-sm bg-[#FAF9F5] dark:bg-[#15171A] border border-[#E79E9E] dark:border-[#5E1A1A] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#941818] dark:text-[#F87171]">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-[13px] font-bold font-mono">3. Critical Alert</span>
              </div>
              <span className="text-[13px] font-mono font-bold text-[#941818] dark:text-[#F87171]">
                &ge; {criticalThreshold.toFixed(2)}
              </span>
            </div>
            <p className="text-[11.5px] text-[#525860] dark:text-[#A2A8B0]">
              Definite synthetic voice cloning or neural TTS signature. Automatically isolates trunk and dispatches SMS/SMTP.
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-[10.5px] font-mono text-[#78808A] dark:text-[#6E7681]">
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
                className="w-full h-2 rounded-sm cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
