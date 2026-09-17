import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Download, FileText, ChevronDown, ChevronUp, Search, Printer } from 'lucide-react';
import type { IncidentRecord } from '../../types/dashboard';

interface IncidentsPageProps {
  onViewCert: (session: { sessionId: string; prevHash: string; blockHash: string; score: number; verdict: string; timestamp: string }) => void;
}

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
      className="space-y-6 select-none"
    >
      {/* Title & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-[#F2F4F5] tracking-tight">
            Security Incidents & Deepfake Interceptions
          </h1>
          <p className="text-[12px] text-[#9BA3A8] mt-1">
            Complete dossier of high-risk voice clone attacks, step-up verifications, and alert logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportIncidentReport('json')}
            className="px-3 py-1.5 rounded-lg bg-[#141719] hover:bg-[#1E2225] border border-[#1E2225] text-[12px] text-[#9BA3A8] hover:text-[#F2F4F5] flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={() => exportIncidentReport('txt')}
            className="px-3 py-1.5 rounded-lg bg-[#FF4713] hover:bg-[#FF4713]/90 text-white font-medium text-[12px] flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,71,19,0.25)] transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export Incident Report</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-[#0D0F11] border border-[#1E2225]">
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          {(['All', 'Critical Deepfake', 'Suspicious Jitter'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFilterClass(c)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                filterClass === c
                  ? 'bg-[#1E2225] text-[#F2F4F5] border border-[#1E2225] shadow-sm'
                  : 'text-[#9BA3A8] hover:text-[#F2F4F5]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-[#5E666B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search session ID, hash, or trigger..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#050607] border border-[#1E2225] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-[#F2F4F5] placeholder:text-[#5E666B] focus:outline-none focus:border-[#FF4713]"
          />
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-[#0D0F11] border border-[#1E2225] rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead className="bg-[#050607]/80 border-b border-[#1E2225] text-[10.5px] font-mono uppercase tracking-wider text-[#5E666B]">
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
              {filtered.map((inc) => {
                const isExpanded = expandedId === inc.id;
                return (
                  <React.Fragment key={inc.id}>
                    <tr
                      onClick={() => toggleExpand(inc.id)}
                      className="hover:bg-[#141719]/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-[#F2F4F5]">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-[#9BA3A8]" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-[#9BA3A8]" />
                          )}
                          <span className="text-[#FF4713]">{inc.sessionId}</span>
                        </div>
                        <span className="text-[10.5px] font-mono text-[#5E666B] block ml-5">
                          {inc.timestamp}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            inc.riskClass === 'Critical Deepfake'
                              ? 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]'
                              : 'bg-[#F59E0B]/15 border-[#F59E0B]/30 text-[#F59E0B]'
                          }`}
                        >
                          <ShieldAlert className="w-3 h-3" />
                          {inc.riskClass}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#EF4444] font-semibold">
                        {(inc.spoofProbability * 100).toFixed(1)}% (P: {inc.spoofProbability.toFixed(3)})
                      </td>

                      <td className="py-3.5 px-4 text-[#9BA3A8] max-w-xs truncate">
                        {inc.triggerMechanism}
                      </td>

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
                            className="px-3 py-1 rounded bg-[#141719] hover:bg-[#1E2225] border border-[#1E2225] hover:border-[#FF4713]/40 text-[#F2F4F5] text-[11.5px] font-medium flex items-center gap-1.5 transition-all"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#FF4713]" />
                            View Cert
                          </button>
                          <a
                            href={`http://127.0.0.1:8000/calls/${inc.sessionId}/certificate`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded text-[#9BA3A8] hover:text-[#F2F4F5] hover:bg-[#1E2225]"
                            title="Open Official Printable Certificate"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Detection Details */}
                    {isExpanded && (
                      <tr className="bg-[#050607]/90 border-b border-[#1E2225]">
                        <td colSpan={6} className="p-4 pl-11 text-[11.5px] font-mono space-y-2">
                          <div className="p-3 rounded-lg bg-[#0D0F11] border border-[#1E2225] space-y-2">
                            <div className="text-[#F2F4F5] font-semibold flex items-center gap-2">
                              <span>Forensic Acoustic Breakdown:</span>
                            </div>
                            <p className="text-[#9BA3A8] font-sans text-[12px] leading-relaxed">
                              {inc.details}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-[#1E2225] text-[10.5px]">
                              <div>
                                <span className="text-[#5E666B]">Salted Caller Hash: </span>
                                <span className="text-[#9BA3A8]">{inc.callerHash}</span>
                              </div>
                              <div>
                                <span className="text-[#5E666B]">Merkle Block Hash: </span>
                                <span className="text-[#22C55E]">{inc.blockHash}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
