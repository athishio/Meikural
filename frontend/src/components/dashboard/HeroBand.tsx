import React from 'react';
import type { VerdictType } from '../../types/dashboard';
import { motion, AnimatePresence } from 'framer-motion';

interface HeroBandProps {
  verdict?: VerdictType;
  spoofProbability?: number;
  voiceTrust?: number;
  sessionId?: string;
  codec?: string;
  inferenceMs?: number;
  activeScenario?: string | null;
  onTriggerChallenge?: () => void;
  onEscalate?: () => void;
}

export const HeroBand: React.FC<HeroBandProps> = React.memo(({
  verdict = 'ALLOW',
  spoofProbability = 0.08,
  voiceTrust = 92,
  sessionId = 'call_trunk_01',
  codec = 'Clean PCM (16kHz)',
  inferenceMs = 564.9,
  activeScenario = null,
  onTriggerChallenge,
  onEscalate,
}) => {
  const isAlert = verdict === 'ALERT' || spoofProbability >= 0.65;
  const isWarn = !isAlert && (verdict === 'WARN' || spoofProbability >= 0.35);

  return (
    <section aria-label="System Security State" className="w-full select-none space-y-2">
      {/* Subtle Top Metadata Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] font-mono text-[#525860] dark:text-[#A2A8B0]">
        <div className="flex items-center gap-2">
          <span className="text-[#1A1D20] dark:text-[#F0EEE9] font-bold">MEIKURAL SOC NODE 01</span>
          <span>·</span>
          <span>Session: {sessionId}</span>
          {activeScenario && (
            <>
              <span>·</span>
              <span className="text-[#924A00] dark:text-[#FBBF24] font-semibold">Simulated: {activeScenario}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[#165A34] dark:text-[#34D399] font-medium">DPDP §3(2) Zero Biometrics</span>
          <span>·</span>
          <span>Codec: {codec}</span>
          <span>·</span>
          <span>Latency: {inferenceMs}ms</span>
          <span className="px-1.5 py-0.2 rounded-sm bg-[#EFECE6] dark:bg-[#1F2328] border border-[#D8D3C8] dark:border-[#2B3037] text-[9.5px] text-[#78808A] dark:text-[#6E7681]">
            Sample reference
          </span>
        </div>
      </div>

      {/* Single State Banner - Forensic Evidence Dossier Stamp with smooth state-change feedback */}
      <div
        className={`relative w-full rounded-sm border p-6 sm:p-7 transition-all duration-300 shadow-xs overflow-hidden ${
          isAlert
            ? 'bg-[#FDEFEF] dark:bg-[#2B0F0F] border-[#E79E9E] dark:border-[#5E1A1A] animate-aura-alert'
            : isWarn
            ? 'bg-[#FDF6E8] dark:bg-[#291B06] border-[#E5BA78] dark:border-[#5C3E08] animate-aura-warn'
            : 'bg-[#EAF5EE] dark:bg-[#0E2316] border-[#9CD1B2] dark:border-[#1B5233] animate-aura-allow'
        }`}
      >
        {/* Soft forensic scanline overlay */}
        <div className="absolute inset-0 forensic-scanlines opacity-70 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2.5">
            {/* Badge & Mode Tag */}
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border flex items-center gap-1.5 transition-colors duration-150 ${
                  isAlert
                    ? 'bg-[#FBEAEA] dark:bg-[#3D1414] text-[#941818] dark:text-[#F87171] border-[#E79E9E] dark:border-[#6B2020]'
                    : isWarn
                    ? 'bg-[#F8E5BF] dark:bg-[#33220A] text-[#924A00] dark:text-[#FBBF24] border-[#E5BA78] dark:border-[#5C3B12]'
                    : 'bg-[#D1E7D9] dark:bg-[#0E2918] text-[#165A34] dark:text-[#34D399] border-[#9CD1B2] dark:border-[#194D2B]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isAlert ? 'bg-[#941818] dark:bg-[#F87171] animate-ping' : isWarn ? 'bg-[#924A00] dark:bg-[#FBBF24] animate-pulse' : 'bg-[#165A34] dark:text-[#34D399]'
                }`} />
                <span>{isAlert ? 'CRITICAL THREAT' : isWarn ? 'SUSPICIOUS' : 'LOW RISK - PASSIVE CHECK CLEARED'}</span>
              </span>
              <span className="text-[11px] font-mono text-[#525860] dark:text-[#A2A8B0]">
                [AASIST INT8 v2.4.1]
              </span>
            </div>

            {/* Headline - Primary Focal Point with Crisp Stamp Imprint Transition */}
            <motion.h1
              key={verdict}
              initial={{ opacity: 0.6, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16 }}
              className={`text-[26px] sm:text-[32px] font-bold font-mono tracking-tight leading-tight ${
                isAlert
                  ? 'text-[#941818] dark:text-[#F87171]'
                  : isWarn
                  ? 'text-[#924A00] dark:text-[#FBBF24]'
                  : 'text-[#165A34] dark:text-[#34D399]'
              }`}
            >
              {isAlert
                ? 'STEP-UP (DEEPFAKE CLONE)'
                : isWarn
                ? 'WARN (SUSPICIOUS JITTER)'
                : 'ALLOW (AUTHENTIC HUMAN)'}
            </motion.h1>

            {/* Exactly One Line of Context */}
            <p className="text-[13px] text-[#525860] dark:text-[#A2A8B0] leading-relaxed max-w-4xl">
              {isAlert
                ? 'Synthetic vocoder artifacts detected. Passive risk exceeds critical threshold (≥ 0.65). Quarantine recommended.'
                : isWarn
                ? 'Anomalous acoustic drift and packet jitter detected. Passive risk within challenge window (0.35 – 0.65).'
                : 'Acoustic glottal dynamics passed passive spectral check. Passive FAR is 25–53% depending on codec; allow is not a biometric guarantee.'}
            </p>

            {/* Telemetry Metric Line */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-mono text-[#525860] dark:text-[#A2A8B0] pt-1">
              <span>
                Passive Spoof Risk:{' '}
                <strong className={isAlert ? 'text-[#941818] dark:text-[#F87171]' : isWarn ? 'text-[#924A00] dark:text-[#FBBF24]' : 'text-[#165A34] dark:text-[#34D399]'}>
                  {(spoofProbability * 100).toFixed(1)}%
                </strong>
              </span>
              <span>·</span>
              <span>
                Voice Trust Index:{' '}
                <strong className={voiceTrust < 50 ? 'text-[#941818] dark:text-[#F87171]' : 'text-[#165A34] dark:text-[#34D399]'}>
                  {voiceTrust}/100
                </strong>
              </span>
              <span>·</span>
              <span>
                SIP Protocol Action:{' '}
                <strong className="text-[#1A1D20] dark:text-[#F0EEE9]">
                  {isAlert ? 'SIP 488 (Not Acceptable)' : isWarn ? 'SIP 183 (Progress + Info)' : 'SIP 200 (OK)'}
                </strong>
              </span>
            </div>
          </div>

          {/* Action Button for Threat / Warn State with Tactile Press Response */}
          <div className="shrink-0 flex items-center gap-2">
            <AnimatePresence mode="wait">
              {isAlert && onEscalate && (
                <motion.button
                  key="isolate-btn"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.15 }}
                  onClick={onEscalate}
                  className="px-4 py-2.5 rounded-sm bg-[#941818] dark:bg-[#DC2626] text-white text-[12px] font-semibold hover:opacity-90 active:scale-[0.97] transition-all cursor-pointer select-none shadow-xs"
                >
                  Isolate Trunk Now
                </motion.button>
              )}
              {isWarn && onTriggerChallenge && (
                <motion.button
                  key="challenge-btn"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.15 }}
                  onClick={onTriggerChallenge}
                  className="px-4 py-2.5 rounded-sm bg-[#924A00] dark:bg-[#F59E0B] text-white dark:text-black text-[12px] font-semibold hover:opacity-90 active:scale-[0.97] transition-all cursor-pointer select-none shadow-xs"
                >
                  Issue Dynamic Challenge
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
});
