import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Filter, Play, Pause, ShieldAlert, ShieldCheck, HelpCircle } from 'lucide-react';
import type { RecentAnalysis } from '../../types/dashboard';

interface DetectionsPageProps {
  onSelectDetection: (item: RecentAnalysis) => void;
}

const allDetections: RecentAnalysis[] = [
  {
    id: 'det-001',
    fileName: 'Executive Voice Cloning Intercept',
    title: 'Executive Voice Cloning Intercept',
    time: '2 mins ago',
    timestamp: '2 mins ago',
    riskScore: 92,
    result: 'Deepfake',
    status: 'Deepfake',
    confidence: 98.4,
    duration: '0:14',
    channel: 'Inbound SIP Trunk',
  },
  {
    id: 'det-002',
    fileName: 'VIP Banking Auth Attempt',
    title: 'VIP Banking Auth Attempt',
    time: '14 mins ago',
    timestamp: '14 mins ago',
    riskScore: 14,
    result: 'Authentic',
    status: 'Authentic',
    confidence: 99.1,
    duration: '0:22',
    channel: 'Mobile App SDK',
  },
  {
    id: 'det-003',
    fileName: 'Customer Service Inquiry #882',
    title: 'Customer Service Inquiry #882',
    time: '42 mins ago',
    timestamp: '42 mins ago',
    riskScore: 48,
    result: 'Uncertain',
    status: 'Uncertain',
    confidence: 72.0,
    duration: '0:35',
    channel: 'Twilio Connector',
  },
  {
    id: 'det-004',
    fileName: 'Wire Transfer Verification Stream',
    title: 'Wire Transfer Verification Stream',
    time: '1 hour ago',
    timestamp: '1 hour ago',
    riskScore: 86,
    result: 'Deepfake',
    status: 'Deepfake',
    confidence: 96.8,
    duration: '0:18',
    channel: 'Genesys Cloud Ingest',
  },
  {
    id: 'det-005',
    fileName: 'Branch Manager Authorization',
    title: 'Branch Manager Authorization',
    time: '2 hours ago',
    timestamp: '2 hours ago',
    riskScore: 8,
    result: 'Authentic',
    status: 'Authentic',
    confidence: 99.5,
    duration: '0:09',
    channel: 'SIP Trunk Primary',
  },
  {
    id: 'det-006',
    fileName: 'Internal Helpdesk Voice Ticket',
    title: 'Internal Helpdesk Voice Ticket',
    time: '3 hours ago',
    timestamp: '3 hours ago',
    riskScore: 78,
    result: 'Deepfake',
    status: 'Deepfake',
    confidence: 94.2,
    duration: '0:41',
    channel: 'WebRTC Agent Portal',
  },
  {
    id: 'det-007',
    fileName: 'Emergency Account Unlock Call',
    title: 'Emergency Account Unlock Call',
    time: '4 hours ago',
    timestamp: '4 hours ago',
    riskScore: 89,
    result: 'Deepfake',
    status: 'Deepfake',
    confidence: 97.3,
    duration: '0:27',
    channel: 'PSTN Gateway',
  },
  {
    id: 'det-008',
    fileName: 'Routine KYC Voice Biometrics',
    title: 'Routine KYC Voice Biometrics',
    time: '5 hours ago',
    timestamp: '5 hours ago',
    riskScore: 5,
    result: 'Authentic',
    status: 'Authentic',
    confidence: 99.8,
    duration: '0:15',
    channel: 'Mobile App SDK',
  },
];

export const DetectionsPage: React.FC<DetectionsPageProps> = ({ onSelectDetection }) => {
  const [filter, setFilter] = useState<'All' | 'Deepfake' | 'Authentic' | 'Uncertain'>('All');
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const filtered = allDetections.filter((item) => {
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
            onClick={() => alert('Exporting full forensic audit ledger (CSV)...')}
            className="px-3.5 py-2 rounded-lg bg-surface-elevated border border-card-border hover:border-card-border-hover text-12 font-medium text-text-secondary flex items-center gap-2 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export Ledger
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
              className={`px-3 py-1.5 rounded-lg text-12 font-medium transition-all ${
                filter === tab
                  ? 'bg-surface-elevated text-text-primary border border-card-border shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full md:w-72">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by title, ID, or channel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-ground border border-card-border rounded-lg pl-8 pr-3 py-1.5 text-12 text-text-primary placeholder:text-text-subtle focus:outline-none focus:border-accent-border transition-colors"
            />
          </div>
          <button className="p-2 rounded-lg bg-surface-ground border border-card-border text-text-muted hover:text-text-primary">
            <Filter className="w-3.5 h-3.5" />
          </button>
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
              {filtered.map((item) => {
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
                        className="w-7 h-7 rounded-full bg-surface-elevated border border-card-border flex items-center justify-center text-text-muted hover:text-accent-primary hover:border-accent-border transition-colors"
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
                      <div className="text-11 font-mono text-text-subtle">ID: {item.id}</div>
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
