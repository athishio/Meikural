import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Calendar, ShieldCheck, CheckCircle2, TrendingUp } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const reports = [
    {
      id: 'rep-01',
      title: 'Weekly SOC 2 Voice Attestation Audit',
      date: 'September 15, 2026',
      size: '3.4 MB',
      type: 'Compliance PDF',
      status: 'Audited & Signed',
      hash: 'sha256:4a8c9b2f...',
    },
    {
      id: 'rep-02',
      title: 'Deepfake Threat Intelligence & Intercept Digest',
      date: 'September 08, 2026',
      size: '5.1 MB',
      type: 'Threat Report',
      status: 'Audited & Signed',
      hash: 'sha256:1f9c3e0a...',
    },
    {
      id: 'rep-03',
      title: 'Monthly Voice Biometrics Accuracy & SLA Summary',
      date: 'August 31, 2026',
      size: '2.8 MB',
      type: 'Performance SLA',
      status: 'Audited & Signed',
      hash: 'sha256:9d4b1a8e...',
    },
    {
      id: 'rep-04',
      title: 'Cryptographic Hash-Chain Integrity Verification Log',
      date: 'August 24, 2026',
      size: '8.7 MB',
      type: 'Cryptographic Ledger',
      status: 'Zero Tampering Verified',
      hash: 'sha256:7e2c5d19...',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-20 font-bold text-text-primary tracking-tight">Compliance & Forensic Reports</h1>
          <p className="text-12 text-text-muted mt-0.5">
            Exportable regulatory documentation, hash-chain tamper audits, and deepfake incident ledgers
          </p>
        </div>

        <button
          onClick={() => alert('Generating on-demand compliance report...')}
          className="px-4 py-2 rounded-lg bg-accent-primary hover:bg-accent-primary/90 text-white text-12 font-medium shadow-glow flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <FileText className="w-3.5 h-3.5" />
          Generate New Report
        </button>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card-panel border border-card-border shadow-card flex items-center justify-between">
          <div>
            <span className="text-10 uppercase tracking-widest text-text-subtle font-mono">SOC 2 / ISO 27001</span>
            <div className="text-16 font-semibold text-accent-success mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              100% Compliant
            </div>
            <p className="text-11 text-text-muted mt-0.5">All voice telemetry encrypted in transit & rest</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card-panel border border-card-border shadow-card flex items-center justify-between">
          <div>
            <span className="text-10 uppercase tracking-widest text-text-subtle font-mono">Ledger State</span>
            <div className="text-16 font-semibold text-text-primary mt-1 flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-4 h-4 text-accent-primary" />
              24,190 Sealed Blocks
            </div>
            <p className="text-11 text-text-muted mt-0.5">Immutable Merkle hash root verified</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card-panel border border-card-border shadow-card flex items-center justify-between">
          <div>
            <span className="text-10 uppercase tracking-widest text-text-subtle font-mono">Threat Mitigation</span>
            <div className="text-16 font-semibold text-accent-primary mt-1 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              99.4% Defended
            </div>
            <p className="text-11 text-text-muted mt-0.5">86 deepfakes intercepted without escalation</p>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-card-panel border border-card-border rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-card-border flex items-center justify-between">
          <h3 className="text-13 font-semibold text-text-primary">Archived Compliance Packages</h3>
          <span className="text-11 font-mono text-text-muted">Auto-generated every Monday 00:00 UTC</span>
        </div>

        <div className="divide-y divide-card-border">
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-elevated/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-ground border border-card-border flex items-center justify-center text-accent-primary flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-13 font-medium text-text-primary">{rep.title}</h4>
                  <div className="flex items-center gap-3 text-11 text-text-muted mt-1 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-text-subtle" />
                      {rep.date}
                    </span>
                    <span>•</span>
                    <span>{rep.size}</span>
                    <span>•</span>
                    <span className="text-accent-success">{rep.status}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-auto">
                <span className="text-10 font-mono text-text-subtle hidden lg:inline">
                  Digest: {rep.hash}
                </span>
                <button
                  onClick={() => alert(`Downloading ${rep.title}...`)}
                  className="px-3 py-1.5 rounded-lg bg-surface-ground hover:bg-surface-elevated border border-card-border text-12 font-medium text-text-primary flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-accent-primary" />
                  Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
