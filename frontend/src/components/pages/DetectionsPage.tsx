import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Play, Pause, ShieldAlert, ShieldCheck, HelpCircle, RefreshCw } from 'lucide-react';
import type { RecentAnalysis } from '../../types/dashboard';

interface DetectionsPageProps {
  onSelectDetection: (item: RecentAnalysis) => void;
}

export const DetectionsPage: React.FC<DetectionsPageProps> = ({ onSelectDetection }) => {
  const [detections, setDetections] = useState<RecentAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | 'Deepfake' | 'Authentic' | 'Uncertain'>('All');
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/calls?limit=100');
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          const mapped: RecentAnalysis[] = data.map((c: any) => {
            const risk = c.final_risk_score ?? 0;
            const isFake = c.final_verdict === 'STEP_UP_VERIFICATION' || risk > 0.5;
            const isWarn = c.final_verdict === 'WARN' || (risk >= 0.35 && risk <= 0.5);
            const result: 'Authentic' | 'Deepfake' | 'Uncertain' = isFake ? 'Deepfake' : isWarn ? 'Uncertain' : 'Authentic';
            const riskScore = Math.round(risk * 100);
            const dateStr = c.start_time ? new Date(c.start_time * 1000).toLocaleString() : 'In Progress';
            const channel = c.session_id.startsWith('batch_')
              ? 'Batch Audio Ingest'
              : c.session_id.startsWith('call_')
              ? 'SIP Trunk Telephony'
              : 'Live Voice Stream';
            return {
              id: c.session_id,
              sessionId: c.session_id,
              fileName: `Session ${c.session_id}`,
              title: `Forensic Audio Session ${c.session_id}`,
              time: dateStr,
              timestamp: dateStr,
              riskScore,
              result,
              status: result,
              confidence: Math.round(Math.max(risk, 1 - risk) * 1000) / 10,
              channel,
            };
          });
          setDetections(mapped);
        }
      }
    } catch (e) {
      console.error('Failed to fetch call detections:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const exportLedgerCsv = () => {
    const headers = ['Session ID', 'Timestamp', 'Risk Score (%)', 'Verdict', 'Confidence (%)', 'Channel'];
    const rows = detections.map((d) => [
      d.sessionId || d.id,
      d.timestamp || d.time,
      d.riskScore ?? 0,
      d.result || d.status,
      d.confidence ?? 0,
      d.channel || 'Standard Ingest',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `meikural_detection_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = detections.filter((item) => {
    const itemResult = item.result || item.status;
    const itemTitle = item.title || item.fileName;
    const matchesFilter = filter === 'All' || itemResult === filter;
    const matchesSearch =
      itemTitle.toLowerCase().includes(search.toLowerCase()) ||
      (item.channel?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      item.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const togglePlay = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlayingId((prev) => (prev === id ? null : id));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-20 font-bold text-text-primary tracking-tight">Forensic Detection Registry</h1>
          <p className="text-12 text-text-muted mt-0.5">
            Complete cryptographic audit trail of all real-time voice streams and uploaded recordings
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCalls}
            className="p-2 rounded-lg bg-surface-ground border border-card-border hover:border-card-border-hover text-text-muted hover:text-text-primary transition-all"
            title="Refresh Detection Registry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportLedgerCsv}
            disabled={detections.length === 0}
            className="px-3.5 py-2 rounded-lg bg-surface-elevated border border-card-border hover:border-card-border-hover text-12 font-medium text-text-secondary flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-accent-primary" />
            Export Ledger (CSV)
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-card-panel border border-card-border">
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['All', 'Deepfake', 'Authentic', 'Uncertain'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-12 font-medium transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-surface-elevated text-text-primary border border-card-border shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by session ID, title or channel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-ground border border-card-border rounded-lg pl-8 pr-3 py-1.5 text-12 text-text-primary placeholder:text-text-subtle focus:outline-none focus:border-accent-border transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card-panel border border-card-border rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-12">
            <thead className="bg-surface-ground/80 border-b border-card-border text-10 font-mono uppercase tracking-wider text-text-subtle">
              <tr>
                <th className="py-3.5 pl-5 pr-3">Playback</th>
                <th className="py-3.5 px-3">Session / Title</th>
                <th className="py-3.5 px-3">Channel</th>
                <th className="py-3.5 px-3">Timestamp</th>
                <th className="py-3.5 px-3">Risk Score</th>
                <th className="py-3.5 px-3">Verdict</th>
                <th className="py-3.5 pr-5 pl-3 text-right">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border font-normal">
              {loading && detections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted font-mono">
                    <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-accent-primary" />
                    Synchronizing detection ledger from database...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">
                    No matching detection records found. Process or ingest audio to populate ledger.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isFake = (item.result || item.status) === 'Deepfake';
                  const isAuth = (item.result || item.status) === 'Authentic';
                  const isPlaying = playingId === item.id;
                  const displayScore = item.riskScore ?? (isFake ? 85 : 12);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectDetection(item)}
                      className="hover:bg-surface-elevated/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 pl-5 pr-3">
                        <button
                          onClick={(e) => togglePlay(item.id, e)}
                          className="w-7 h-7 rounded-full bg-surface-elevated border border-card-border flex items-center justify-center text-text-muted hover:text-accent-primary hover:border-accent-border transition-colors cursor-pointer"
                        >
                          {isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current text-accent-primary" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-medium text-text-primary group-hover:text-accent-primary transition-colors">
                          {item.title || item.fileName}
                        </div>
                        <div className="text-11 font-mono text-text-subtle">Session: {item.sessionId || item.id}</div>
                      </td>

                      <td className="py-3.5 px-3 text-text-muted">{item.channel || 'Standard Ingest'}</td>

                      <td className="py-3.5 px-3 font-mono text-text-muted">{item.time || item.timestamp}</td>

                      <td className="py-3.5 px-3 font-mono">
                        <span
                          className={`font-semibold ${
                            isFake ? 'text-accent-danger' : isAuth ? 'text-accent-success' : 'text-accent-warning'
                          }`}
                        >
                          {displayScore}/100
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-11 font-medium border ${
                            isFake
                              ? 'bg-accent-danger/10 border-accent-danger/30 text-accent-danger'
                              : isAuth
                              ? 'bg-accent-success/10 border-accent-success/30 text-accent-success'
                              : 'bg-accent-warning/10 border-accent-warning/30 text-accent-warning'
                          }`}
                        >
                          {isFake && <ShieldAlert className="w-3 h-3" />}
                          {isAuth && <ShieldCheck className="w-3 h-3" />}
                          {!isFake && !isAuth && <HelpCircle className="w-3 h-3" />}
                          {item.result || item.status}
                        </span>
                      </td>

                      <td className="py-3.5 pr-5 pl-3 text-right font-mono text-text-muted">
                        {item.confidence}%
                      </td>
                    </tr>
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
