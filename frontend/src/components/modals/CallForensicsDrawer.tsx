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
          className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        />

        {/* Slide-over panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-2xl bg-[#FFFFFF] dark:bg-[#181B1F] border-l border-[#D8D3C8] dark:border-[#2B3037] shadow-2xl flex flex-col h-full z-10 text-[#1A1D20] dark:text-[#F0EEE9] font-sans"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#D8D3C8] dark:border-[#2B3037] flex items-center justify-between bg-[#F7F5F0] dark:bg-[#121417]">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#1A1D20] dark:text-[#F0EEE9]" />
                <h2 className="text-[15px] font-bold font-mono tracking-tight">Call Forensics Ledger</h2>
                <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold bg-[#EFECE6] dark:bg-[#242930] text-[#1A1D20] dark:text-[#F0EEE9] border border-[#D8D3C8] dark:border-[#2B3037]">
                  {sessionId}
                </span>
              </div>
              <p className="text-[11px] text-[#525860] dark:text-[#A2A8B0] mt-1">
                Granular chunk telemetry logs & appendable SHA-256 hash-chain verification
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-sm bg-[#FFFFFF] dark:bg-[#181B1F] hover:bg-[#EFECE6] dark:hover:bg-[#1F2328] border border-[#D8D3C8] dark:border-[#2B3037] text-[#525860] dark:text-[#A2A8B0] hover:text-[#1A1D20] dark:hover:text-[#F0EEE9] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Verification Badge Bar */}
          <div className="p-4 bg-[#FAF9F5] dark:bg-[#15171A] border-b border-[#D8D3C8] dark:border-[#2B3037] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#165A34] dark:text-[#34D399]" />
              <span className="text-[12px] font-medium">Cryptographic Hash-Chain Integrity:</span>
            </div>
            {verifyResult ? (
              <span
                className={`text-[11px] font-mono px-2.5 py-0.5 rounded-sm border font-semibold ${
                  verifyResult.valid
                    ? 'bg-[#EAF5EE] dark:bg-[#0E2316] border-[#9CD1B2] dark:border-[#1B5233] text-[#165A34] dark:text-[#34D399]'
                    : 'bg-[#FDEFEF] dark:bg-[#2B0F0F] border-[#E79E9E] dark:border-[#5E1A1A] text-[#941818] dark:text-[#F87171]'
                }`}
              >
                {verifyResult.valid
                  ? `${verifyResult.total_events} Chunks Verified (100% Intact)`
                  : `Broken at Chunk #${verifyResult.broken_index}`}
              </span>
            ) : (
              <span className="text-[11px] font-mono text-[#525860] dark:text-[#A2A8B0]">Checking chain...</span>
            )}
          </div>

          {/* Body: Events list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mb-3" />
                <span className="text-[12px] text-[#525860] dark:text-[#A2A8B0] font-mono">Loading telemetry logs for {sessionId}...</span>
              </div>
            ) : events.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-[#525860] dark:text-[#A2A8B0]">
                <Hash className="w-8 h-8 text-[#78808A] dark:text-[#6E7681] mb-2" />
                <p className="text-[13px] font-medium text-[#1A1D20] dark:text-[#F0EEE9]">No telemetry chunks recorded yet</p>
                <p className="text-[11px] max-w-sm mt-1">
                  This session has been registered. Telemetry chunks will stream here as audio frames are evaluated.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#78808A] dark:text-[#6E7681] uppercase tracking-wider pb-1 border-b border-[#D8D3C8] dark:border-[#2B3037]">
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
                      className="p-3 rounded-sm bg-[#F7F5F0] dark:bg-[#121417] border border-[#D8D3C8] dark:border-[#2B3037] flex flex-col gap-2 transition-colors"
                    >
                      <div className="flex items-center justify-between text-[12px]">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="px-1.5 py-0.5 rounded-sm bg-[#FFFFFF] dark:bg-[#181B1F] border border-[#D8D3C8] dark:border-[#2B3037] text-[#525860] dark:text-[#A2A8B0] text-[10px]">
                            #{index + 1}
                          </span>
                          <span className="text-[#1A1D20] dark:text-[#F0EEE9] font-semibold">
                            Risk: {riskPercent}%
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded-sm text-[10px] font-bold border ${
                              isHighRisk
                                ? 'bg-[#FDEFEF] dark:bg-[#2B0F0F] border-[#E79E9E] dark:border-[#5E1A1A] text-[#941818] dark:text-[#F87171]'
                                : isMedRisk
                                ? 'bg-[#FDF6E8] dark:bg-[#291B06] border-[#E5BA78] dark:border-[#5C3E08] text-[#924A00] dark:text-[#FBBF24]'
                                : 'bg-[#EAF5EE] dark:bg-[#0E2316] border-[#9CD1B2] dark:border-[#1B5233] text-[#165A34] dark:text-[#34D399]'
                            }`}
                          >
                            {ev.verdict}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[#78808A] dark:text-[#6E7681]">
                          {new Date(ev.timestamp * 1000).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Smooth Score Bar */}
                      <div className="w-full bg-[#EFECE6] dark:bg-[#1F2328] h-1.5 rounded-sm overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isHighRisk ? 'bg-[#941818] dark:bg-[#F87171]' : isMedRisk ? 'bg-[#924A00] dark:bg-[#FBBF24]' : 'bg-[#165A34] dark:bg-[#34D399]'
                          }`}
                          style={{ width: `${Math.max(4, riskPercent)}%` }}
                        />
                      </div>

                      {/* Cryptographic hash chain link */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#525860] dark:text-[#A2A8B0] pt-1">
                        <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                          <span className="text-[#78808A] dark:text-[#6E7681]">SHA-256:</span>
                          <span className="truncate font-mono">{ev.record_hash}</span>
                        </div>
                        <button
                          onClick={() => handleCopy(ev.record_hash)}
                          className="p-1 hover:text-[#1A1D20] dark:hover:text-[#F0EEE9] transition-colors cursor-pointer"
                          title="Copy block hash"
                        >
                          {copiedHash === ev.record_hash ? (
                            <Check className="w-3 h-3 text-[#165A34] dark:text-[#34D399]" />
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
          <div className="p-4 border-t border-[#D8D3C8] dark:border-[#2B3037] bg-[#F7F5F0] dark:bg-[#121417] flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <a
                href={'/calls/' + sessionId + '/report'}
                download
                className="px-3 py-1.5 rounded-sm bg-[#FFFFFF] dark:bg-[#181B1F] hover:bg-[#EFECE6] dark:hover:bg-[#1F2328] border border-[#D8D3C8] dark:border-[#2B3037] text-[#1A1D20] dark:text-[#F0EEE9] text-[12px] font-medium flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-[#525860] dark:text-[#A2A8B0]" />
                <span>Download Report</span>
              </a>

              <a
                href={'/calls/' + sessionId + '/certificate'}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-sm bg-[#FFFFFF] dark:bg-[#181B1F] hover:bg-[#EFECE6] dark:hover:bg-[#1F2328] border border-[#D8D3C8] dark:border-[#2B3037] text-[#1A1D20] dark:text-[#F0EEE9] text-[12px] font-medium flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-[#165A34] dark:text-[#34D399]" />
                <span>Certificate</span>
              </a>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-sm bg-[#1A1D20] dark:bg-[#F0EEE9] text-white dark:text-[#121417] text-[12px] font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
