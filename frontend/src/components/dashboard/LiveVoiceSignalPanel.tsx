import React, { useState, useEffect, useRef } from 'react';
import { Activity, Radio } from 'lucide-react';
import type { TelemetryDiagnostics, ModelEvidenceItem } from '../../types/dashboard';

interface LiveVoiceSignalPanelProps {
  analyserNode: AnalyserNode | null;
  isRecording: boolean;
  diagnostics: TelemetryDiagnostics;
  evidenceItems?: ModelEvidenceItem[];
  isOffline?: boolean;
}

const defaultEvidence: ModelEvidenceItem[] = [
  { feature: 'Spectral Flatness', value: '0.042 (Organic Harmonic Peak)', percentage: 92, weight: 0.28, contribution: 'safe' },
  { feature: 'Pitch Jitter (F0 Micro-tremor)', value: '0.84% (Natural Vocal Cord)', percentage: 88, weight: 0.24, contribution: 'safe' },
  { feature: 'Voice Shimmer (Amplitude Var)', value: '2.1% (Genuine Resonator)', percentage: 91, weight: 0.20, contribution: 'safe' },
  { feature: 'Formant Drift (F1-F3 Coherence)', value: 'Normal Acoustic Tract', percentage: 95, weight: 0.16, contribution: 'safe' },
  { feature: 'Phase Discontinuity Anomaly', value: 'Zero Phase Splicing', percentage: 97, weight: 0.12, contribution: 'safe' },
];

export const LiveVoiceSignalPanel: React.FC<LiveVoiceSignalPanelProps> = React.memo(({
  analyserNode,
  isRecording,
  diagnostics,
  evidenceItems = defaultEvidence,
  isOffline = false,
}) => {
  const [activeTab, setActiveTab] = useState<'waveform' | 'spectrum' | 'evidence'>('waveform');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isOffline) {
      // Offline: Draw static frozen flatline
      const width = canvas.width;
      const height = canvas.height;
      ctx.fillStyle = '#050607';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.strokeStyle = '#2A2F33';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = '#0D0F11';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (activeTab === 'waveform') {
        if (analyserNode && isRecording) {
          const bufferLength = analyserNode.fftSize;
          const dataArray = new Uint8Array(bufferLength);
          analyserNode.getByteTimeDomainData(dataArray);

          ctx.lineWidth = 2;
          ctx.strokeStyle = '#FF4713';
          ctx.beginPath();

          const sliceWidth = width / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            x += sliceWidth;
          }

          ctx.lineTo(width, height / 2);
          ctx.stroke();
        } else {
          // Simulated smooth continuous ambient wave
          ctx.lineWidth = 2;
          ctx.strokeStyle = isRecording ? '#FF4713' : '#5E666B';
          ctx.beginPath();

          const t = Date.now() * 0.003;
          for (let x = 0; x < width; x += 3) {
            const normX = x / width;
            const amp = isRecording ? 35 : 12;
            const y = height / 2 + Math.sin(normX * 12 + t) * amp * Math.cos(normX * 6);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      } else if (activeTab === 'spectrum') {
        const bars = 48;
        const barWidth = width / bars;

        if (analyserNode && isRecording) {
          const bufferLength = analyserNode.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyserNode.getByteFrequencyData(dataArray);

          for (let i = 0; i < bars; i++) {
            const binIdx = Math.floor((i / bars) * bufferLength);
            const val = dataArray[binIdx] / 255.0;
            const barHeight = val * (height - 20);

            ctx.fillStyle = i % 2 === 0 ? '#FF4713' : '#22C55E';
            ctx.fillRect(i * barWidth + 2, height - barHeight - 5, barWidth - 3, barHeight);
          }
        } else {
          // Ambient / simulated spectrum bars
          const t = Date.now() * 0.004;
          for (let i = 0; i < bars; i++) {
            const amp = Math.abs(Math.sin(t + i * 0.25) * Math.cos(i * 0.15)) * (height - 35) + 6;
            ctx.fillStyle = i > 32 ? '#EF4444' : i > 18 ? '#F59E0B' : '#22C55E';
            ctx.fillRect(i * barWidth + 2, height - amp - 5, barWidth - 3, amp);
          }
        }
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeTab, analyserNode, isRecording, isOffline]);

  return (
    <div className="relative bg-[#0D0F11] border border-[#1E2225] hover:border-[#2A2F33] rounded-[16px] p-5 shadow-card flex flex-col justify-between transition-all duration-200">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#FF4713]" strokeWidth={1.8} />
          <h2 className="text-[14px] font-semibold text-[#F2F4F5]">Live Voice Signal</h2>
          {isRecording && !isOffline && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-[#EF4444] bg-[#EF4444]/15 border border-[#EF4444]/30 px-2 py-0.5 rounded-full animate-pulse">
              <Radio className="w-2.5 h-2.5" />
              STREAMING
            </span>
          )}
          {isOffline && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-[#EF4444] bg-[#EF4444]/15 border border-[#EF4444]/30 px-2 py-0.5 rounded-full">
              DISCONNECTED
            </span>
          )}
        </div>

        {/* 3 Tabs: Waveform / Spectrum / Model Evidence */}
        <div className="flex items-center gap-1 bg-[#141719] border border-[#1E2225] p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('waveform')}
            className={`px-3 py-1 text-[11.5px] font-medium rounded-md transition-all ${
              activeTab === 'waveform'
                ? 'bg-[#1E2225] text-[#F2F4F5] shadow-sm'
                : 'text-[#9BA3A8] hover:text-[#F2F4F5]'
            }`}
          >
            Waveform
          </button>
          <button
            onClick={() => setActiveTab('spectrum')}
            className={`px-3 py-1 text-[11.5px] font-medium rounded-md transition-all ${
              activeTab === 'spectrum'
                ? 'bg-[#1E2225] text-[#F2F4F5] shadow-sm'
                : 'text-[#9BA3A8] hover:text-[#F2F4F5]'
            }`}
          >
            Spectrum
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-3 py-1 text-[11.5px] font-medium rounded-md transition-all ${
              activeTab === 'evidence'
                ? 'bg-[#1E2225] text-[#F2F4F5] shadow-sm'
                : 'text-[#9BA3A8] hover:text-[#F2F4F5]'
            }`}
          >
            Model Evidence
          </button>
        </div>
      </div>

      {/* Visual Canvas / Evidence Box */}
      <div className="relative rounded-xl overflow-hidden border border-[#1E2225] bg-[#050607] h-44 mb-4">
        {activeTab !== 'evidence' ? (
          <>
            <canvas ref={canvasRef} width={640} height={176} className="w-full h-full" />
            {!isOffline && (
              <div className="absolute top-2.5 right-3 text-[10px] font-mono text-[#5E666B] bg-[#0D0F11]/80 px-2 py-0.5 rounded border border-[#1E2225]">
                60 FPS · 16kHz PCM
              </div>
            )}
            {/* Frozen / Dimmed Desaturated Overlay when Offline */}
            {isOffline && (
              <div className="absolute inset-0 bg-[#050607]/80 backdrop-blur-[1.5px] flex flex-col items-center justify-center gap-1.5 select-none pointer-events-none">
                <span className="px-3 py-1 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-[11px] font-mono flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  Last signal 4s ago · OFFLINE
                </span>
                <span className="text-[10.5px] font-mono text-[#5E666B]">
                  Waveform frozen · Acoustic pipeline disconnected
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="p-3.5 h-full overflow-y-auto space-y-2.5 custom-scrollbar">
            {evidenceItems.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#F2F4F5] font-medium">{item.feature}</span>
                  <span className="text-[#9BA3A8]">{item.value}</span>
                </div>
                <div className="w-full bg-[#141719] h-1.5 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${item.percentage}%` }}
                    className={`h-full rounded-full ${
                      item.contribution === 'safe'
                        ? 'bg-[#22C55E]'
                        : item.contribution === 'alert'
                        ? 'bg-[#EF4444]'
                        : 'bg-[#FF4713]'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ALL SIX Telemetry Tiles — with STALE badge and grayed out values when offline */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <div className="p-2 rounded-lg bg-[#141719] border border-[#1E2225] text-center font-mono">
          <div className="flex items-center justify-center gap-1">
            <span className="text-[10px] text-[#5E666B] uppercase block">Speech VAD</span>
            {isOffline && <span className="text-[8px] px-1 rounded bg-[#1E2225] text-[#5E666B]">STALE</span>}
          </div>
          <span
            className={`text-[12px] font-semibold mt-0.5 block ${
              isOffline
                ? 'text-[#5E666B]'
                : diagnostics.speechVad === 'ACTIVE'
                ? 'text-[#22C55E]'
                : 'text-[#5E666B]'
            }`}
          >
            {diagnostics.speechVad}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-[#141719] border border-[#1E2225] text-center font-mono">
          <div className="flex items-center justify-center gap-1">
            <span className="text-[10px] text-[#5E666B] uppercase block">RMS Energy</span>
            {isOffline && <span className="text-[8px] px-1 rounded bg-[#1E2225] text-[#5E666B]">STALE</span>}
          </div>
          <span className={`text-[12px] font-semibold mt-0.5 block ${isOffline ? 'text-[#5E666B]' : 'text-[#F2F4F5]'}`}>
            {diagnostics.rmsEnergy}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-[#141719] border border-[#1E2225] text-center font-mono">
          <div className="flex items-center justify-center gap-1">
            <span className="text-[10px] text-[#5E666B] uppercase block">Inference</span>
            {isOffline && <span className="text-[8px] px-1 rounded bg-[#1E2225] text-[#5E666B]">STALE</span>}
          </div>
          <span className={`text-[12px] font-semibold mt-0.5 block ${isOffline ? 'text-[#5E666B]' : 'text-[#F2F4F5]'}`}>
            {diagnostics.inferenceMs} ms
          </span>
        </div>

        <div className="p-2 rounded-lg bg-[#141719] border border-[#1E2225] text-center font-mono">
          <div className="flex items-center justify-center gap-1">
            <span className="text-[10px] text-[#5E666B] uppercase block">Turnaround</span>
            {isOffline && <span className="text-[8px] px-1 rounded bg-[#1E2225] text-[#5E666B]">STALE</span>}
          </div>
          <span className={`text-[12px] font-semibold mt-0.5 block truncate ${isOffline ? 'text-[#5E666B]' : 'text-[#FF4713]'}`}>
            {diagnostics.turnaroundMs}ms ({diagnostics.turnaroundLabel})
          </span>
        </div>

        <div className="p-2 rounded-lg bg-[#141719] border border-[#1E2225] text-center font-mono">
          <div className="flex items-center justify-center gap-1">
            <span className="text-[10px] text-[#5E666B] uppercase block">Codec</span>
            {isOffline && <span className="text-[8px] px-1 rounded bg-[#1E2225] text-[#5E666B]">STALE</span>}
          </div>
          <span className={`text-[11.5px] font-semibold mt-0.5 block truncate ${isOffline ? 'text-[#5E666B]' : 'text-[#9BA3A8]'}`}>
            {diagnostics.codec}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-[#141719] border border-[#1E2225] text-center font-mono">
          <div className="flex items-center justify-center gap-1">
            <span className="text-[10px] text-[#5E666B] uppercase block">Sample Rate</span>
            {isOffline && <span className="text-[8px] px-1 rounded bg-[#1E2225] text-[#5E666B]">STALE</span>}
          </div>
          <span className={`text-[11.5px] font-semibold mt-0.5 block truncate ${isOffline ? 'text-[#5E666B]' : 'text-[#9BA3A8]'}`}>
            {diagnostics.sampleRate}
          </span>
        </div>
      </div>
    </div>
  );
});
