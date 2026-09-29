import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, X, Send, Check } from 'lucide-react';
import { ReferenceToken } from '../common/ReferenceToken';

interface EscalateConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  sessionId: string;
}

export const EscalateConfirmModal: React.FC<EscalateConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  sessionId,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  if (!isOpen) return null;

  const handleEscalate = async () => {
    setIsSubmitting(true);
    await onConfirm();
    setIsSubmitting(false);
    setCompleted(true);
    setTimeout(() => {
      setCompleted(false);
      onClose();
    }, 1200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="w-full max-w-lg bg-[#FFFFFF] dark:bg-[#181B1F] border border-[#E79E9E] dark:border-[#5E1A1A] rounded-sm shadow-xl overflow-hidden transition-colors select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E79E9E] dark:border-[#5E1A1A] bg-[#FDEFEF] dark:bg-[#2B0F0F]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-sm bg-[#FBEAEA] dark:bg-[#3D1414] border border-[#E79E9E] dark:border-[#6B2020] flex items-center justify-center text-[#941818] dark:text-[#F87171]">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[13px] font-bold font-mono text-[#941818] dark:text-[#F87171] uppercase tracking-wider">
                  Emergency Trunk Escalation
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#525860] dark:text-[#A2A8B0] mt-0.5">
                  <ReferenceToken
                    type="session"
                    raw={sessionId}
                    index={1}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1 rounded-sm text-[#525860] dark:text-[#A2A8B0] hover:text-[#1A1D20] dark:hover:text-[#F0EEE9] hover:bg-[#EFECE6] dark:hover:bg-[#1F2328] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="p-3.5 rounded-sm bg-[#FAF9F5] dark:bg-[#121417] border border-[#D8D3C8] dark:border-[#2B3037] text-[12px] space-y-2">
              <p className="font-semibold text-[#941818] dark:text-[#F87171] font-mono">
                Confirm immediate isolation and dispatch for this voice session:
              </p>
              <ul className="space-y-1.5 text-[11.5px] text-[#525860] dark:text-[#A2A8B0] font-mono">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-none bg-[#941818] dark:bg-[#F87171]" />
                  Isolate active SIP media trunk from enterprise telephony gateway
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-none bg-[#941818] dark:bg-[#F87171]" />
                  Commit forensic incident record to immutable SQLite hash-chain
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-none bg-[#941818] dark:bg-[#F87171]" />
                  Dispatch real-time Twilio SMS alert to SOC on-call roster
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-none bg-[#941818] dark:bg-[#F87171]" />
                  Deliver high-priority SMTP incident dossier to security operations
                </li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#D8D3C8] dark:border-[#2B3037] bg-[#F7F5F0] dark:bg-[#121417] flex items-center justify-end gap-3 font-mono">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-sm text-[12px] text-[#525860] dark:text-[#A2A8B0] hover:text-[#1A1D20] dark:hover:text-[#F0EEE9] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleEscalate}
              disabled={isSubmitting || completed}
              className="px-4 py-1.5 rounded-sm bg-[#941818] hover:bg-[#7F1D1D] text-white text-[12px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {completed ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Trunk Isolated</span>
                </>
              ) : isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Isolating...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm Trunk Isolation</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
