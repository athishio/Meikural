import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, FileAudio, CheckCircle2, AlertTriangle, Play, RefreshCw, Download, Plus, RotateCcw } from 'lucide-react';

interface BatchAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BatchFile {
  id: string;
  name: string;
  size: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  file?: File;
  demoUrl?: string;
  riskScore?: number;
  verdict?: string;
  latency?: string;
  sessionId?: string;
  errorMessage?: string;
}

const defaultBenchmarkFiles: BatchFile[] = [
  { id: 'bench-1', name: 'bonafide_human_speech.wav', size: '937 KB', status: 'pending', demoUrl: '/demo_clips/bonafide_human_speech.wav' },
  { id: 'bench-2', name: 'deepfake_voice_clone.wav', size: '943 KB', status: 'pending', demoUrl: '/demo_clips/deepfake_voice_clone.wav' },
  { id: 'bench-3', name: 'caution_noisy_telecom.wav', size: '943 KB', status: 'pending', demoUrl: '/demo_clips/caution_noisy_telecom.wav' },
  { id: 'bench-4', name: 'challenge_response_digits.wav', size: '943 KB', status: 'pending', demoUrl: '/demo_clips/challenge_response_digits.wav' },
];

export const BatchAnalysisModal: React.FC<BatchAnalysisModalProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<BatchFile[]>(defaultBenchmarkFiles);
  const [isRunning, setIsRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: BatchFile[] = Array.from(e.target.files).map((f, idx) => ({
      id: `custom-${Date.now()}-${idx}`,
      name: f.name,
      size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      status: 'pending',
      file: f,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const runBatch = async () => {
    setIsRunning(true);
    for (let i = 0; i < files.length; i++) {
      const current = files[i];
      if (current.status === 'done') continue;

      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'processing', errorMessage: undefined } : f))
      );

      try {
        const formData = new FormData();
        if (current.file) {
          formData.append('file', current.file);
        } else if (current.demoUrl) {
          const res = await fetch(current.demoUrl);
          if (!res.ok) throw new Error(`Failed to load ${current.name}`);
          const blob = await res.blob();
          formData.append('file', blob, current.name);
        } else {
          throw new Error('No audio source provided');
        }

        const resp = await fetch('/score', {
          method: 'POST',
          body: formData,
        });

        if (!resp.ok) {
          let errDetail = `Scoring failed (HTTP ${resp.status})`;
          try {
            const errJson = await resp.json();
            if (errJson.detail) errDetail = errJson.detail;
          } catch {}
          throw new Error(errDetail);
        }

        const data = await resp.json();
        const score = typeof data.score === 'number' ? Math.round(data.score * 100) : 0;
        const isFake = data.risk_verdict === 'STEP_UP_VERIFICATION' || score > 50;
        const verdict = isFake
          ? 'Deepfake'
          : data.risk_verdict === 'WARN'
          ? 'Suspicious'
          : 'Authentic';
        const latency = data.metadata?.inference_latency_ms
          ? `${Math.round(data.metadata.inference_latency_ms)}ms`
          : undefined;
        const sessionId = data.metadata?.session_id;

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: 'done',
                  riskScore: score,
                  verdict,
                  latency,
                  sessionId,
                }
              : f
          )
        );
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: 'error',
                  errorMessage: err?.message || 'Processing error',
                }
              : f
          )
        );
      }
    }
    setIsRunning(false);
  };

  const exportCsv = () => {
    const headers = ['Filename', 'Status', 'Risk Score (%)', 'Verdict', 'Latency', 'Session ID'];
    const rows = files.map((f) => [
      f.name,
      f.status,
      f.riskScore !== undefined ? f.riskScore : 'N/A',
      f.verdict || (f.errorMessage ? `Error: ${f.errorMessage}` : 'Pending'),
      f.latency || 'N/A',
      f.sessionId || 'N/A',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `meikural_batch_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                <p className="text-11 text-text-muted">High-throughput AASIST forensic acoustic verification queue</p>
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

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  accept="audio/*,.wav,.mp3,.flac,.m4a"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded bg-surface-elevated border border-card-border hover:border-accent-border text-11 text-text-primary flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3 h-3 text-accent-primary" />
                  Add Audio Files
                </button>
                <button
                  onClick={() => setFiles(defaultBenchmarkFiles)}
                  className="px-2.5 py-1 rounded bg-surface-elevated border border-card-border hover:border-accent-border text-11 text-text-subtle hover:text-text-primary flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to Benchmark Suite
                </button>
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
                      <div className="text-10 font-mono text-text-subtle">
                        {file.size} {file.latency && `• ${file.latency}`}
                      </div>
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
                    {file.status === 'error' && (
                      <span className="text-11 text-accent-danger font-mono" title={file.errorMessage}>
                        Failed
                      </span>
                    )}
                    {file.status === 'done' && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-11 font-mono px-2 py-0.5 rounded border ${
                            (file.riskScore || 0) > 50
                              ? 'bg-accent-danger/10 border-accent-danger/30 text-accent-danger'
                              : file.verdict === 'Suspicious'
                              ? 'bg-accent-warning/10 border-accent-warning/30 text-accent-warning'
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
                              {file.riskScore}/100 {file.verdict}
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
              onClick={() => setFiles([])}
              className="text-11 text-text-muted hover:text-text-primary transition-colors"
            >
              Clear Queue
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-12 text-text-muted hover:text-text-primary transition-colors"
              >
                Close
              </button>

              {processedCount > 0 && (
                <button
                  onClick={exportCsv}
                  className="px-3.5 py-2 rounded-lg text-12 font-medium bg-surface-elevated border border-card-border hover:border-accent-border text-text-primary flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              )}

              <button
                onClick={runBatch}
                disabled={isRunning || files.length === 0}
                className="px-5 py-2 rounded-lg text-12 font-medium bg-accent-primary hover:bg-accent-primary/90 text-white shadow-glow flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Process Batch Queue
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
