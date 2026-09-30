import React, { useEffect, useRef, useState } from 'react';
import { Activity, Mic, MicOff, Volume2, Zap } from 'lucide-react';

interface LiveAudioVisualizerProps {
  isMonitoring: boolean;
  analyserNode?: AnalyserNode | null;
  onToggleMonitoring: () => void;
  onCaptureSample?: () => void;
  isCapturing?: boolean;
}

export const LiveAudioVisualizer: React.FC<LiveAudioVisualizerProps> = ({
  isMonitoring,
  analyserNode,
  onToggleMonitoring,
  onCaptureSample,
  isCapturing = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [rmsLevel, setRmsLevel] = useState<number>(-45);
  const [speechActive, setSpeechActive] = useState<boolean>(false);
  const [displayMode, setDisplayMode] = useState<'spectrum' | 'oscilloscope'>('spectrum');

  // Elapsed timer
  useEffect(() => {
    let interval: any = null;
    if (isMonitoring) {
      setSeconds(0);
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring]);

  // Audio rendering animation loop (60 FPS)
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(analyserNode ? analyserNode.frequencyBinCount : 128);
    const timeArray = new Uint8Array(analyserNode ? analyserNode.fftSize : 256);

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains('dark');
      const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
      const accentColor = isDark ? '#34D399' : '#165A34';
      const warnColor = isDark ? '#FBBF24' : '#924A00';
      const alertColor = isDark ? '#F87171' : '#941818';

      // 1. Draw forensic background grid lines
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      const gridStep = 20;
      for (let x = 0; x < width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (isMonitoring && analyserNode) {
        analyserNode.getByteFrequencyData(dataArray);
        analyserNode.getByteTimeDomainData(timeArray);

        // Calculate simple RMS
        let sumSquares = 0;
        for (let i = 0; i < timeArray.length; i++) {
          const norm = (timeArray[i] - 128) / 128;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / timeArray.length);
        const db = Math.max(-60, Math.round(20 * Math.log10(rms + 1e-4)));
        setRmsLevel(db);
        setSpeechActive(db > -38);

        if (displayMode === 'spectrum') {
          // Draw 36 Spectrum bars
          const numBars = 36;
          const barWidth = (width - (numBars - 1) * 3) / numBars;
          const step = Math.floor(dataArray.length / numBars);

          for (let i = 0; i < numBars; i++) {
            const val = dataArray[i * step] / 255.0;
            const barHeight = Math.max(3, val * (height - 12));
            const x = i * (barWidth + 3);
            const y = height - barHeight;

            // Gradient per bar based on frequency / amplitude
            const barColor = val > 0.75 ? alertColor : val > 0.45 ? warnColor : accentColor;
            ctx.fillStyle = barColor;
            ctx.fillRect(x, y, barWidth, barHeight);

            // Peak indicator dot
            ctx.fillStyle = isDark ? '#F0EEE9' : '#1A1D20';
            ctx.fillRect(x, Math.max(0, y - 3), barWidth, 1.5);
          }
        } else {
          // Draw Oscilloscope Waveform
          ctx.beginPath();
          ctx.lineWidth = 2;
          ctx.strokeStyle = speechActive ? accentColor : (isDark ? '#6E7681' : '#78808A');
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          const sliceWidth = width / timeArray.length;
          let x = 0;

          for (let i = 0; i < timeArray.length; i++) {
            const v = timeArray[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }
          ctx.stroke();
        }
      } else {
        // Idle standby mode: subtle organic breathing sine wave
        const now = Date.now() * 0.003;
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isDark ? 'rgba(110, 118, 129, 0.4)' : 'rgba(120, 128, 138, 0.4)';
        for (let x = 0; x < width; x += 2) {
          const y = height / 2 + Math.sin(x * 0.04 + now) * 4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isMonitoring, analyserNode, displayMode, speechActive]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-[#FAF9F5] dark:bg-[#15171A] border border-[#D8D3C8] dark:border-[#2B3037] rounded-sm p-3.5 space-y-3 font-mono transition-colors">
      {/* Visualizer Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8D3C8] dark:border-[#2B3037] pb-2 text-[11px]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold text-[#1A1D20] dark:text-[#F0EEE9]">
            <Activity className="w-3.5 h-3.5 text-[#165A34] dark:text-[#34D399]" />
            <span>Live Acoustic Oscilloscope</span>
          </div>

          {isMonitoring && (
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-sm bg-[#EAF5EE] dark:bg-[#0E2316] text-[#165A34] dark:text-[#34D399] border border-[#9CD1B2] dark:border-[#1B5233] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#165A34] dark:bg-[#34D399] animate-ping" />
              STREAMING 20ms G.711 /ws/audio
            </span>
          )}
        </div>

        {/* Telemetry Readouts & Display Mode Switch */}
        <div className="flex items-center gap-3">
          {isMonitoring && (
            <>
              <span className="text-[10px] text-[#525860] dark:text-[#A2A8B0]">
                RMS: <strong className={speechActive ? 'text-[#165A34] dark:text-[#34D399]' : ''}>{rmsLevel} dB</strong>
              </span>
              <span className="text-[10px] text-[#525860] dark:text-[#A2A8B0]">
                VAD: <strong className={speechActive ? 'text-[#165A34] dark:text-[#34D399]' : 'text-[#78808A]'}>{speechActive ? 'SPEECH DETECTED' : 'QUIET'}</strong>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-[#FFFFFF] dark:bg-[#181B1F] border border-[#D8D3C8] dark:border-[#2B3037] rounded-sm font-bold text-[#1A1D20] dark:text-[#F0EEE9]">
                {formatTimer(seconds)}
              </span>
            </>
          )}

          {/* Toggle Spectrum / Waveform */}
          <div className="flex items-center gap-0.5 bg-[#FFFFFF] dark:bg-[#181B1F] border border-[#D8D3C8] dark:border-[#2B3037] p-0.5 rounded-sm text-[10px]">
            <button
              onClick={() => setDisplayMode('spectrum')}
              className={`px-1.5 py-0.5 rounded-xs transition-colors cursor-pointer ${
                displayMode === 'spectrum'
                  ? 'bg-[#EFECE6] dark:bg-[#2B3037] text-[#1A1D20] dark:text-[#F0EEE9] font-bold'
                  : 'text-[#78808A] hover:text-[#1A1D20] dark:hover:text-[#F0EEE9]'
              }`}
            >
              Spectrum
            </button>
            <button
              onClick={() => setDisplayMode('oscilloscope')}
              className={`px-1.5 py-0.5 rounded-xs transition-colors cursor-pointer ${
                displayMode === 'oscilloscope'
                  ? 'bg-[#EFECE6] dark:bg-[#2B3037] text-[#1A1D20] dark:text-[#F0EEE9] font-bold'
                  : 'text-[#78808A] hover:text-[#1A1D20] dark:hover:text-[#F0EEE9]'
              }`}
            >
              Waveform
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Oscilloscope / Spectrum Canvas */}
      <div className="relative h-20 w-full rounded-sm overflow-hidden bg-[#FFFFFF] dark:bg-[#181B1F] border border-[#D8D3C8] dark:border-[#2B3037] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={640}
          height={80}
          className="w-full h-full block"
        />

        {/* Ambient watermark status */}
        {!isMonitoring && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[11px] text-[#78808A] dark:text-[#6E7681] gap-2">
            <Volume2 className="w-3.5 h-3.5 opacity-60" />
            <span>Microphone standby · Click "Live Microphone" to stream real-time speech</span>
          </div>
        )}
      </div>

      {/* Action Footer Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px]">
        <span className="text-[10px] text-[#78808A] dark:text-[#6E7681]">
          Calibrated Live Mic Cutoff: <strong>LLR -8.94</strong> · G.711 Telephony Emulation
        </span>

        <div className="flex items-center gap-2">
          {isMonitoring && onCaptureSample && (
            <button
              onClick={onCaptureSample}
              disabled={isCapturing}
              className="px-2.5 py-1 rounded-sm bg-[#FFFFFF] dark:bg-[#181B1F] hover:bg-[#EFECE6] dark:hover:bg-[#242930] text-[#1A1D20] dark:text-[#F0EEE9] border border-[#D8D3C8] dark:border-[#2B3037] font-semibold text-[11px] flex items-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer shadow-xs disabled:opacity-50"
              title="Capture 4-second snapshot of your speech and score with calibrated live_mic threshold"
            >
              <Zap className="w-3 h-3 text-[#924A00] dark:text-[#FBBF24]" />
              <span>{isCapturing ? 'Analyzing...' : 'Snapshot & Score Sample'}</span>
            </button>
          )}

          <button
            onClick={onToggleMonitoring}
            className={`px-3 py-1 rounded-sm text-[11px] font-semibold flex items-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer shadow-xs border ${
              isMonitoring
                ? 'bg-[#FDEFEF] dark:bg-[#2B0F0F] text-[#941818] dark:text-[#F87171] border-[#E79E9E] dark:border-[#5E1A1A] animate-pulse'
                : 'bg-[#1A1D20] dark:bg-[#F0EEE9] text-white dark:text-[#121417] border-[#1A1D20] dark:border-[#F0EEE9] hover:bg-[#33383F] dark:hover:bg-[#FFFFFF]'
            }`}
          >
            {isMonitoring ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>Stop Stream</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>Start Live Mic</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
