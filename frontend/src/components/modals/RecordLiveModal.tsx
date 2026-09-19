import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Square, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';

interface RecordLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete?: (result: any) => void;
}

export const RecordLiveModal: React.FC<RecordLiveModalProps> = ({ isOpen, onClose, onAnalysisComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!isOpen) {
      stopRecordingCleanup();
      setResult(null);
      setError(null);
      setElapsed(0);
      setAnalyzing(false);
    }
  }, [isOpen]);

  const startRecording = async () => {
    setError(null);
    setResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      mediaRecorder.start(250);
      setIsRecording(true);
      setElapsed(0);

      timerRef.current = window.setInterval(() => {
        setElapsed((prev) => prev + 0.1);
      }, 100);

      renderCanvas();
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setError(err.message || 'Microphone access denied. Please grant microphone permissions in your browser.');
      setIsRecording(false);
    }
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#0D0F11';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
        ctx.fillStyle = i % 2 === 0 ? '#FF4713' : 'rgba(255, 71, 19, 0.6)';
        ctx.fillRect(x, (canvas.height - barHeight) / 2, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    draw();
  };

  const stopRecordingCleanup = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        stopRecordingCleanup();
        const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const recordedBlob = new Blob(audioChunksRef.current, { type: mime });

        if (recordedBlob.size === 0) {
          setError('No audio frames recorded. Please speak into the microphone.');
          setAnalyzing(false);
          return;
        }

        setAnalyzing(true);
        setError(null);

        try {
          const formData = new FormData();
          formData.append('file', recordedBlob, 'live_microphone.webm');

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
            session_id: data.metadata?.session_id || `live_stream_${Date.now().toString(36)}`,
            overall_risk_score: realScore,
            verdict: isFake
              ? 'High Risk / Deepfake Detected'
              : data.risk_verdict === 'WARN'
              ? 'Suspicious Conversational Jitter'
              : 'Authentic Human Voice',
            liveness: Math.max(1, Math.min(99, Math.round((1 - data.score) * 1000) / 10)),
            latency: `${(data.metadata?.inference_latency_ms || 0).toFixed(1)}ms`,
            channel: 'Live Microphone (PyAV Ingest)',
            demo_mode: data.demo_mode,
          };

          setResult(realResult);
          if (onAnalysisComplete) onAnalysisComplete(realResult);
        } catch (err: any) {
          console.error('Live stream scoring error:', err);
          setError(err.message || 'Analysis failed: could not communicate with backend service');
          setResult(null);
        } finally {
          setAnalyzing(false);
        }
      };

      mediaRecorderRef.current.stop();
    } else {
      stopRecordingCleanup();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-card-panel border border-card-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-card-border bg-surface-ground/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-card-border flex items-center justify-center text-accent-primary">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-14 font-semibold text-text-primary">Live Voice Stream Inspection</h3>
                <p className="text-11 text-text-muted">Direct acoustic microphone feed with neural AASIST scoring</p>
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
            {/* Visualizer canvas */}
            <div className="relative h-28 rounded-xl bg-surface-ground border border-card-border overflow-hidden flex items-center justify-center">
              <canvas ref={canvasRef} width={460} height={112} className="w-full h-full block" />
              {!isRecording && !analyzing && !result && (
                <div className="absolute text-center text-text-subtle text-12 font-mono">
                  Microphone idle · Click 'Start Recording' to begin live capture
                </div>
              )}
              {analyzing && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center gap-2 text-accent-primary text-12 font-mono">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running AASIST neural anti-spoofing inference...
                </div>
              )}
            </div>

            {/* Timer & Status */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isRecording ? 'bg-accent-danger animate-pulse' : 'bg-card-border'
                  }`}
                />
                <span className="text-11 font-mono text-text-muted uppercase">
                  {isRecording ? 'Acoustic Stream Active' : 'Ready'}
                </span>
              </div>
              <span className="font-mono text-14 font-bold text-text-primary">
                {elapsed.toFixed(1)}s
              </span>
            </div>

            {/* Error banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-accent-danger/10 border border-accent-danger/30 text-accent-danger flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-12 font-semibold">Microphone Capture Error</div>
                  <div className="text-11 mt-0.5 opacity-90">{error}</div>
                </div>
              </motion.div>
            )}

            {/* Control buttons */}
            <div className="flex justify-center pt-1">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={analyzing}
                  className="px-6 py-2.5 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white font-medium text-13 shadow-glow transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Mic className="w-4 h-4" />
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-6 py-2.5 rounded-xl bg-accent-danger hover:bg-accent-danger/90 text-white font-medium text-13 shadow-glow transition-all flex items-center gap-2"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop & Score Voice
                </button>
              )}
            </div>

            {/* Result display */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-surface-ground border border-card-border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {result.overall_risk_score > 50 ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-accent-danger" />
                        <span className="text-13 font-semibold text-accent-danger">{result.verdict}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-accent-success" />
                        <span className="text-13 font-semibold text-accent-success">{result.verdict}</span>
                      </>
                    )}
                  </div>
                  <span
                    className={`font-mono text-14 font-bold ${
                      result.overall_risk_score > 50 ? 'text-accent-danger' : 'text-accent-success'
                    }`}
                  >
                    {result.overall_risk_score}/100 Risk
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-11 font-mono text-text-muted">
                  <div className="p-2 rounded bg-surface-elevated border border-card-border">
                    Voice Trust: <strong className="text-text-primary">{result.liveness}%</strong>
                  </div>
                  <div className="p-2 rounded bg-surface-elevated border border-card-border">
                    Inference Latency: <strong className="text-text-primary">{result.latency}</strong>
                  </div>
                </div>
                <div className="p-2 rounded bg-surface-elevated/50 border border-card-border text-10 font-mono text-text-subtle flex items-center justify-between">
                  <span className="truncate">Session: {result.session_id}</span>
                  <span className="text-accent-primary ml-2 flex-shrink-0">
                    {result.demo_mode ? 'Demo Calibrated' : 'Neural Verified'}
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          <div className="px-6 py-3.5 border-t border-card-border bg-surface-ground/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-12 text-text-muted hover:text-text-primary transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
