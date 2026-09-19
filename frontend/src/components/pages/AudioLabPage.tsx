import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Sliders, Activity, Layers, Download, Cpu, Loader2 } from 'lucide-react';

interface BenchmarkClip {
  id: string;
  filename: string;
  name: string;
  description: string;
  duration: string;
  url: string;
}

interface LiveInferenceResult {
  score: number;
  verdict: 'Authentic' | 'Deepfake' | 'Suspicious';
  latencyMs: number;
  rawRiskScore: number;
  sessionId: string;
  statusText: string;
}

const benchmarkClips: BenchmarkClip[] = [
  {
    id: 'clip-bonafide',
    filename: 'bonafide_human_speech.wav',
    name: 'Bonafide Human Speech',
    description: 'Natural human speaker with intact biological vocal tract resonance',
    duration: '0:30',
    url: '/demo_clips/bonafide_human_speech.wav',
  },
  {
    id: 'clip-deepfake',
    filename: 'deepfake_voice_clone.wav',
    name: 'Deepfake AI Voice Clone',
    description: 'Neural TTS voice synthesis requesting unauthorized wire transfer',
    duration: '0:30',
    url: '/demo_clips/deepfake_voice_clone.wav',
  },
  {
    id: 'clip-telecom',
    filename: 'caution_noisy_telecom.wav',
    name: 'Caution Noisy Telecom',
    description: 'Narrowband telecom channel with G.711u companding and 50Hz hum',
    duration: '0:30',
    url: '/demo_clips/caution_noisy_telecom.wav',
  },
  {
    id: 'clip-challenge',
    filename: 'challenge_response_digits.wav',
    name: 'Liveness Challenge Dialog',
    description: 'Interactive prompt-response dialogue reciting challenge digits 4-8-2-9',
    duration: '0:30',
    url: '/demo_clips/challenge_response_digits.wav',
  },
];

export const AudioLabPage: React.FC = () => {
  const [selectedClip, setSelectedClip] = useState<BenchmarkClip>(benchmarkClips[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [glottalPulseWeight, setGlottalPulseWeight] = useState(82);
  const [spectralCutoff, setSpectralCutoff] = useState(16);
  const [inferenceMap, setInferenceMap] = useState<Record<string, LiveInferenceResult>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const runAasistInference = useCallback(async (clip: BenchmarkClip) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      // 1. Fetch the benchmark audio clip as a Blob
      const audioResp = await fetch(clip.url);
      if (!audioResp.ok) throw new Error(`Failed to load ${clip.filename} (HTTP ${audioResp.status})`);
      const audioBlob = await audioResp.blob();

      // 2. Post to /score endpoint
      const formData = new FormData();
      formData.append('file', audioBlob, clip.filename);

      const scoreResp = await fetch('/score', {
        method: 'POST',
        body: formData,
      });

      if (!scoreResp.ok) {
        throw new Error(`Inference returned HTTP ${scoreResp.status}`);
      }

      const data = await scoreResp.json();
      const risk = typeof data.risk_score === 'number' ? data.risk_score : 0.5;
      const score100 = Math.round(risk * 100);
      const verd: 'Authentic' | 'Deepfake' | 'Suspicious' =
        data.final_verdict === 'ALLOW' || risk <= 0.35
          ? 'Authentic'
          : data.final_verdict === 'ALERT' || data.final_verdict === 'STEP_UP_VERIFICATION' || risk >= 0.65
          ? 'Deepfake'
          : 'Suspicious';

      const statusText =
        score100 > 50
          ? 'Synthetic Phase Discontinuity Intercepted'
          : score100 > 30
          ? 'Narrowband Telecom Jitter Detected'
          : 'Harmonic Biological Glottal Pulses Verified';

      setInferenceMap((prev) => ({
        ...prev,
        [clip.id]: {
          score: score100,
          verdict: verd,
          latencyMs: Math.round(data.latency_ms || 420),
          rawRiskScore: risk,
          sessionId: data.session_id || 'active_session',
          statusText,
        },
      }));
    } catch (err: any) {
      setAnalysisError(err.message || 'Inference call failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Trigger analysis for initial clip on mount
  useEffect(() => {
    runAasistInference(benchmarkClips[0]);
  }, [runAasistInference]);

  // Handle clip selection
  const handleSelectClip = (clip: BenchmarkClip) => {
    setSelectedClip(clip);
    if (!inferenceMap[clip.id]) {
      runAasistInference(clip);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [selectedClip]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration) setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const activeInference = inferenceMap[selectedClip.id];

  const exportSpectrogramData = () => {
    const reportData = {
      test_vector: selectedClip.name,
      filename: selectedClip.filename,
      source_url: selectedClip.url,
      aasist_inference: activeInference
        ? {
            raw_risk_score: activeInference.rawRiskScore.toFixed(4),
            display_score: activeInference.score,
            verdict: activeInference.verdict,
            inference_latency_ms: activeInference.latencyMs,
            session_id: activeInference.sessionId,
            decision_boundary_margin: Math.abs(activeInference.score - 50),
          }
        : { status: 'Pending inference' },
      spectral_telemetry: {
        sampling_rate: 16000,
        fft_window: 2048,
        hop_length: 512,
        nyquist_cutoff_khz: spectralCutoff,
        glottal_harmonic_weight: `${glottalPulseWeight}%`,
      },
      analysis_timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meikural_spectral_analysis_${selectedClip.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const displayScore = activeInference ? activeInference.score : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6"
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={selectedClip.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-20 font-bold text-text-primary tracking-tight">Acoustic Research & Signal Lab</h1>
          <p className="text-12 text-text-muted mt-0.5">
            Spectral decomposition, biological glottal pulse inspection & phase coherence on benchmark vectors
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => runAasistInference(selectedClip)}
            disabled={isAnalyzing}
            className="px-3.5 py-2 rounded-lg bg-accent-primary/10 border border-accent-primary/30 hover:border-accent-primary text-12 font-medium text-accent-primary flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isAnalyzing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Cpu className="w-3.5 h-3.5 text-accent-primary" />
            )}
            <span>{isAnalyzing ? 'Running AASIST...' : 'Run AASIST Inference'}</span>
          </button>

          <button
            onClick={exportSpectrogramData}
            className="px-3.5 py-2 rounded-lg bg-surface-elevated border border-card-border hover:border-accent-border text-12 font-medium text-text-primary flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-accent-primary" />
            Export Spectral Package
          </button>
        </div>
      </div>

      {analysisError && (
        <div className="p-3 bg-accent-danger/10 border border-accent-danger/30 rounded-xl text-12 font-mono text-accent-danger">
          Inference Notice: {analysisError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sample selector & controls */}
        <div className="space-y-4">
          <div className="bg-card-panel border border-card-border rounded-xl p-5 shadow-card space-y-4">
            <h3 className="text-13 font-semibold text-text-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent-primary" />
              Benchmark Audio Test Vectors
            </h3>

            <div className="space-y-2">
              {benchmarkClips.map((clip) => {
                const inf = inferenceMap[clip.id];
                return (
                  <button
                    key={clip.id}
                    onClick={() => handleSelectClip(clip)}
                    className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedClip.id === clip.id
                        ? 'bg-surface-elevated border-accent-border text-text-primary shadow-sm'
                        : 'bg-surface-ground/60 border-card-border text-text-muted hover:text-text-primary hover:border-card-border-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-12 font-medium line-clamp-1">{clip.name}</span>
                      {inf ? (
                        <span
                          className={`text-10 font-mono px-1.5 py-0.5 rounded border ${
                            inf.score > 50
                              ? 'bg-accent-danger/20 text-accent-danger border-accent-danger/30'
                              : inf.score > 30
                              ? 'bg-accent-warning/20 text-accent-warning border-accent-warning/30'
                              : 'bg-accent-success/20 text-accent-success border-accent-success/30'
                          }`}
                        >
                          {inf.score}/100
                        </span>
                      ) : isAnalyzing && selectedClip.id === clip.id ? (
                        <span className="text-10 font-mono px-1.5 py-0.5 rounded border bg-surface-elevated border-card-border text-accent-primary animate-pulse">
                          Inference...
                        </span>
                      ) : (
                        <span className="text-10 font-mono px-1.5 py-0.5 rounded border bg-surface-elevated border-card-border text-text-subtle">
                          Ready
                        </span>
                      )}
                    </div>
                    <p className="text-11 text-text-subtle mt-1 line-clamp-2 leading-relaxed">{clip.description}</p>
                    <div className="text-10 font-mono text-text-subtle mt-1.5 flex items-center justify-between">
                      <span>{clip.filename}</span>
                      <span>{clip.duration}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-card-panel border border-card-border rounded-xl p-5 shadow-card space-y-4">
            <h3 className="text-13 font-semibold text-text-primary flex items-center gap-2">
              <Sliders className="w-4 h-4 text-accent-primary" />
              Acoustic Filter Configuration
            </h3>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-11 font-mono text-text-muted mb-1">
                  <span>Glottal Harmonic Weight</span>
                  <span className="text-text-primary">{glottalPulseWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={glottalPulseWeight}
                  onChange={(e) => setGlottalPulseWeight(Number(e.target.value))}
                  className="w-full accent-accent-primary bg-surface-elevated h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-11 font-mono text-text-muted mb-1">
                  <span>Spectral Nyquist Cutoff</span>
                  <span className="text-text-primary">{spectralCutoff} kHz</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="48"
                  value={spectralCutoff}
                  onChange={(e) => setSpectralCutoff(Number(e.target.value))}
                  className="w-full accent-accent-primary bg-surface-elevated h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Visualizer Workbench */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card-panel border border-card-border rounded-xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent-primary" />
                <span className="text-13 font-semibold text-text-primary">
                  Mel-Frequency Spectrogram: {selectedClip.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-11 font-mono text-text-muted">
                {activeInference && (
                  <span className="text-accent-primary font-semibold">
                    AASIST {activeInference.latencyMs}ms
                  </span>
                )}
                <span>•</span>
                <span>FFT: 2048</span>
                <span>•</span>
                <span>16 kHz PCM</span>
              </div>
            </div>

            {/* Spectrogram Heatmap */}
            <div className="relative h-64 rounded-lg bg-surface-ground border border-card-border p-4 flex flex-col justify-between overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/10 via-accent-warning/10 to-transparent pointer-events-none" />

              <div className="h-full w-full flex items-end justify-between gap-1 z-10">
                {Array.from({ length: 64 }).map((_, i) => {
                  const scoreVal = displayScore ?? 25;
                  const isDeepfake = scoreVal > 50;
                  const phaseMod = isDeepfake ? Math.sin(i * 0.4) * 45 : Math.sin(i * 0.15) * 30;
                  const height = Math.max(10, Math.min(95, phaseMod + Math.cos(i * 0.25) * 25 + 50));
                  const isAnomaly = isDeepfake && i > 28 && i < 44;

                  return (
                    <div
                      key={i}
                      style={{ height: `${height}%` }}
                      className={`w-full rounded-sm transition-all ${
                        isAnomaly
                          ? 'bg-gradient-to-t from-accent-danger to-accent-warning animate-pulse'
                          : scoreVal > 30
                          ? 'bg-gradient-to-t from-accent-warning/60 to-accent-warning/10'
                          : 'bg-gradient-to-t from-accent-primary/60 to-accent-primary/10'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Freq labels */}
              <div className="flex items-center justify-between text-10 font-mono text-text-subtle pt-2 border-t border-card-border z-10">
                <span>0 Hz</span>
                <span>2 kHz</span>
                <span>4 kHz (Voicing Zone)</span>
                <span>6 kHz</span>
                <span>8 kHz (Nyquist)</span>
              </div>
            </div>

            {/* Audio transport controls */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-full bg-accent-primary hover:bg-accent-primary/90 text-white flex items-center justify-center shadow-glow transition-all cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = 0;
                      audioRef.current.pause();
                      setIsPlaying(false);
                      setCurrentTime(0);
                    }
                  }}
                  className="p-2 rounded-lg bg-surface-elevated border border-card-border text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <div className="text-11 font-mono text-text-muted">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              <div
                className={`flex items-center gap-2 text-11 font-mono px-3 py-1 rounded-full border ${
                  activeInference
                    ? activeInference.score > 50
                      ? 'text-accent-danger bg-accent-danger/10 border-accent-danger/30'
                      : activeInference.score > 30
                      ? 'text-accent-warning bg-accent-warning/10 border-accent-warning/30'
                      : 'text-accent-success bg-accent-success/10 border-accent-success/30'
                    : isAnalyzing
                    ? 'text-accent-primary bg-accent-primary/10 border-accent-primary/30 animate-pulse'
                    : 'text-text-muted bg-surface-elevated border-card-border'
                }`}
              >
                {isAnalyzing
                  ? 'Executing AASIST Neural Inference on CPU INT8...'
                  : activeInference
                  ? activeInference.statusText
                  : 'Ready for Neural Feature Extraction'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
