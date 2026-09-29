import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, X, Copy, Check, Printer, FileText } from 'lucide-react';
import { ReferenceToken } from '../common/ReferenceToken';

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="w-full max-w-2xl bg-[#FFFFFF] dark:bg-[#181B1F] border border-[#D8D3C8] dark:border-[#2B3037] rounded-sm shadow-xl overflow-hidden font-sans select-none transition-colors"
        >
          {/* Certificate Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8D3C8] dark:border-[#2B3037] bg-[#F7F5F0] dark:bg-[#121417]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-sm bg-[#FFFFFF] dark:bg-[#181B1F] border border-[#D8D3C8] dark:border-[#2B3037] flex items-center justify-center text-[#1A1D20] dark:text-[#F0EEE9]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold font-mono text-[#1A1D20] dark:text-[#F0EEE9] uppercase tracking-wider">
                  Meikural Sentinel Node Forensic Certificate
                </h3>
                <span className="text-[11px] font-mono text-[#78808A] dark:text-[#6E7681]">
                  REF: MKR-CERT-{cert.sessionId.toUpperCase()}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-sm text-[#525860] dark:text-[#A2A8B0] hover:text-[#1A1D20] dark:hover:text-[#F0EEE9] hover:bg-[#EFECE6] dark:hover:bg-[#1F2328] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Verdict Card */}
            <div
              className={`p-4 rounded-sm border flex items-center gap-3 ${
                isAlert
                  ? 'bg-[#FDEFEF] dark:bg-[#2B0F0F] border-[#E79E9E] dark:border-[#5E1A1A] text-[#941818] dark:text-[#F87171]'
                  : isWarn
                  ? 'bg-[#FDF6E8] dark:bg-[#291B06] border-[#E5BA78] dark:border-[#5C3E08] text-[#924A00] dark:text-[#FBBF24]'
                  : 'bg-[#EAF5EE] dark:bg-[#0E2316] border-[#9CD1B2] dark:border-[#1B5233] text-[#165A34] dark:text-[#34D399]'
              }`}
            >
              {isAlert ? (
                <ShieldAlert className="w-6 h-6 shrink-0" />
              ) : (
                <ShieldCheck className="w-6 h-6 shrink-0" />
              )}
              <div>
                <div className="text-[13px] font-bold font-mono">
                  {isAlert
                    ? 'CRITICAL: DEEPFAKE VOICE CLONE ATTACK DETECTED'
                    : isWarn
                    ? 'CAUTION: SUSPICIOUS CONVERSATIONAL JITTER'
                    : 'VERIFIED: AUTHENTIC BONAFIDE HUMAN CALLER'}
                </div>
                <div className="text-[11.5px] text-[#525860] dark:text-[#A2A8B0] mt-0.5">
                  Acoustic neural inference executed via AASIST INT8 v2.4.1. Verdict: {cert.verdict}
                </div>
              </div>
            </div>

            {/* Core Metadata Table */}
            <div className="grid grid-cols-2 gap-3 text-[11.5px] font-mono">
              <div className="p-3 rounded-sm bg-[#F7F5F0] dark:bg-[#121417] border border-[#D8D3C8] dark:border-[#2B3037] space-y-1">
                <span className="text-[#78808A] dark:text-[#6E7681] uppercase text-[10px] block">Session Reference</span>
                <ReferenceToken
                  type="session"
                  raw={cert.sessionId}
                  index={1}
                />
              </div>

              <div className="p-3 rounded-sm bg-[#F7F5F0] dark:bg-[#121417] border border-[#D8D3C8] dark:border-[#2B3037] space-y-1">
                <span className="text-[#78808A] dark:text-[#6E7681] uppercase text-[10px] block">Recorded Timestamp</span>
                <span className="text-[#1A1D20] dark:text-[#F0EEE9] font-semibold">{cert.timestamp}</span>
              </div>

              <div className="p-3 rounded-sm bg-[#F7F5F0] dark:bg-[#121417] border border-[#D8D3C8] dark:border-[#2B3037] space-y-1">
                <span className="text-[#78808A] dark:text-[#6E7681] uppercase text-[10px] block">Spoof Probability</span>
                <span className="text-[#941818] dark:text-[#F87171] font-semibold">{cert.score.toFixed(4)}</span>
              </div>

              <div className="p-3 rounded-sm bg-[#F7F5F0] dark:bg-[#121417] border border-[#D8D3C8] dark:border-[#2B3037] space-y-1">
                <span className="text-[#78808A] dark:text-[#6E7681] uppercase text-[10px] block">Voice Trust Index</span>
                <span className="text-[#165A34] dark:text-[#34D399] font-semibold">
                  {Math.round(Math.max(1, Math.min(99, (1 - cert.score) * 100)))}/100
                </span>
              </div>
            </div>

            {/* Cryptographic Hash-Chain Box */}
            <div className="p-3.5 rounded-sm bg-[#F7F5F0] dark:bg-[#121417] border border-[#D8D3C8] dark:border-[#2B3037] space-y-2.5 font-mono text-[11px]">
              <div className="flex items-center justify-between text-[#525860] dark:text-[#A2A8B0]">
                <span className="font-semibold text-[#1A1D20] dark:text-[#F0EEE9]">CRYPTOGRAPHIC HASH-CHAIN DIGITAL SEAL</span>
                <span className="text-[#165A34] dark:text-[#34D399]">● TAMPER-EVIDENT</span>
              </div>

              <div className="space-y-1">
                <span className="text-[#78808A] dark:text-[#6E7681] text-[10px] block uppercase">Previous Block Anchor:</span>
                <ReferenceToken
                  type="hash"
                  raw={cert.prevHash}
                  label="Previous Block Ref #0"
                />
              </div>

              <div className="space-y-1 pt-1.5 border-t border-[#D8D3C8] dark:border-[#2B3037]">
                <span className="text-[#78808A] dark:text-[#6E7681] text-[10px] block uppercase">Current Merkle Block Anchor:</span>
                <ReferenceToken
                  type="hash"
                  raw={cert.blockHash}
                  label="Merkle Block Anchor Ref #1"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-[#D8D3C8] dark:border-[#2B3037] bg-[#F7F5F0] dark:bg-[#121417] flex items-center justify-between font-mono">
            <button
              onClick={handleCopySeal}
              className="px-3 py-1.5 rounded-sm bg-[#FFFFFF] dark:bg-[#181B1F] hover:bg-[#EFECE6] dark:hover:bg-[#1F2328] border border-[#D8D3C8] dark:border-[#2B3037] text-[#525860] dark:text-[#A2A8B0] hover:text-[#1A1D20] dark:hover:text-[#F0EEE9] text-[12px] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#165A34] dark:text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Seal Copied' : 'Copy Digital Seal'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-sm text-[12px] text-[#525860] dark:text-[#A2A8B0] hover:text-[#1A1D20] dark:hover:text-[#F0EEE9] cursor-pointer"
              >
                Close
              </button>

              <a
                href={`/calls/${cert.sessionId}/certificate`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-1.5 rounded-sm bg-[#1A1D20] dark:bg-[#F0EEE9] text-white dark:text-[#121417] font-semibold text-[12px] flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
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
