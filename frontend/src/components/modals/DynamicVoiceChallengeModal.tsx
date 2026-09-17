import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, ShieldCheck, ShieldAlert, Timer } from 'lucide-react';

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
  const [digits, setDigits] = useState(challengeDigits || '7 - 2 - 9 - 4');

  // Generate new random 4 digits every time modal opens
  useEffect(() => {
    if (isOpen) {
      const d1 = Math.floor(Math.random() * 9) + 1;
      const d2 = Math.floor(Math.random() * 9) + 1;
      const d3 = Math.floor(Math.random() * 9) + 1;
      const d4 = Math.floor(Math.random() * 9) + 1;
      setDigits(challengeDigits || `${d1} - ${d2} - ${d3} - ${d4}`);
      setTimeLeft(15);
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
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const progressPercent = (timeLeft / 15) * 100;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="w-full max-w-xl bg-[#0D0F11] border border-[#FF4713]/40 rounded-2xl shadow-[0_0_50px_rgba(255,71,19,0.25)] overflow-hidden"
        >
          {/* Top Warning Banner */}
          <div className="bg-[#FF4713]/15 border-b border-[#FF4713]/30 px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FF4713]/20 border border-[#FF4713]/40 flex items-center justify-center text-[#FF4713] animate-pulse">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-[#F2F4F5] tracking-wide">
                  ACTIVE VOICE LIVENESS CHALLENGE INJECTED
                </h3>
                <span className="text-[11px] font-mono text-[#9BA3A8]">Session: {sessionId}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Challenge HUD"
              className="p-1 rounded-lg text-[#9BA3A8] hover:text-[#F2F4F5] hover:bg-[#1E2225] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Timer Bar */}
            <div>
              <div className="flex items-center justify-between text-[11.5px] font-mono mb-1.5">
                <span className="flex items-center gap-1.5 text-[#9BA3A8]">
                  <Timer className="w-3.5 h-3.5 text-[#FF4713]" />
                  Acoustic Reflex Window:
                </span>
                <span
                  className={`font-bold ${
                    timeLeft <= 5 ? 'text-[#EF4444] animate-pulse' : 'text-[#F2F4F5]'
                  }`}
                >
                  {timeLeft}s remaining
                </span>
              </div>

              <div className="w-full h-2 bg-[#141719] rounded-full overflow-hidden border border-[#1E2225]">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                  className={`h-full rounded-full ${
                    timeLeft <= 5 ? 'bg-[#EF4444]' : 'bg-[#FF4713]'
                  }`}
                />
              </div>
            </div>

            {/* Prompt Instruction & Big Challenge Digits */}
            <div className="p-5 rounded-xl bg-[#050607] border border-[#1E2225] text-center space-y-3">
              <span className="text-[12px] uppercase font-mono text-[#9BA3A8] tracking-widest block">
                Direct Telephony Operator Prompt
              </span>
              <p className="text-[14px] text-[#F2F4F5]">
                "Please repeat the security digits:"
              </p>
              <div className="py-3 px-4 rounded-xl bg-[#141719] border border-[#FF4713]/40 inline-block shadow-inner">
                <span className="text-[32px] md:text-[38px] font-black font-mono tracking-[0.25em] text-[#FF4713] tabular-nums">
                  {digits}
                </span>
              </div>
              <p className="text-[11px] text-[#5E666B]">
                AASIST neural phoneme phase extractor tests sub-second micro-tremor & vocal tract reflex.
              </p>
            </div>

            {/* Operator Verification Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => {
                  onResolve(true);
                  onClose();
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#22C55E]/15 hover:bg-[#22C55E]/25 text-[#22C55E] border border-[#22C55E]/40 font-semibold text-[13px] transition-all shadow-[0_0_15px_rgba(34,197,94,0.15)] active:scale-98"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Caller Passed Liveness (Allow)</span>
              </button>

              <button
                onClick={() => {
                  onResolve(false);
                  onClose();
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/40 font-semibold text-[13px] transition-all shadow-[0_0_15px_rgba(239,68,68,0.15)] active:scale-98"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Challenge Failed (Reject)</span>
              </button>
            </div>
          </div>

          {/* Footer Note */}
          <div className="px-6 py-3 bg-[#050607]/80 border-t border-[#1E2225] flex items-center justify-between text-[11px] font-mono text-[#5E666B]">
            <span>Press ESC or click outside to dismiss</span>
            <button
              onClick={onClose}
              className="text-[#9BA3A8] hover:text-[#F2F4F5] transition-colors"
            >
              Close Challenge HUD
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
