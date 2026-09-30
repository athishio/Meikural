import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2, ShieldAlert, X } from 'lucide-react';

interface ActiveChallengePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (passed: boolean) => void;
  challengeDigits: string;
}

export const ActiveChallengePanel: React.FC<ActiveChallengePanelProps> = ({
  isOpen,
  onClose,
  onResolve,
  challengeDigits,
}) => {
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(15);
    }
  }, [isOpen]);

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0, scale: 0.98 }}
          animate={{ opacity: 1, height: 'auto', scale: 1 }}
          exit={{ opacity: 0, height: 0, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="w-full overflow-hidden"
        >
          <div className="w-full bg-[#FDF6E8] dark:bg-[#291B06] border border-[#E5BA78] dark:border-[#5C3E08] rounded-sm p-5 space-y-4 select-none shadow-xs transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E5BA78] dark:border-[#5C3E08] pb-3">
              <div className="flex items-center gap-2 text-[#924A00] dark:text-[#FBBF24]">
                <Zap className="w-4 h-4" />
                <h2 className="text-[13px] font-bold font-mono uppercase tracking-wider">
                  Active Liveness Intercept & Dynamic Challenge
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-sm font-semibold border transition-colors ${
                  timeLeft <= 5
                    ? 'text-[#941818] dark:text-[#F87171] bg-[#FDEFEF] dark:bg-[#2B0F0F] border-[#E79E9E] dark:border-[#5E1A1A] animate-pulse'
                    : 'text-[#924A00] dark:text-[#FBBF24] bg-[#F8E5BF] dark:bg-[#3B2609] border-[#E5BA78] dark:border-[#5C3E08]'
                }`}>
                  Reflex Window: {timeLeft}s remaining
                </span>
                <button
                  onClick={onClose}
                  className="text-[#525860] dark:text-[#A2A8B0] hover:text-[#1A1D20] dark:hover:text-[#F0EEE9] p-1 rounded-sm hover:bg-[#EFECE6] dark:hover:bg-[#1F2328] transition-colors cursor-pointer"
                  aria-label="Close Challenge"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Linear Reflex Countdown Progress Bar */}
            <div className="h-1 w-full bg-[#E5BA78]/30 dark:bg-[#5C3E08]/30 rounded-none overflow-hidden">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: `${(timeLeft / 15) * 100}%` }}
                transition={{ duration: 0.95, ease: 'linear' }}
                className={`h-full transition-colors duration-300 ${
                  timeLeft <= 5 ? 'bg-[#941818] dark:bg-[#F87171]' : 'bg-[#924A00] dark:bg-[#FBBF24]'
                }`}
              />
            </div>

            {/* Challenge Content */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FFFFFF] dark:bg-[#181B1F] border border-[#D8D3C8] dark:border-[#2B3037] p-4 rounded-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#78808A] dark:text-[#6E7681] uppercase tracking-wider font-semibold">
                  Spoken Dynamic Security Prompt (Sub-second Turnaround Intercept):
                </span>
                <div>
                  <motion.div
                    key={challengeDigits}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[18px] sm:text-[22px] font-mono font-bold text-[#1A1D20] dark:text-[#F0EEE9] tracking-widest bg-[#FAF9F5] dark:bg-[#121417] px-3 py-1 border border-[#D8D3C8] dark:border-[#2B3037] rounded-sm inline-flex items-center gap-1 shadow-2xs"
                  >
                    <span>{challengeDigits || 'Awaiting challenge token...'}</span>
                    <span className="w-2 h-4 bg-[#1A1D20] dark:bg-[#F0EEE9] inline-block animate-pulse opacity-75" />
                  </motion.div>
                </div>
                <p className="text-[11px] text-[#525860] dark:text-[#A2A8B0]">
                  Instruct caller to recite the exact dynamic sequence. Generative vocoders lag &gt;1200ms or produce speech synthesis artifacts.
                </p>
              </div>

              {/* Operator Resolution Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onResolve(true)}
                  className="px-3.5 py-2 rounded-sm bg-[#EAF5EE] hover:bg-[#D1E7D9] dark:bg-[#0E2316] dark:hover:bg-[#143320] text-[#165A34] dark:text-[#34D399] border border-[#9CD1B2] dark:border-[#1B5233] text-[12px] font-mono font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Pass Challenge</span>
                </button>

                <button
                  onClick={() => onResolve(false)}
                  className="px-3.5 py-2 rounded-sm bg-[#FDEFEF] hover:bg-[#FBEAEA] dark:bg-[#2B0F0F] dark:hover:bg-[#3D1414] text-[#941818] dark:text-[#F87171] border border-[#E79E9E] dark:border-[#5E1A1A] text-[12px] font-mono font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Fail & Quarantine</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
