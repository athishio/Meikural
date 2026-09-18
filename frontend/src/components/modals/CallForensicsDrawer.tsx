import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, FileText, Printer, Copy, Check, Hash, Activity } from 'lucide-react';

interface CallForensicsDrawerProps {
  sessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface EventItem {
  event_id: number;
  session_id: string;
  timestamp: number;
  score: number;
  smoothed_score: number;
  verdict: string;
  challenge_id?: string;
  prev_hash: string;
  record_hash: string;
}

interface VerifyResult {
  session_id: string;
  valid: boolean;
  total_events: number;
  broken_index?: number | null;
  algorithm: string;
}

export const CallForensicsDrawer: React.FC<CallForensicsDrawerProps> = ({
  sessionId,
  isOpen,
  onClose,
}) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !isOpen) return;

    setLoading(true);
    // Fetch call events and verification
    Promise.all([
      fetch('/calls/' + sessionId + '/events').then((r) => (r.ok ? r.json() : [])),
      fetch('/calls/' + sessionId + '/verify').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([evData, verData]) => {
        setEvents(Array.isArray(evData) ? evData : []);
        setVerifyResult(verData);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [sessionId, isOpen]);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  if (!isOpen || !sessionId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Slide-over panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-2xl bg-[#0D0F11] border-l border-[#1E2225] shadow-2xl flex flex-col h-full z-10 text-[#F2F4F5]"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#1E2225] flex items-center justify-between bg-[#07090D]">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#FF4713]" />
                <h2 className="text-[16px] font-bold tracking-tight">Call Forensics Ledger</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF4713]/15 text-[#FF4713] border border-[#FF4713]/30">
                  {sessionId}
                </span>
              </div>
              <p className="text-[11px] text-[#9BA3A8] mt-1">
                Granular chunk telemetry logs & appendable SHA-256 hash-chain verification
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#141719] hover:bg-[#1E2225] text-[#9BA3A8] hover:text-[#F2F4F5] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Verification Badge Bar */}
          <div className="p-4 bg-[#141719]/60 border-b border-[#1E2225] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
              <span className="text-[12px] font-medium">Cryptographic Hash-Chain Integrity:</span>
            </div>
            {verifyResult ? (
              <span
                className={`text-[11px] font-mono px-2.5 py-0.5 rounded border font-semibold ${
                  verifyResult.valid
                    ? 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]'
                    : 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]'
                }`}
              >
                {verifyResult.valid
                  ? `${verifyResult.total_events} Chunks Verified (100% Intact)`
                  : `Broken at Chunk #${verifyResult.broken_index}`}
              </span>
            ) : (
              <span className="text-[11px] font-mono text-[#9BA3A8]">Checking chain...</span>
            )}
          </div>

          {/* Body: Events list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-6 h-6 border-2 border-[#FF4713] border-t-transparent rounded-full animate-spin mb-3" />
                <span className="text-[12px] text-[#9BA3A8] font-mono">Loading telemetry logs for {sessionId}...</span>
              </div>
            ) : events.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-[#9BA3A8]">
                <Hash className="w-8 h-8 text-[#5E666B] mb-2" />
                <p className="text-[13px] font-medium text-[#F2F4F5]">No telemetry chunks recorded yet</p>
                <p className="text-[11px] max-w-sm mt-1">
                  This session has been registered. Telemetry chunks will stream here as audio frames are evaluated.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#5E666B] uppercase tracking-wider pb-1 border-b border-[#1E2225]">
                  <span>Chronological Chunk Telemetry ({events.length} logs)</span>
                  <span>SHA-256 Hash Chain</span>
                </div>

                {events.map((ev, index) => {
                  const riskPercent = Math.round(ev.score * 100);
                  const isHighRisk = ev.score >= 0.65;
                  const isMedRisk = ev.score >= 0.35 && ev.score < 0.65;

                  return (
                    <div
                      key={ev.event_id || index}
                      className="p-3 rounded-lg bg-[#07090D] border border-[#1E2225] hover:border-[#2A2F33] transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-[12px]">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-[#141719] text-[#9BA3A8] text-[10px]">
                            #{index + 1}
                          </span>
                          <span className="text-[#F2F4F5] font-semibold">
                            Risk: {riskPercent}%
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${
                              isHighRisk
                                ? 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]'
                                : isMedRisk
                                ? 'bg-[#F59E0B]/15 border-[#F59E0B]/30 text-[#F59E0B]'
                                : 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]'
                            }`}
                          >
                            {ev.verdict}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[#5E666B]">
                          {new Date(ev.timestamp * 1000).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Smooth Score Bar */}
                      <div className="w-full bg-[#1E2225] h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isHighRisk ? 'bg-[#EF4444]' : isMedRisk ? 'bg-[#F59E0B]' : 'bg-[#22C55E]'
                          }`}
                          style={{ width: `${Math.max(4, riskPercent)}%` }}
                        />
                      </div>

                      {/* Cryptographic hash chain link */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#9BA3A8] pt-1">
                        <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                          <span className="text-[#5E666B]">SHA-256:</span>
                          <span className="truncate font-mono text-[#9BA3A8]">{ev.record_hash}</span>
                        </div>
                        <button
                          onClick={() => handleCopy(ev.record_hash)}
                          className="p-1 hover:text-[#F2F4F5] transition-colors"
                          title="Copy block hash"
                        >
                          {copiedHash === ev.record_hash ? (
                            <Check className="w-3 h-3 text-[#22C55E]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-[#1E2225] bg-[#07090D] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <a
                href={'/calls/' + sessionId + '/report'}
                download
                className="px-3 py-1.5 rounded-lg bg-[#141719] hover:bg-[#1E2225] border border-[#1E2225] text-[#F2F4F5] text-[12px] font-medium flex items-center gap-1.5 transition-all"
              >
                <FileText className="w-3.5 h-3.5 text-[#FF4713]" />
                <span>Download Report</span>
              </a>

              <a
                href={'/calls/' + sessionId + '/certificate'}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[#141719] hover:bg-[#1E2225] border border-[#1E2225] text-[#F2F4F5] text-[12px] font-medium flex items-center gap-1.5 transition-all"
              >
                <Printer className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>Certificate</span>
              </a>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#1E2225] hover:bg-[#2A2F33] text-[#F2F4F5] text-[12px] font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
