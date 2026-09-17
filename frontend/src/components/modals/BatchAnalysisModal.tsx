import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, FileAudio, CheckCircle2, AlertTriangle, Play, RefreshCw, Download } from 'lucide-react';

interface BatchAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BatchFile {
  id: string;
  name: string;
  size: string;
  status: 'pending' | 'processing' | 'done';
  riskScore?: number;
  verdict?: string;
}

const sampleBatchFiles: BatchFile[] = [
  { id: '1', name: 'call_rec_2026_09_14_01.wav', size: '2.4 MB', status: 'pending' },
  { id: '2', name: 'auth_prompt_speaker_04.wav', size: '1.1 MB', status: 'pending' },
  { id: '3', name: 'ivr_verification_chunk8.wav', size: '4.8 MB', status: 'pending' },
  { id: '4', name: 'customer_support_sess91.wav', size: '3.2 MB', status: 'pending' },
  { id: '5', name: 'exec_wire_transfer_conf.wav', size: '1.9 MB', status: 'pending' },
];

export const BatchAnalysisModal: React.FC<BatchAnalysisModalProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<BatchFile[]>(sampleBatchFiles);
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) return null;

  const runBatch = async () => {
    setIsRunning(true);
    for (let i = 0; i < files.length; i++) {
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'processing' } : f))
      );
      await new Promise((res) => setTimeout(res, 600));
      const score = Math.floor(Math.random() * 80) + 12;
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i
            ? {
                ...f,
                status: 'done',
                riskScore: score,
                verdict: score > 50 ? 'Deepfake' : 'Authentic',
              }
            : f
        )
      );
    }
    setIsRunning(false);
  };

  const processedCount = files.filter((f) => f.status === 'done').length;
  const deepfakeCount = files.filter((f) => f.status === 'done' && (f.riskScore || 0) > 50).length;

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
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-card-border flex items-center justify-center text-accent-primary">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-14 font-semibold text-text-primary">Batch Audio Pipeline</h3>
                <p className="text-11 text-text-muted">High-throughput automated acoustic verification queue</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-subtle hover:text-text-primary hover:bg-surface-elevated transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Metric banner */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-surface-ground border border-card-border">
                <span className="text-10 uppercase tracking-wider text-text-subtle font-mono">Queue Size</span>
                <div className="text-16 font-mono font-semibold text-text-primary mt-0.5">{files.length} Files</div>
              </div>
              <div className="p-3 rounded-lg bg-surface-ground border border-card-border">
                <span className="text-10 uppercase tracking-wider text-text-subtle font-mono">Processed</span>
                <div className="text-16 font-mono font-semibold text-text-primary mt-0.5">
                  {processedCount}/{files.length}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-surface-ground border border-card-border">
                <span className="text-10 uppercase tracking-wider text-text-subtle font-mono">Threats Flagged</span>
                <div className="text-16 font-mono font-semibold text-accent-danger mt-0.5">
                  {deepfakeCount} Deepfakes
                </div>
              </div>
            </div>

            {/* List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-ground/70 border border-card-border"
                >
                  <div className="flex items-center gap-3">
                    <FileAudio className="w-4 h-4 text-text-muted" />
                    <div>
                      <div className="text-12 font-medium text-text-primary">{file.name}</div>
                      <div className="text-10 font-mono text-text-subtle">{file.size}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {file.status === 'pending' && (
                      <span className="text-11 text-text-subtle font-mono">Pending</span>
                    )}
                    {file.status === 'processing' && (
                      <span className="flex items-center gap-1.5 text-11 text-accent-primary font-mono">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Scoring...
                      </span>
                    )}
                    {file.status === 'done' && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-11 font-mono px-2 py-0.5 rounded border ${
                            (file.riskScore || 0) > 50
                              ? 'bg-accent-danger/10 border-accent-danger/30 text-accent-danger'
                              : 'bg-accent-success/10 border-accent-success/30 text-accent-success'
                          }`}
                        >
                          {(file.riskScore || 0) > 50 ? (
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {file.riskScore}/100 Fake
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {file.riskScore}/100 Authentic
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-card-border bg-surface-ground/50 flex items-center justify-between">
            <button
              onClick={() => setFiles(sampleBatchFiles)}
              className="text-11 text-text-muted hover:text-text-primary transition-colors"
            >
              Reset Queue
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-12 text-text-muted hover:text-text-primary transition-colors"
              >
                Cancel
              </button>

              {processedCount === files.length && processedCount > 0 ? (
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-12 font-medium bg-accent-primary hover:bg-accent-primary/90 text-white shadow-glow flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Batch CSV
                </button>
              ) : (
                <button
                  onClick={runBatch}
                  disabled={isRunning}
                  className="px-5 py-2 rounded-lg text-12 font-medium bg-accent-primary hover:bg-accent-primary/90 text-white shadow-glow flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Process Batch Queue
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
