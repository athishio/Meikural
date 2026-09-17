import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radio, AlertOctagon, ExternalLink, Search, RefreshCw, Eye, EyeOff, PhoneCall } from 'lucide-react';
import type { TrunkSession } from '../../types/dashboard';
import { PrivacyMask } from '../common/PrivacyMask';
import { Tooltip } from '../common/Tooltip';

interface ActiveCallsPageProps {
  onSelectSession: (sessionId: string) => void;
  onInspectSession: (sessionId: string) => void;
  onIsolateTrunk: (sessionId: string) => void;
  isOffline?: boolean;
}

const mockTrunks: TrunkSession[] = [
  {
    id: 'trk-01',
    gateway: 'SIP Trunk 16kHz Ingest Node #1',
    sessionId: 'call_02db11a4',
    callerHash: '7f9e8a12bc44d019f8e23a4b9102c98d761234ef',
    startTime: Date.now() - 48000,
    durationSeconds: 48,
    voiceTrust: 88,
    channelState: 'Streaming',
    isIsolated: false,
    codec: 'G.711u / PCM',
  },
  {
    id: 'trk-02',
    gateway: 'Genesys SIP Interconnect Primary',
    sessionId: 'call_948f2190',
    callerHash: '1a8e9903bc776d5421fa409e5124b77f12e8310d',
    startTime: Date.now() - 114000,
    durationSeconds: 114,
    voiceTrust: 18,
    channelState: 'Isolated',
    isIsolated: true,
    codec: 'AMR-WB 16k',
  },
  {
    id: 'trk-03',
    gateway: 'Twilio Media Stream WebSocket Ingest',
    sessionId: 'call_33e082ba',
    callerHash: '8b4d00129fca554e120d998234ab120938491029',
    startTime: Date.now() - 25000,
    durationSeconds: 25,
    voiceTrust: 94,
    channelState: 'Streaming',
    isIsolated: false,
    codec: 'Opus 24k',
  },
  {
    id: 'trk-04',
    gateway: 'Avaya Edge Session Border Controller',
    sessionId: 'call_77c129ab',
    callerHash: '3f2199bba7890cd1234567890abcdef12345678',
    startTime: Date.now() - 72000,
    durationSeconds: 72,
    voiceTrust: 52,
    channelState: 'Streaming',
    isIsolated: false,
    codec: 'G.711a / PCM',
  },
];

export const ActiveCallsPage: React.FC<ActiveCallsPageProps> = ({
  onSelectSession,
  onInspectSession,
  onIsolateTrunk,
  isOffline = false,
}) => {
  const [trunks, setTrunks] = useState<TrunkSession[]>(mockTrunks);
  const [search, setSearch] = useState('');
  const [revealAll, setRevealAll] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live-ticking durations
  useEffect(() => {
    const interval = setInterval(() => {
      setTrunks((prev) =>
        prev.map((t) =>
          t.channelState === 'Streaming'
            ? { ...t, durationSeconds: Math.floor((Date.now() - t.startTime) / 1000) }
            : t
        )
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleIsolate = (sessionId: string) => {
    setTrunks((prev) =>
      prev.map((t) =>
        t.sessionId === sessionId
          ? { ...t, channelState: 'Isolated', isIsolated: true }
          : t
      )
    );
    onIsolateTrunk(sessionId);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const activeCount = trunks.filter((t) => t.channelState === 'Streaming').length;

  const filtered = trunks.filter(
    (t) =>
      t.sessionId.toLowerCase().includes(search.toLowerCase()) ||
      t.callerHash.toLowerCase().includes(search.toLowerCase()) ||
      t.gateway.toLowerCase().includes(search.toLowerCase())
  );

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.18 }}
      className="space-y-6 select-none"
    >
      {/* Page Title & Header Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[20px] font-semibold text-[#F2F4F5] tracking-tight">Active Telephony Trunks</h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-[11px] font-mono font-medium shadow-[0_0_10px_rgba(34,197,94,0.15)]">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              {activeCount} TRUNKS ACTIVE
            </span>
          </div>
          <p className="text-[13px] text-[#9BA3A8] mt-1">
            Real-time SIP/WebRTC audio streams currently undergoing sub-second neural inference
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="px-3 py-1.5 rounded-lg bg-[#141719] hover:bg-[#1E2225] border border-[#1E2225] text-[12px] text-[#9BA3A8] hover:text-[#F2F4F5] flex items-center gap-1.5 transition-all duration-150 active:scale-[0.97] hover:brightness-110 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#FF4713]' : ''}`} strokeWidth={1.75} />
          <span>Refresh Trunks</span>
        </button>
      </div>

      {/* Filter & Privacy Control Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#0D0F11] border border-[#1E2225]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#5E666B] absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search by session ID, caller hash, or gateway..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#050607] border border-[#1E2225] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-[#F2F4F5] placeholder:text-[#5E666B] focus:outline-none focus:border-[#FF4713] transition-colors"
          />
        </div>

        {/* Page-level Reveal All Privacy Toggle */}
        <div className="flex items-center gap-2">
          <Tooltip content={revealAll ? "Re-mask sensitive identifiers in this table" : "Temporarily reveal all sensitive identifiers in this table"}>
            <button
              type="button"
              onClick={() => setRevealAll((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-[12px] font-medium flex items-center gap-1.5 transition-all duration-150 active:scale-[0.97] cursor-pointer ${
                revealAll
                  ? 'bg-[#FF4713]/15 border-[#FF4713]/40 text-[#FF4713] shadow-[0_0_12px_rgba(255,71,19,0.18)]'
                  : 'bg-[#141719] hover:bg-[#1E2225] border-[#1E2225] text-[#9BA3A8] hover:text-[#F2F4F5]'
              }`}
            >
              {revealAll ? (
                <EyeOff className="w-3.5 h-3.5 text-[#FF4713]" strokeWidth={1.75} />
              ) : (
                <Eye className="w-3.5 h-3.5 text-[#9BA3A8]" strokeWidth={1.75} />
              )}
              <span>{revealAll ? 'Mask Identifiers' : 'Reveal All'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-[#5E666B]">
                {filtered.length}
              </span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Table of Live SIP Sessions */}
      <div className="bg-[#0D0F11] border border-[#1E2225] rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px] border-collapse">
            <thead className="bg-[#050607]/80 border-b border-[#1E2225] text-[11px] font-semibold text-[#5E666B] uppercase tracking-[0.08em]">
              <tr>
                <th className="py-3 px-4">Gateway / Trunk</th>
                <th className="py-3 px-4">Session ID</th>
                <th className="py-3 px-4">Caller Identity (Salted)</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Voice Trust</th>
                <th className="py-3 px-4">Channel State</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2225] font-normal">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#5E666B] font-mono text-[12px]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <PhoneCall className="w-8 h-8 text-[#5E666B]/50 stroke-[1.5]" />
                      <span>No matching active telephony trunks found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((trunk, index) => {
                  const isIsolated = trunk.channelState === 'Isolated';
                  return (
                    <motion.tr
                      key={trunk.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: index * 0.03 }}
                      className="relative group hover:bg-[#14181D] transition-colors duration-150 cursor-default before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-[#FF4713] before:scale-y-0 hover:before:scale-y-100 before:transition-transform before:duration-150 before:origin-top"
                    >
                      {/* Gateway */}
                      <td className="py-3.5 px-4 font-medium text-[#F2F4F5]">
                        <div className="flex items-center gap-2">
                          <Radio
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isIsolated ? 'text-[#EF4444]' : 'text-[#22C55E]'
                            }`}
                            strokeWidth={1.75}
                          />
                          <span className="font-sans font-medium">{trunk.gateway}</span>
                        </div>
                        <span className="text-[10.5px] font-mono text-[#5E666B] block ml-5">
                          {trunk.codec}
                        </span>
                      </td>

                      {/* Masked Session ID */}
                      <td className="py-3.5 px-4 font-mono">
                        <PrivacyMask
                          value={trunk.sessionId}
                          label="Session ID"
                          alwaysRevealed={revealAll}
                          staggerIndex={index}
                          showEyeButton={true}
                          copyable={true}
                        >
                          {(val) => (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectSession(trunk.sessionId);
                              }}
                              title="Scope Overview to this session"
                              className="inline-flex items-center gap-1 text-[#FF4713] hover:underline font-semibold"
                            >
                              <span>{val}</span>
                              <ExternalLink className="w-3 h-3 text-[#FF4713]" strokeWidth={1.75} />
                            </button>
                          )}
                        </PrivacyMask>
                      </td>

                      {/* Masked Caller Hash */}
                      <td className="py-3.5 px-4 font-mono">
                        <PrivacyMask
                          value={trunk.callerHash}
                          label="Caller Hash"
                          alwaysRevealed={revealAll}
                          staggerIndex={index}
                          showEyeButton={true}
                          copyable={true}
                          className="max-w-[190px] truncate text-[#9BA3A8]"
                        />
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4 font-mono text-[#F2F4F5]">
                        {formatDuration(trunk.durationSeconds)}
                      </td>

                      {/* Voice Trust */}
                      <td className="py-3.5 px-4 font-mono">
                        <span
                          className={`font-semibold ${
                            trunk.voiceTrust < 40
                              ? 'text-[#EF4444]'
                              : trunk.voiceTrust < 70
                              ? 'text-[#F59E0B]'
                              : 'text-[#22C55E]'
                          }`}
                        >
                          {trunk.voiceTrust}/100
                        </span>
                      </td>

                      {/* Channel State */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-transform duration-150 group-hover:scale-[1.03] ${
                            isIsolated
                              ? 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444] shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                              : 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E] shadow-[0_0_10px_rgba(34,197,94,0.15)]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isIsolated ? 'bg-[#EF4444]' : 'bg-[#22C55E] animate-pulse'
                            }`}
                          />
                          {trunk.channelState}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onInspectSession(trunk.sessionId)}
                            className="px-2.5 py-1 rounded-lg bg-[#141719] hover:bg-[#1E2225] border border-[#1E2225] text-[#F2F4F5] text-[11.5px] font-medium flex items-center gap-1.5 transition-all duration-150 active:scale-[0.97] hover:brightness-110 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#9BA3A8]" strokeWidth={1.75} />
                            <span>Inspect</span>
                          </button>

                          {!isIsolated && (
                            <button
                              disabled={isOffline}
                              title={isOffline ? 'Unavailable — backend disconnected' : 'Isolate active SIP media trunk'}
                              onClick={() => handleIsolate(trunk.sessionId)}
                              className={`px-2.5 py-1 rounded-lg border text-[11.5px] font-medium flex items-center gap-1.5 transition-all duration-150 active:scale-[0.97] hover:brightness-110 cursor-pointer ${
                                isOffline
                                  ? 'opacity-40 cursor-not-allowed bg-[#EF4444]/5 border-[#EF4444]/15 text-[#EF4444]/40'
                                  : 'bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border-[#EF4444]/35 text-[#EF4444] shadow-[0_0_10px_rgba(239,68,68,0.12)]'
                              }`}
                            >
                              <AlertOctagon className="w-3.5 h-3.5" strokeWidth={1.75} />
                              <span>Isolate</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
