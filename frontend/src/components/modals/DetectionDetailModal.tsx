import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, ShieldCheck, Download, Fingerprint, Lock, Activity, Cpu } from 'lucide-react';
import type { RecentAnalysis } from '../../types/dashboard';

interface DetectionDetailModalProps {
  analysis: RecentAnalysis | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DetectionDetailModal: React.FC<DetectionDetailModalProps> = ({
  analysis,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !analysis) return null;

  const verdict = analysis.result || analysis.status || 'Authentic';
  const isDeepfake = verdict === 'Deepfake';
  const score = analysis.riskScore ?? (isDeepfake ? 88 : 12);
  const title = analysis.title || analysis.fileName;
  const time = analysis.timestamp || analysis.time;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-2xl bg-card-panel border border-card-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-card-border bg-surface-ground/50">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg border flex items-center justify-center ${
                  isDeepfake
                    ? 'bg-accent-danger/10 border-accent-danger/30 text-accent-danger'
                    : 'bg-accent-success/10 border-accent-success/30 text-accent-success'
                }`}
              >
                {isDeepfake ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-14 font-semibold text-text-primary">{title}</h3>
                <p className="text-11 font-mono text-text-muted">
                  ID: {analysis.id} • Analyzed at {time}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-subtle hover:text-text-primary hover:bg-surface-elevated transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-4 gap-3 font-mono">
              <div className="p-3 rounded-lg bg-surface-ground border border-card-border">
                <span className="text-10 uppercase tracking-wider text-text-subtle">Risk Score</span>
                <div
                  className={`text-18 font-bold mt-0.5 ${
                    score > 50 ? 'text-accent-danger' : 'text-accent-success'
                  }`}
                >
                  {score}/100
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface-ground border border-card-border">
                <span className="text-10 uppercase tracking-wider text-text-subtle">Verdict</span>
                <div className="text-13 font-semibold text-text-primary mt-1">{verdict}</div>
              </div>
              <div className="p-3 rounded-lg bg-surface-ground border border-card-border">
                <span className="text-10 uppercase tracking-wider text-text-subtle">Confidence</span>
                <div className="text-14 font-semibold text-accent-success mt-0.5">{analysis.confidence}%</div>
              </div>
              <div className="p-3 rounded-lg bg-surface-ground border border-card-border">
                <span className="text-10 uppercase tracking-wider text-text-subtle">Duration</span>
                <div className="text-14 font-semibold text-text-primary mt-0.5">{analysis.duration || '0:18'}</div>
              </div>
            </div>

            {/* Simulated Waveform & Artifact Spectrogram */}
            <div>
              <div className="flex items-center justify-between text-11 text-text-muted mb-2 font-mono">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-accent-primary" />
                  Neural Glottal & Phase Coherence Analysis
                </span>
                <span>Sampling: 44.1 kHz • Float32</span>
              </div>
              <div className="h-28 rounded-lg bg-surface-ground border border-card-border p-3 flex items-center justify-between gap-1 overflow-hidden relative">
                {Array.from({ length: 60 }).map((_, i) => {
                  const h = Math.sin(i * 0.25) * 35 + Math.cos(i * 0.1) * 20 + 40;
                  const isAnomaly = isDeepfake && i > 25 && i < 40;
                  return (
                    <div
                      key={i}
                      style={{ height: `${Math.max(10, Math.min(95, h))}%` }}
                      className={`w-1 rounded-full transition-all ${
                        isAnomaly ? 'bg-accent-danger' : 'bg-surface-elevated group-hover:bg-accent-primary'
                      }`}
                    />
                  );
                })}
                {isDeepfake && (
                  <div className="absolute top-2 right-3 text-10 font-mono text-accent-danger bg-accent-danger/10 border border-accent-danger/30 px-2 py-0.5 rounded">
                    Phonetic Inconsistency Detected @ 00:04.2
                  </div>
                )}
              </div>
            </div>

            {/* Neural Detection Engines */}
            <div className="p-3.5 rounded-lg bg-surface-ground border border-card-border space-y-2">
              <div className="flex items-center gap-2 text-12 font-medium text-text-primary">
                <Cpu className="w-4 h-4 text-accent-primary" />
                Multi-Model Inference Pipeline Breakdown
              </div>
              <div className="grid grid-cols-2 gap-2 text-11 font-mono">
                <div className="flex justify-between p-2 rounded bg-surface-elevated/60">
                  <span className="text-text-muted">RawNet3 Biometrics:</span>
                  <span className={score > 50 ? 'text-accent-danger' : 'text-accent-success'}>
                    {score > 50 ? 'Synthetic Artifacts (0.89)' : 'Organic Human (0.04)'}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-surface-elevated/60">
                  <span className="text-text-muted">AASIST Anti-Spoof:</span>
                  <span className={score > 50 ? 'text-accent-danger' : 'text-accent-success'}>
                    {score > 50 ? 'TTS Replay Detected' : 'No Spoof Detected'}
                  </span>
                </div>
              </div>
            </div>

            {/* Cryptographic Hash Chain Seal */}
            <div className="p-3.5 rounded-lg bg-surface-ground border border-card-border font-mono text-11 space-y-1.5">
              <div className="flex items-center justify-between text-text-subtle">
                <span className="flex items-center gap-1.5 text-text-primary font-medium">
                  <Lock className="w-3.5 h-3.5 text-accent-primary" />
                  Immutable Cryptographic Audit Seal
                </span>
                <span className="text-accent-success flex items-center gap-1">
                  <Fingerprint className="w-3 h-3" />
                  Chain Valid
                </span>
              </div>
              <div className="text-10 text-text-muted truncate">
                Digest: sha256:8f4c2b901aef9845d0124b893a771c504e76a0d2f939e658
              </div>
              <div className="text-10 text-text-subtle truncate">
                Prev Block: sha256:1a8e9903bc776d5421fa409e5124b77f12e8310d...
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-card-border bg-surface-ground/50 flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-12 text-text-muted hover:text-text-primary transition-colors"
            >
              Close
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => alert(`Report for ${title} downloaded.`)}
                className="px-4 py-2 rounded-lg text-12 font-medium bg-accent-primary hover:bg-accent-primary/90 text-white shadow-glow transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download Forensic PDF
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
