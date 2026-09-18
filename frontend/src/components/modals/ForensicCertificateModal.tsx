import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, X, Copy, Check, Printer, FileText } from 'lucide-react';

interface CertData {
  sessionId: string;
  prevHash: string;
  blockHash: string;
  score: number;
  verdict: string;
  timestamp: string;
}

interface ForensicCertificateModalProps {
  cert: CertData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ForensicCertificateModal: React.FC<ForensicCertificateModalProps> = ({
  cert,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !cert) return null;

  const isAlert = cert.verdict === 'ALERT' || cert.score > 0.65;
  const isWarn = cert.verdict === 'WARN' || (cert.score >= 0.35 && cert.score <= 0.65);

  const handleCopySeal = () => {
    navigator.clipboard.writeText(cert.blockHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="w-full max-w-2xl bg-[#0D0F11] border border-[#1E2225] rounded-2xl shadow-2xl overflow-hidden font-sans select-none"
        >
          {/* Certificate Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2225] bg-[#050607]/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0D0F11] border border-[#1E2225] flex items-center justify-center text-[#FF4713]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#F2F4F5] tracking-wide">
                  MEIKURAL SENTINEL NODE FORENSIC CERTIFICATE
                </h3>
                <span className="text-[11px] font-mono text-[#5E666B]">
                  REF: MKR-CERT-{cert.sessionId.toUpperCase()}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#9BA3A8] hover:text-[#F2F4F5] hover:bg-[#1E2225] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Verdict Card */}
            <div
              className={`p-4 rounded-xl border flex items-center gap-3 ${
                isAlert
                  ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                  : isWarn
                  ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]'
                  : 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
              }`}
            >
              {isAlert ? (
                <ShieldAlert className="w-6 h-6 shrink-0" />
              ) : (
                <ShieldCheck className="w-6 h-6 shrink-0" />
              )}
              <div>
                <div className="text-[13.5px] font-bold">
                  {isAlert
                    ? 'CRITICAL: DEEPFAKE VOICE CLONE ATTACK DETECTED'
                    : isWarn
                    ? 'CAUTION: SUSPICIOUS CONVERSATIONAL JITTER'
                    : 'VERIFIED: AUTHENTIC BONAFIDE HUMAN CALLER'}
                </div>
                <div className="text-[11.5px] text-[#9BA3A8] mt-0.5">
                  Acoustic neural inference executed via AASIST INT8 v2.4.1. Verdict: {cert.verdict}
                </div>
              </div>
            </div>

            {/* Core Metadata Table */}
            <div className="grid grid-cols-2 gap-3 text-[11.5px] font-mono">
              <div className="p-3 rounded-xl bg-[#050607] border border-[#1E2225] space-y-1">
                <span className="text-[#5E666B] uppercase text-[10px] block">Session ID</span>
                <span className="text-[#F2F4F5] font-semibold">{cert.sessionId}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#050607] border border-[#1E2225] space-y-1">
                <span className="text-[#5E666B] uppercase text-[10px] block">Recorded Timestamp</span>
                <span className="text-[#F2F4F5] font-semibold">{cert.timestamp}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#050607] border border-[#1E2225] space-y-1">
                <span className="text-[#5E666B] uppercase text-[10px] block">Spoof Probability</span>
                <span className="text-[#EF4444] font-semibold">{cert.score.toFixed(4)}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#050607] border border-[#1E2225] space-y-1">
                <span className="text-[#5E666B] uppercase text-[10px] block">Voice Trust Index</span>
                <span className="text-[#22C55E] font-semibold">
                  {Math.round(Math.max(1, Math.min(99, (1 - cert.score) * 100)))}/100
                </span>
              </div>
            </div>

            {/* Cryptographic Hash-Chain Box */}
            <div className="p-3.5 rounded-xl bg-[#050607] border border-[#1E2225] space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between text-[#5E666B]">
                <span className="font-semibold text-[#F2F4F5]">CRYPTOGRAPHIC HASH-CHAIN DIGITAL SEAL</span>
                <span className="text-[#22C55E]">● TAMPER-EVIDENT</span>
              </div>

              <div className="space-y-1">
                <span className="text-[#5E666B] text-[10px] block">Previous Block Hash:</span>
                <span className="text-[#9BA3A8] text-[10.5px] truncate block">{cert.prevHash}</span>
              </div>

              <div className="space-y-1 pt-1 border-t border-[#1E2225]">
                <span className="text-[#5E666B] text-[10px] block">Current Merkle Block Hash:</span>
                <span className="text-[#22C55E] text-[10.5px] break-all block">{cert.blockHash}</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-[#1E2225] bg-[#050607]/80 flex items-center justify-between">
            <button
              onClick={handleCopySeal}
              className="px-3 py-1.5 rounded-lg bg-[#141719] hover:bg-[#1E2225] border border-[#1E2225] text-[#9BA3A8] hover:text-[#F2F4F5] text-[12px] flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Seal Copied' : 'Copy Digital Seal'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-[12px] text-[#9BA3A8] hover:text-[#F2F4F5]"
              >
                Close
              </button>

              <a
                href={`/calls/${cert.sessionId}/certificate`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-1.5 rounded-lg bg-[#FF4713] hover:bg-[#FF4713]/90 text-white font-semibold text-[12px] flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,71,19,0.25)] transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official PDF</span>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
