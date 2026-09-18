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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-[#0D0F11] border border-[#EF4444]/40 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.25)] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2225] bg-[#EF4444]/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EF4444]/20 border border-[#EF4444]/40 flex items-center justify-center text-[#EF4444]">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-[#F2F4F5]">EMERGENCY TRUNK ESCALATION</h3>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#9BA3A8] mt-0.5">
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
              className="p-1 rounded-lg text-[#9BA3A8] hover:text-[#F2F4F5] hover:bg-[#1E2225] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="p-3.5 rounded-xl bg-[#141719] border border-[#1E2225] text-[12px] text-[#F2F4F5] space-y-2">
              <p className="font-medium text-[#EF4444]">
                Confirm immediate isolation and dispatch for this voice session:
              </p>
              <ul className="space-y-1.5 text-[11.5px] text-[#9BA3A8] font-mono">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  Isolate active SIP media trunk from enterprise telephony gateway
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  Commit forensic incident record to immutable SQLite hash-chain
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  Dispatch real-time Twilio SMS alert to SOC on-call roster
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  Deliver high-priority SMTP incident dossier to security operations
                </li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#1E2225] bg-[#050607]/80 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-[12px] text-[#9BA3A8] hover:text-[#F2F4F5] transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleEscalate}
              disabled={isSubmitting || completed}
              className="px-5 py-2 rounded-lg text-[12.5px] font-semibold bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {completed ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Trunk Isolated & Dispatched</span>
                </>
              ) : isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Isolating Trunk...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Confirm Escalation</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
