import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Download, FileText, ChevronDown, ChevronUp, Search, Printer, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import type { IncidentRecord } from '../../types/dashboard';
import { PrivacyMask } from '../common/PrivacyMask';
import { Tooltip } from '../common/Tooltip';

interface IncidentsPageProps {
  onViewCert: (session: { sessionId: string; prevHash: string; blockHash: string; score: number; verdict: string; timestamp: string }) => void;
}

// Configurable column sensitivity schema
export interface IncidentColumnConfig {
  key: string;
  label: string;
  sensitive: boolean;
}

export const incidentColumnConfigs: Record<string, IncidentColumnConfig> = {
  sessionId: { key: 'sessionId', label: 'Session ID', sensitive: true },
  callerHash: { key: 'callerHash', label: 'Caller Identity Hash', sensitive: true },
  triggerMechanism: { key: 'triggerMechanism', label: 'Trigger Mechanism', sensitive: true },
  blockHash: { key: 'blockHash', label: 'Merkle Block Hash', sensitive: true },
  riskClass: { key: 'riskClass', label: 'Risk Classification', sensitive: false },
  spoofProbability: { key: 'spoofProbability', label: 'Spoof Probability', sensitive: false },
  dispatchedAlerts: { key: 'dispatchedAlerts', label: 'Dispatched Alerts', sensitive: false },
};

const mockIncidents: IncidentRecord[] = [
  {
    id: 'inc-01',
    sessionId: 'call_948f2190',
    callerHash: '1a8e9903bc776d5421fa409e5124b77f12e8310d',
    riskClass: 'Critical Deepfake',
    spoofProbability: 0.942,
    voiceTrust: 18,
    triggerMechanism: 'Phase Splice & Neural Synthesis Artifacts',
    dispatchedAlerts: ['Twilio SMS (SOC Lead)', 'SMTP Alert Dossier', 'Trunk Auto-Quarantine'],
    timestamp: 'Sep 17, 2026 14:12:08 UTC',
    certAvailable: true,
    prevHash: '7f9e8a12bc44d019f8e23a4b9102c98d761234ef',
    blockHash: 'a0dd8af0cbec34fb6d2245d6acbbbc0305c8247a',
    verdict: 'ALERT',
    details: 'AASIST model detected phase discontinuities at 00:04.2 and absence of biological glottal pulses. TTS conversion model matched ElevenLabs Gen-2 voiceprint clone pattern.',
  },
  {
    id: 'inc-02',
    sessionId: 'call_88c021ea',
    callerHash: '9845d0124b893a771c504e76a0d2f939e65811aa',
    riskClass: 'Critical Deepfake',
    spoofProbability: 0.884,
    voiceTrust: 22,
    triggerMechanism: 'Dynamic Micro-Challenge Timeout (15s)',
    dispatchedAlerts: ['Twilio SMS', 'SMTP Mailer'],
    timestamp: 'Sep 17, 2026 13:45:32 UTC',
    certAvailable: true,
    prevHash: '6a60e190d4e794d310e825ce2fcbab8619b70ed3',
    blockHash: 'b45c22901aef9845d0124b893a771c504e76a0d2',
    verdict: 'ALERT',
    details: 'Caller failed conversational reflex challenge. Dynamic security digits "4 - 8 - 1 - 9" produced synthetic lag exceeding 680ms, indicating automated bot injection.',
  },
  {
    id: 'inc-03',
    sessionId: 'call_11f993d0',
    callerHash: '3f2199bba7890cd1234567890abcdef12345678',
    riskClass: 'Suspicious Jitter',
    spoofProbability: 0.528,
    voiceTrust: 48,
    triggerMechanism: 'Acoustic Telecom Resonance & Jitter Anomaly',
    dispatchedAlerts: ['Operator Warning Flag'],
    timestamp: 'Sep 17, 2026 11:20:19 UTC',
    certAvailable: true,
    prevHash: '8f4c2b901aef9845d0124b893a771c504e76a0d2',
    blockHash: 'c19e8803bc776d5421fa409e5124b77f12e8310d',
    verdict: 'WARN',
    details: 'Intermediate acoustic resonance detected on PSTN gateway. Dynamic challenge was issued and caller responded with acceptable voice consistency.',
  },
];

export const IncidentsPage: React.FC<IncidentsPageProps> = ({ onViewCert }) => {
  const [incidents] = useState<IncidentRecord[]>(mockIncidents);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterClass, setFilterClass] = useState<'All' | 'Critical Deepfake' | 'Suspicious Jitter'>('All');
  const [search, setSearch] = useState('');
  const [revealAll, setRevealAll] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const filtered = incidents.filter((inc) => {
    const matchesFilter = filterClass === 'All' || inc.riskClass === filterClass;
    const matchesSearch =
      inc.sessionId.toLowerCase().includes(search.toLowerCase()) ||
      inc.callerHash.toLowerCase().includes(search.toLowerCase()) ||
      inc.triggerMechanism.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const exportIncidentReport = (type: 'json' | 'txt') => {
    const dataStr =
      type === 'json'
        ? 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filtered, null, 2))
        : 'data:text/plain;charset=utf-8,' +
          encodeURIComponent(
            filtered
              .map(
                (i) =>
                  `SESSION: ${i.sessionId} | RISK: ${i.riskClass} | P(SPOOF): ${i.spoofProbability} | TIME: ${i.timestamp}\nHASH: ${i.blockHash}\nDETAILS: ${i.details}\n`
              )
              .join('\n---\n')
          );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `meikural_incidents_export.${type}`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.18 }}
      className="space-y-6 select-none"
    >
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[20px] font-semibold text-[#F2F4F5] tracking-tight">
              Security Incident Register & Forensics
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-[11px] font-mono font-medium shadow-[0_0_10px_rgba(239,68,68,0.15)]">
              <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
              {filtered.length} INCIDENTS LOGGED
            </span>
          </div>
          <p className="text-[13px] text-[#9BA3A8] mt-1">
            Tamper-evident cryptographically sealed acoustic anomaly log and alert dispatches
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportIncidentReport('json')}
            className="px-3 py-1.5 rounded-lg bg-[#141719] hover:bg-[#1E2225] border border-[#1E2225] text-[12px] text-[#9BA3A8] hover:text-[#F2F4F5] flex items-center gap-1.5 transition-all duration-150 active:scale-[0.97] hover:brightness-110 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Export JSON</span>
          </button>
          <button
            onClick={() => exportIncidentReport('txt')}
            className="px-3 py-1.5 rounded-lg bg-[#141719] hover:bg-[#1E2225] border border-[#1E2225] text-[12px] text-[#9BA3A8] hover:text-[#F2F4F5] flex items-center gap-1.5 transition-all duration-150 active:scale-[0.97] hover:brightness-110 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Export TXT</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 rounded-xl bg-[#0D0F11] border border-[#1E2225]">
        {/* Animated Filter Tabs using shared layoutId */}
        <div className="flex items-center gap-1 bg-[#050607] p-1 rounded-lg border border-[#1E2225]">
          {(['All', 'Critical Deepfake', 'Suspicious Jitter'] as const).map((c) => {
            const isActive = filterClass === c;
            return (
              <button
                key={c}
                onClick={() => setFilterClass(c)}
                className={`relative px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors duration-150 select-none cursor-pointer ${
                  isActive ? 'text-[#F2F4F5]' : 'text-[#9BA3A8] hover:text-[#F2F4F5]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="incidentFilterPill"
                    className="absolute inset-0 bg-[#1E2225] rounded-md shadow-sm"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{c}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-[#5E666B] absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Search session ID, hash, or trigger..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#050607] border border-[#1E2225] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-[#F2F4F5] placeholder:text-[#5E666B] focus:outline-none focus:border-[#FF4713] transition-colors"
            />
          </div>

          {/* Page-level Reveal All Privacy Toggle */}
          <Tooltip content={revealAll ? "Re-mask sensitive identifiers" : "Temporarily reveal all sensitive identifiers in this register"}>
            <button
              type="button"
              onClick={() => setRevealAll((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-[12px] font-medium flex items-center gap-1.5 transition-all duration-150 active:scale-[0.97] cursor-pointer whitespace-nowrap ${
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
              <span>{revealAll ? 'Mask All' : 'Reveal All'}</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-[#0D0F11] border border-[#1E2225] rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px] border-collapse">
            <thead className="bg-[#050607]/80 border-b border-[#1E2225] text-[11px] font-semibold text-[#5E666B] uppercase tracking-[0.08em]">
              <tr>
                <th className="py-3 px-4">Session ID</th>
                <th className="py-3 px-4">Risk Classification</th>
                <th className="py-3 px-4">Spoof Probability</th>
                <th className="py-3 px-4">Trigger Mechanism</th>
                <th className="py-3 px-4">Dispatched Alerts</th>
                <th className="py-3 px-4 text-right">Forensic Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2225]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#5E666B] font-mono text-[12px]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldCheck className="w-8 h-8 text-[#22C55E]/40 stroke-[1.5]" />
                      <span>No security incidents matching current filters</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((inc, index) => {
                  const isExpanded = expandedId === inc.id;
                  const isCritical = inc.riskClass === 'Critical Deepfake';
                  return (
                    <React.Fragment key={inc.id}>
                      <motion.tr
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18, delay: index * 0.03 }}
                        onClick={() => toggleExpand(inc.id)}
                        className="relative group hover:bg-[#14181D] transition-colors duration-150 cursor-pointer before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-[#FF4713] before:scale-y-0 hover:before:scale-y-100 before:transition-transform before:duration-150 before:origin-top"
                      >
                        {/* Masked Session ID */}
                        <td className="py-3.5 px-4 font-mono font-medium text-[#F2F4F5]">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-[#9BA3A8]" strokeWidth={1.75} />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[#9BA3A8]" strokeWidth={1.75} />
                            )}
                            <PrivacyMask
                              value={inc.sessionId}
                              label="Incident Session ID"
                              sensitive={incidentColumnConfigs.sessionId.sensitive}
                              alwaysRevealed={revealAll}
                              staggerIndex={index}
                              showEyeButton={true}
                              copyable={true}
                              className="text-[#FF4713] font-semibold"
                            />
                          </div>
                          <span className="text-[10.5px] font-mono text-[#5E666B] block ml-5 mt-0.5">
                            {inc.timestamp}
                          </span>
                        </td>

                        {/* Risk Classification with subtle 2.5s pulse glow on ALERT/Critical */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-transform duration-150 group-hover:scale-[1.03] ${
                              isCritical
                                ? 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444] shadow-[0_0_12px_rgba(239,68,68,0.18)] animate-[pulse_2.5s_cubic-bezier(0.4,0,0.6,1)_infinite]'
                                : 'bg-[#F59E0B]/15 border-[#F59E0B]/30 text-[#F59E0B]'
                            }`}
                          >
                            <ShieldAlert className="w-3 h-3" strokeWidth={1.75} />
                            <span>{inc.riskClass}</span>
                          </span>
                        </td>

                        {/* Spoof Probability */}
                        <td className="py-3.5 px-4 font-mono text-[#EF4444] font-semibold">
                          {(inc.spoofProbability * 100).toFixed(1)}% (P: {inc.spoofProbability.toFixed(3)})
                        </td>

                        {/* Trigger Mechanism (Configurable sensitive column) */}
                        <td className="py-3.5 px-4 text-[#9BA3A8] max-w-xs">
                          <PrivacyMask
                            value={inc.triggerMechanism}
                            label="Trigger Mechanism"
                            sensitive={incidentColumnConfigs.triggerMechanism.sensitive}
                            alwaysRevealed={revealAll}
                            staggerIndex={index}
                            showEyeButton={false}
                            className="text-[11.5px] truncate block"
                          />
                        </td>

                        {/* Dispatched Alerts */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {inc.dispatchedAlerts.map((a, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#141719] border border-[#1E2225] text-[#9BA3A8]"
                              >
                                {a}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                onViewCert({
                                  sessionId: inc.sessionId,
                                  prevHash: inc.prevHash,
                                  blockHash: inc.blockHash,
                                  score: inc.spoofProbability,
                                  verdict: inc.verdict,
                                  timestamp: inc.timestamp,
                                })
                              }
                              className="px-3 py-1 rounded-lg bg-[#141719] hover:bg-[#1E2225] border border-[#1E2225] hover:border-[#FF4713]/40 text-[#F2F4F5] text-[11.5px] font-medium flex items-center gap-1.5 transition-all duration-150 active:scale-[0.97] hover:brightness-110 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#FF4713]" strokeWidth={1.75} />
                              <span>View Cert</span>
                            </button>
                            <Tooltip content="Open Official Printable PDF">
                              <a
                                href={`http://127.0.0.1:8000/calls/${inc.sessionId}/certificate`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg text-[#9BA3A8] hover:text-[#F2F4F5] hover:bg-[#1E2225] transition-all duration-150 active:scale-[0.97] hover:brightness-110 flex items-center justify-center"
                              >
                                <Printer className="w-3.5 h-3.5" strokeWidth={1.75} />
                              </a>
                            </Tooltip>
                          </div>
                        </td>
                      </motion.tr>

                      {/* Expandable Forensic Acoustic Details */}
                      {isExpanded && (
                        <tr className="bg-[#050607]/90 border-b border-[#1E2225]">
                          <td colSpan={6} className="p-4 pl-11 text-[11.5px] font-mono space-y-2">
                            <div className="p-3.5 rounded-xl bg-[#0D0F11] border border-[#1E2225] space-y-2.5">
                              <div className="text-[#F2F4F5] font-semibold flex items-center gap-2">
                                <span>Forensic Acoustic Breakdown:</span>
                              </div>
                              <p className="text-[#9BA3A8] font-sans text-[12.5px] leading-relaxed">
                                {inc.details}
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2.5 border-t border-[#1E2225] text-[11px]">
                                <div className="space-y-1">
                                  <span className="text-[#5E666B] block text-[10px] uppercase">Salted Caller Hash:</span>
                                  <PrivacyMask
                                    value={inc.callerHash}
                                    label="Caller Hash"
                                    sensitive={incidentColumnConfigs.callerHash.sensitive}
                                    alwaysRevealed={revealAll}
                                    showEyeButton={true}
                                    copyable={true}
                                    className="text-[#9BA3A8]"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[#5E666B] block text-[10px] uppercase">Merkle Block Hash:</span>
                                  <PrivacyMask
                                    value={inc.blockHash}
                                    label="Merkle Block Hash"
                                    sensitive={incidentColumnConfigs.blockHash.sensitive}
                                    alwaysRevealed={revealAll}
                                    showEyeButton={true}
                                    copyable={true}
                                    className="text-[#22C55E]"
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
