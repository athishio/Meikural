import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, ShieldCheck, ShieldAlert, Timer, Headphones, AlertTriangle, Play, Pause, CheckCircle2 } from 'lucide-react';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (passed: boolean) => void;
  challengeDigits?: string;
  sessionId?: string;
}

export const DynamicVoiceChallengeModal: React.FC<ChallengeModalProps> = ({
  isOpen,
  onClose,
  onResolve,
  challengeDigits,
  sessionId = 'call_active',
}) => {
  const [timeLeft, setTimeLeft] = useState(15);
  const [digits, setDigits] = useState(challengeDigits || '4 - 8 - 2 - 9');
  const [activeTab, setActiveTab] = useState<'ai_warning' | 'human_verified'>('ai_warning');
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate random digits if not provided
  useEffect(() => {
    if (isOpen) {
      if (!challengeDigits) {
        const d1 = Math.floor(Math.random() * 9) + 1;
        const d2 = Math.floor(Math.random() * 9) + 1;
        const d3 = Math.floor(Math.random() * 9) + 1;
        const d4 = Math.floor(Math.random() * 9) + 1;
        setDigits(`${d1} - ${d2} - ${d3} - ${d4}`);
      } else {
        setDigits(challengeDigits);
      }
      setTimeLeft(15);
      setIsPlaying(false);
    }
  }, [isOpen, challengeDigits]);

  // 15-second countdown timer
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (audioRef.current) audioRef.current.pause();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  if (!isOpen) return null;

  const currentAudioSrc =
    activeTab === 'ai_warning'
      ? '/demo_clips/deepfake_voice_clone.wav?v=2'
      : '/demo_clips/challenge_response_digits.wav?v=2';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="w-full max-w-2xl bg-[#0D0F11] border border-[#FF4713]/40 rounded-2xl shadow-[0_0_60px_rgba(255,71,19,0.25)] overflow-hidden text-[#F2F4F5]"
        >
          {/* Top Header Banner */}
          <div className="bg-[#FF4713]/15 border-b border-[#FF4713]/30 px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FF4713]/20 border border-[#FF4713]/40 flex items-center justify-center text-[#FF4713] animate-pulse">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-[#F2F4F5] tracking-wide flex items-center gap-2">
                  <span>ACTIVE VOICE CHALLENGE & OPERATOR AUDITION</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF4713]/20 text-[#FF4713] border border-[#FF4713]/30">
                    HITL VERIFY
                  </span>
                </h3>
                <span className="text-[11px] font-mono text-[#9BA3A8]">Session: {sessionId}</span>
              </div>
            </div>

            <button
              onClick={() => {
                if (audioRef.current) audioRef.current.pause();
                onClose();
              }}
              aria-label="Close Challenge HUD"
              className="p-1 rounded-lg text-[#9BA3A8] hover:text-[#F2F4F5] hover:bg-[#1E2225] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Simulation Persona Selector for Judges */}
            <div className="flex items-center justify-between p-1.5 rounded-xl bg-[#050607] border border-[#1E2225]">
              <span className="text-[11px] font-mono text-[#5E666B] uppercase tracking-wider ml-2 font-semibold">
                Challenge Response Mode:
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('ai_warning');
                    setIsPlaying(false);
                  }}
                  className={`px-3 py-1 rounded-lg text-[11.5px] font-mono font-medium transition-all ${
                    activeTab === 'ai_warning'
                      ? 'bg-[#EF4444]/20 border border-[#EF4444]/50 text-[#EF4444] shadow-sm'
                      : 'text-[#9BA3A8] hover:text-[#F2F4F5]'
                  }`}
                >
                  ⚠️ AI Clone Response (Warning)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('human_verified');
                    setIsPlaying(false);
                  }}
                  className={`px-3 py-1 rounded-lg text-[11.5px] font-mono font-medium transition-all ${
                    activeTab === 'human_verified'
                      ? 'bg-[#22C55E]/20 border border-[#22C55E]/50 text-[#22C55E] shadow-sm'
                      : 'text-[#9BA3A8] hover:text-[#F2F4F5]'
                  }`}
                >
                  ✓ Human Response (Pass)
                </button>
              </div>
            </div>

            {/* Issued Prompt & Token HUD */}
            <div className="p-4 rounded-xl bg-[#050607] border border-[#1E2225] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-left">
                <span className="text-[10px] uppercase font-mono text-[#9BA3A8] tracking-widest block">
                  Telephony Operator Prompt Issued
                </span>
                <p className="text-[13px] text-[#F2F4F5] mt-0.5">
                  "Please repeat the verification digits:"
                </p>
                <div className="mt-1.5 inline-block py-1.5 px-3 rounded-lg bg-[#141719] border border-[#FF4713]/40">
                  <span className="text-[22px] font-black font-mono tracking-[0.25em] text-[#FF4713]">
                    {digits}
                  </span>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="text-right flex flex-col items-end">
                <div className="flex items-center gap-1 text-[11px] font-mono text-[#9BA3A8]">
                  <Timer className="w-3.5 h-3.5 text-[#FF4713]" />
                  <span>Reflex Window:</span>
                  <span className={`font-bold ${timeLeft <= 5 ? 'text-[#EF4444] animate-pulse' : 'text-[#F2F4F5]'}`}>
                    {timeLeft}s
                  </span>
                </div>
                <div className="w-32 h-1.5 bg-[#141719] rounded-full overflow-hidden border border-[#1E2225] mt-1.5">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      timeLeft <= 5 ? 'bg-[#EF4444]' : 'bg-[#FF4713]'
                    }`}
                    style={{ width: `${(timeLeft / 15) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* AI Warning or Human Confirmation Banner */}
            {activeTab === 'ai_warning' ? (
              <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-[#EF4444]" />
                  <span className="text-[13px] font-bold tracking-tight">
                    ⚠️ AI VOICE CLONE DETECTED ON CHALLENGE RESPONSE
                  </span>
                </div>
                <p className="text-[11.5px] text-[#F2F4F5]/80 leading-relaxed">
                  AASIST neural filter flagged high-frequency vocoder phase artifacts (&gt;7.5kHz) and cascading generation lag (1,420ms). <strong>Operator verification required:</strong> Listen to the recorded response below to confirm before approving or rejecting.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#22C55E]" />
                  <span className="text-[13px] font-bold tracking-tight">
                    ✓ BIOLOGICAL HUMAN REFLEX DETECTED (458ms)
                  </span>
                </div>
                <p className="text-[11.5px] text-[#F2F4F5]/80 leading-relaxed">
                  Sub-second natural cognitive turnaround reflex verified. Organic vocal-tract formants match genuine human acoustics.
                </p>
              </div>
            )}

            {/* Audio Audition Section (Hear the Caller's Answer) */}
            <div className="p-4 rounded-xl bg-[#07090D] border border-[#1E2225] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-[#FF4713]" />
                  <span className="text-[12.5px] font-bold text-[#F2F4F5]">
                    Recorded Caller Audio Evidence (Audition Station)
                  </span>
                </div>
                <span className="text-[10.5px] font-mono text-[#9BA3A8]">
                  {activeTab === 'ai_warning' ? 'Deepfake Vocoder Sample' : 'Human Liveness Sample'}
                </span>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#141719] border border-[#1E2225]">
                <button
                  type="button"
                  onClick={toggleAudioPlayback}
                  className="w-10 h-10 rounded-full bg-[#FF4713] hover:bg-[#FF4713]/90 text-white flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,71,19,0.3)] transition-all active:scale-95 cursor-pointer"
                  title={isPlaying ? 'Pause Audio' : 'Play Caller Response Audio'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>

                <div className="flex-1">
                  <div className="flex items-center justify-between text-[11.5px] font-medium text-[#F2F4F5] mb-1">
                    <span>{isPlaying ? 'Playing Audio Evidence...' : 'Click Play to Hear Caller Response'}</span>
                    <span className="font-mono text-[10.5px] text-[#9BA3A8]">16kHz · WAV</span>
                  </div>

                  {/* Native Audio Element */}
                  <audio
                    ref={audioRef}
                    src={currentAudioSrc}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    controls
                    className="w-full h-7 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-[#5E666B] pt-1">
                <span>Reflex Latency: {activeTab === 'ai_warning' ? '1,420ms (Synthetic Pipeline Lag)' : '458ms (Organic Human Reflex)'}</span>
                <span>Passive Score: {activeTab === 'ai_warning' ? '0.96 (Spoof Alert)' : '0.04 (Cleared)'}</span>
              </div>
            </div>

            {/* Operator Approval & Decision Controls */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-mono text-[#9BA3A8] uppercase tracking-wider block text-center">
                Operator Security Decision (Human-in-the-Loop):
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Approve Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) audioRef.current.pause();
                    onResolve(true);
                    onClose();
                  }}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#22C55E]/15 hover:bg-[#22C55E]/25 text-[#22C55E] border border-[#22C55E]/40 font-semibold text-[13px] transition-all shadow-[0_0_15px_rgba(34,197,94,0.15)] active:scale-98 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Approve Caller (Verify as Human)</span>
                </button>

                {/* Reject / Quarantine Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) audioRef.current.pause();
                    onResolve(false);
                    onClose();
                  }}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/40 font-semibold text-[13px] transition-all shadow-[0_0_15px_rgba(239,68,68,0.15)] active:scale-98 cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Confirm AI Warning & Reject</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="px-6 py-3 bg-[#050607]/80 border-t border-[#1E2225] flex items-center justify-between text-[11px] font-mono text-[#5E666B]">
            <span>Regulatory Human-in-the-Loop Compliance (DPDP Act 2023)</span>
            <button
              onClick={() => {
                if (audioRef.current) audioRef.current.pause();
                onClose();
              }}
              className="text-[#9BA3A8] hover:text-[#F2F4F5] transition-colors"
            >
              Dismiss HUD
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
