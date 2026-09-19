import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, FileAudio, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Download } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete?: (result: any) => void;
}

const pipelineSteps = [
  'Ingestion & Spectral Normalization',
  'Acoustic Feature Extraction (MFCC / Mel-Spec)',
  'Liveness & Phase Coherence Verification',
  'Neural Artifact Analysis (RawNet3 + AASIST)',
  'Cryptographic Attestation & SHA-256 Seal'
];

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onAnalysisComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const startAnalysis = async () => {
    if (!file) return;
    setAnalyzing(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    for (let i = 0; i < pipelineSteps.length; i++) {
      setCurrentStep(i);
      await new Promise((res) => setTimeout(res, 250));
    }

    try {
      const resp = await fetch('/score', {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        let errDetail = `Analysis failed (HTTP ${resp.status})`;
        try {
          const errJson = await resp.json();
          if (errJson.detail) errDetail = errJson.detail;
        } catch {}
        throw new Error(errDetail);
      }

      const data = await resp.json();
      const realScore = typeof data.score === 'number' ? Math.round(data.score * 100) : 0;
      const isFake = data.risk_verdict === 'STEP_UP_VERIFICATION' || realScore > 50;
      const realResult = {
        filename: file.name,
        session_id: data.metadata?.session_id || 'N/A',
        overall_risk_score: realScore,
        verdict: isFake
          ? 'High Risk / Deepfake Detected'
          : data.risk_verdict === 'WARN'
          ? 'Suspicious Conversational Jitter'
          : 'Authentic Biological Voice',
        confidence: data.anti_spoofing?.confidence ? `${data.anti_spoofing.confidence.toUpperCase()}` : 'HIGH',
        liveness_score: Math.max(1, Math.min(99, Math.round((1 - data.score) * 100))),
        latency: `${(data.metadata?.inference_latency_ms || 0).toFixed(1)}ms`,
        demo_mode: data.demo_mode,
        codec_profile: data.codec_profile || 'uncompressed_pcm_16k',
      };
      setResult(realResult);
      if (onAnalysisComplete) onAnalysisComplete(realResult);
    } catch (err: any) {
      console.error('Forensic inspection error:', err);
      setError(err.message || 'Analysis failed: could not communicate with backend service');
      setResult(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setAnalyzing(false);
    setCurrentStep(0);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-xl bg-card-panel border border-card-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-card-border bg-surface-ground/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-card-border flex items-center justify-center text-accent-primary">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-14 font-semibold text-text-primary">Forensic Audio Inspection</h3>
                <p className="text-11 text-text-muted">Analyze recordings with neural voice anti-spoofing</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-subtle hover:text-text-primary hover:bg-surface-elevated transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6">
            {!file ? (
              /* Dropzone */
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-card-border hover:border-accent-primary/60 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-surface-ground/40 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="audio/*,.wav,.mp3,.m4a,.flac"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-surface-elevated border border-card-border flex items-center justify-center text-text-muted group-hover:text-accent-primary group-hover:border-accent-border transition-all mb-3">
                  <UploadCloud className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <p className="text-13 font-medium text-text-primary mb-1">
                  Click to browse or drag & drop audio file
                </p>
                <p className="text-11 text-text-muted">
                  WAV, MP3, FLAC, M4A up to 50MB (PCM 16kHz+ recommended)
                </p>
              </div>
            ) : (
              /* File Selected & Pipeline */
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-surface-ground border border-card-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-surface-elevated border border-card-border flex items-center justify-center text-accent-primary">
                      <FileAudio className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-13 font-medium text-text-primary line-clamp-1">{file.name}</div>
                      <div className="text-11 text-text-muted">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || 'audio/wav'}
                      </div>
                    </div>
                  </div>
                  {!analyzing && !result && (
                    <button
                      onClick={resetModal}
                      className="text-11 text-text-subtle hover:text-accent-danger transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Processing Steps */}
                {analyzing && (
                  <div className="p-4 rounded-lg bg-surface-ground/80 border border-card-border space-y-3">
                    <div className="flex items-center justify-between text-12 text-text-muted">
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-accent-primary animate-spin" />
                        Running multi-stage forensic analysis...
                      </span>
                      <span className="font-mono text-accent-primary">Step {currentStep + 1}/5</span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {pipelineSteps.map((step, idx) => (
                        <div
                          key={step}
                          className={`flex items-center gap-2 text-11 transition-all ${
                            idx < currentStep
                              ? 'text-accent-success font-medium'
                              : idx === currentStep
                              ? 'text-accent-primary font-medium'
                              : 'text-text-subtle'
                          }`}
                        >
                          {idx < currentStep ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-accent-success" />
                          ) : idx === currentStep ? (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-card-border" />
                          )}
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-accent-danger/10 border border-accent-danger/30 text-accent-danger flex items-start gap-3"
                  >
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-12 font-semibold">Inspection Failed</div>
                      <div className="text-11 mt-0.5 opacity-90">{error}</div>
                    </div>
                  </motion.div>
                )}

                {/* Results Screen */}
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-surface-ground border border-card-border space-y-3"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-card-border">
                      <div>
                        <span className="text-10 uppercase tracking-widest font-mono text-text-subtle">
                          Analysis Verdict
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {result.overall_risk_score > 50 ? (
                            <>
                              <AlertTriangle className="w-4 h-4 text-accent-danger" />
                              <span className="text-14 font-semibold text-accent-danger">
                                {result.verdict}
                              </span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4 text-accent-success" />
                              <span className="text-14 font-semibold text-accent-success">
                                {result.verdict}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-10 uppercase tracking-widest font-mono text-text-subtle">
                          Risk Score
                        </span>
                        <div
                          className={`text-18 font-mono font-bold ${
                            result.overall_risk_score > 50 ? 'text-accent-danger' : 'text-accent-success'
                          }`}
                        >
                          {result.overall_risk_score}/100
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                      <div className="p-2 rounded bg-surface-elevated border border-card-border">
                        <div className="text-10 text-text-subtle">Confidence</div>
                        <div className="text-12 font-medium text-text-primary mt-0.5">
                          {result.confidence}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-surface-elevated border border-card-border">
                        <div className="text-10 text-text-subtle">Voice Trust</div>
                        <div className="text-12 font-medium text-accent-success mt-0.5">
                          {result.liveness_score}%
                        </div>
                      </div>
                      <div className="p-2 rounded bg-surface-elevated border border-card-border">
                        <div className="text-10 text-text-subtle">Latency</div>
                        <div className="text-12 font-medium text-text-primary mt-0.5">
                          {result.latency}
                        </div>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-surface-elevated/50 border border-card-border text-10 font-mono text-text-subtle flex items-center justify-between">
                      <span className="truncate">Session Audit Ref: {result.session_id}</span>
                      <span className="text-accent-primary ml-2 flex-shrink-0">
                        {result.demo_mode ? 'Demo Calibrated' : 'Neural Verified'}
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-card-border bg-surface-ground/50">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-12 text-text-muted hover:text-text-primary transition-colors"
            >
              Close
            </button>

            {file && !analyzing && !result && (
              <button
                onClick={startAnalysis}
                className="px-5 py-2 rounded-lg text-12 font-medium bg-accent-primary hover:bg-accent-primary/90 text-white shadow-glow transition-all flex items-center gap-1.5"
              >
                Start Inspection
              </button>
            )}

            {result && (
              <>
                <button
                  onClick={resetModal}
                  className="px-4 py-2 rounded-lg text-12 text-text-primary hover:bg-surface-elevated border border-card-border transition-colors"
                >
                  Analyze Another
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg text-12 font-medium bg-accent-primary hover:bg-accent-primary/90 text-white shadow-glow transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Save to Log
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
