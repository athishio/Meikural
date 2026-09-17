import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Sliders, Activity, Layers, Download } from 'lucide-react';

export const AudioLabPage: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSample, setSelectedSample] = useState('sample-1');
  const [glottalPulseWeight, setGlottalPulseWeight] = useState(82);
  const [spectralCutoff, setSpectralCutoff] = useState(16);

  const samples = [
    { id: 'sample-1', name: 'ElevenLabs Gen-2 Clone (High Pitch)', score: 94, duration: '0:12' },
    { id: 'sample-2', name: 'Organic Speaker #4 (Studio Mic)', score: 8, duration: '0:18' },
    { id: 'sample-3', name: 'Voice Conversion Replay (PSTN)', score: 81, duration: '0:15' },
    { id: 'sample-4', name: 'OpenAI Whisper TTS Sample', score: 89, duration: '0:09' },
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
          <h1 className="text-20 font-bold text-text-primary tracking-tight">Acoustic Research Lab</h1>
          <p className="text-12 text-text-muted mt-0.5">
            Interactive spectral breakdown, RawNet3 glottal pulse inspection & phase coherence analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Exporting spectrogram data package...')}
            className="px-3.5 py-2 rounded-lg bg-surface-elevated border border-card-border hover:border-card-border-hover text-12 font-medium text-text-secondary flex items-center gap-2 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export Spectrogram
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sample selector & controls */}
        <div className="space-y-4">
          <div className="bg-card-panel border border-card-border rounded-xl p-5 shadow-card space-y-4">
            <h3 className="text-13 font-semibold text-text-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent-primary" />
              Test Audio Samples
            </h3>

            <div className="space-y-2">
              {samples.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSample(s.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedSample === s.id
                      ? 'bg-surface-elevated border-accent-border text-text-primary shadow-sm'
                      : 'bg-surface-ground/60 border-card-border text-text-muted hover:text-text-primary hover:border-card-border-hover'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-12 font-medium line-clamp-1">{s.name}</span>
                    <span
                      className={`text-10 font-mono px-1.5 py-0.5 rounded ${
                        s.score > 50
                          ? 'bg-accent-danger/20 text-accent-danger border border-accent-danger/30'
                          : 'bg-accent-success/20 text-accent-success border border-accent-success/30'
                      }`}
                    >
                      {s.score}/100
                    </span>
                  </div>
                  <div className="text-10 font-mono text-text-subtle mt-1">Duration: {s.duration}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card-panel border border-card-border rounded-xl p-5 shadow-card space-y-4">
            <h3 className="text-13 font-semibold text-text-primary flex items-center gap-2">
              <Sliders className="w-4 h-4 text-accent-primary" />
              Inference Tuning
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
                <span className="text-13 font-semibold text-text-primary">Mel-Frequency Spectrogram</span>
              </div>
              <div className="flex items-center gap-2 text-11 font-mono text-text-muted">
                <span>FFT Window: 2048</span>
                <span>•</span>
                <span>Hop: 512</span>
              </div>
            </div>

            {/* Simulated Spectrogram Heatmap */}
            <div className="relative h-64 rounded-lg bg-surface-ground border border-card-border p-4 flex flex-col justify-between overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/10 via-accent-warning/10 to-transparent pointer-events-none" />
              
              <div className="h-full w-full flex items-end justify-between gap-1 z-10">
                {Array.from({ length: 80 }).map((_, i) => {
                  const height = (Math.sin(i * 0.15) * 40 + Math.cos(i * 0.3) * 30 + 50) % 95;
                  const isSpike = i > 40 && i < 55;
                  return (
                    <div
                      key={i}
                      style={{ height: `${Math.max(12, height)}%` }}
                      className={`w-full rounded-sm transition-all ${
                        isSpike
                          ? 'bg-gradient-to-t from-accent-danger to-accent-warning'
                          : 'bg-gradient-to-t from-accent-primary/60 to-accent-primary/10'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Freq labels */}
              <div className="flex items-center justify-between text-10 font-mono text-text-subtle pt-2 border-t border-card-border z-10">
                <span>0 Hz</span>
                <span>4 kHz</span>
                <span>8 kHz</span>
                <span>12 kHz</span>
                <span>16 kHz</span>
              </div>
            </div>

            {/* Audio transport controls */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-9 h-9 rounded-full bg-accent-primary hover:bg-accent-primary/90 text-white flex items-center justify-center shadow-glow transition-all"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                <button
                  onClick={() => setIsPlaying(false)}
                  className="p-2 rounded-lg bg-surface-elevated border border-card-border text-text-muted hover:text-text-primary"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <div className="text-11 font-mono text-text-muted">00:03.4 / 00:12.0</div>
              </div>

              <div className="flex items-center gap-2 text-11 font-mono text-accent-danger bg-accent-danger/10 border border-accent-danger/30 px-3 py-1 rounded-full">
                Synthetic Mel Artifact Peak at 3.2 kHz
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
