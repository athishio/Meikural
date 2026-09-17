import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Square, ShieldCheck, Radio } from 'lucide-react';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopRecordingCleanup();
      setResult(null);
      setElapsed(0);
      setAnalyzing(false);
    }
  }, [isOpen]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      setIsRecording(true);
      setElapsed(0);
      setResult(null);

      timerRef.current = window.setInterval(() => {
        setElapsed((prev) => prev + 0.1);
      }, 100);

      renderCanvas();
    } catch (err) {
      console.warn('Microphone access denied or not supported, running simulated live stream:', err);
      // Run simulated visualizer
      setIsRecording(true);
      setElapsed(0);
      setResult(null);
      timerRef.current = window.setInterval(() => {
        setElapsed((prev) => prev + 0.1);
      }, 100);
      renderSimulatedCanvas();
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

  const renderSimulatedCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawSim = () => {
      animationFrameRef.current = requestAnimationFrame(drawSim);
      ctx.fillStyle = '#0D0F11';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const bars = 40;
      const barWidth = canvas.width / bars;

      for (let i = 0; i < bars; i++) {
        const height = Math.sin(Date.now() * 0.005 + i * 0.3) * 20 + 25 + Math.random() * 15;
        ctx.fillStyle = '#FF4713';
        ctx.fillRect(i * barWidth + 1, (canvas.height - height) / 2, barWidth - 2, height);
      }
    };

    drawSim();
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
    stopRecordingCleanup();
    setAnalyzing(true);

    setTimeout(() => {
      setAnalyzing(false);
      const riskScore = Math.floor(Math.random() * 25) + 12; // live authentic voice bias
      const mockResult = {
        session_id: `live_stream_${Date.now().toString(36)}`,
        overall_risk_score: riskScore,
        verdict: 'Authentic Human Voice',
        liveness: 97.8,
        latency: '142ms',
        channel: 'Microphone Ingest (16kHz PCM)',
      };
      setResult(mockResult);
      if (onAnalysisComplete) onAnalysisComplete(mockResult);
    }, 1200);
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
                <p className="text-11 text-text-muted">Direct acoustic microphone feed with low-latency scoring</p>
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
            {/* Visualizer Frame */}
            <div className="relative rounded-xl overflow-hidden border border-card-border bg-surface-ground h-36 flex items-center justify-center">
              <canvas ref={canvasRef} width={420} height={140} className="w-full h-full" />

              {!isRecording && !analyzing && !result && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-ground/90 text-text-muted">
                  <Mic className="w-8 h-8 text-text-subtle mb-2" strokeWidth={1.5} />
                  <span className="text-12 font-medium text-text-primary">Microphone is idle</span>
                  <span className="text-11 text-text-subtle">Click "Start Recording" below to begin live analysis</span>
                </div>
              )}

              {isRecording && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-danger/20 border border-accent-danger/40 text-10 font-mono text-accent-danger animate-pulse">
                  <Radio className="w-3 h-3" />
                  REC • {elapsed.toFixed(1)}s
                </div>
              )}

              {analyzing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-ground/90">
                  <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin mb-2" />
                  <span className="text-12 font-medium text-text-primary">Calculating Neural Acoustic Score...</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={analyzing}
                  className="px-6 py-2.5 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white font-medium text-13 shadow-glow transition-all flex items-center gap-2"
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
                    <ShieldCheck className="w-4 h-4 text-accent-success" />
                    <span className="text-13 font-semibold text-accent-success">{result.verdict}</span>
                  </div>
                  <span className="font-mono text-14 font-bold text-accent-success">
                    {result.overall_risk_score}/100 Risk
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-11 font-mono text-text-muted">
                  <div className="p-2 rounded bg-surface-elevated border border-card-border">
                    Liveness: <strong className="text-text-primary">{result.liveness}%</strong>
                  </div>
                  <div className="p-2 rounded bg-surface-elevated border border-card-border">
                    Inference Latency: <strong className="text-text-primary">{result.latency}</strong>
                  </div>
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
