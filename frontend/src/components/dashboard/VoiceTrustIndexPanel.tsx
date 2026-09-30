import React, { useEffect, useState, useRef } from 'react';
import type { VerdictType, RulesConfig } from '../../types/dashboard';

interface VoiceTrustIndexPanelProps {
  score: number; // 0 - 100
  verdict: VerdictType;
  sessionId?: string;
  rawLogit: number; // 0.0 - 1.0 (P(Spoof))
  confidence?: number;
  inferenceMs?: number;
  rules?: RulesConfig;
}

export const VoiceTrustIndexPanel: React.FC<VoiceTrustIndexPanelProps> = React.memo(({
  score = 88,
  verdict = 'ALLOW',
  rawLogit = 0.0841,
  inferenceMs = 0.0,
  rules,
}) => {
  // Smooth transition for the gauge needle & readout
  const [currentVal, setCurrentVal] = useState(score);
  const currentValRef = useRef(score);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = currentValRef.current;
    const target = Math.max(0, Math.min(100, score));

    if (Math.abs(start - target) < 0.1) {
      currentValRef.current = target;
      setCurrentVal(target);
      return;
    }

    let startTime: number | null = null;
    const duration = 320;

    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = start + (target - start) * ease;
      currentValRef.current = val;
      setCurrentVal(val);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        currentValRef.current = target;
        setCurrentVal(target);
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [score]);

  // Smooth rolling number transition for spoof probability
  const [currentSpoof, setCurrentSpoof] = useState(rawLogit);
  const currentSpoofRef = useRef(rawLogit);
  const spoofRafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = currentSpoofRef.current;
    const target = Math.max(0, Math.min(1, rawLogit));

    if (Math.abs(start - target) < 0.001) {
      currentSpoofRef.current = target;
      setCurrentSpoof(target);
      return;
    }

    let startTime: number | null = null;
    const duration = 300;

    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = start + (target - start) * ease;
      currentSpoofRef.current = val;
      setCurrentSpoof(val);

      if (progress < 1) {
        spoofRafRef.current = requestAnimationFrame(step);
      } else {
        currentSpoofRef.current = target;
        setCurrentSpoof(target);
      }
    };

    if (spoofRafRef.current) cancelAnimationFrame(spoofRafRef.current);
    spoofRafRef.current = requestAnimationFrame(step);

    return () => {
      if (spoofRafRef.current) cancelAnimationFrame(spoofRafRef.current);
    };
  }, [rawLogit]);

  // Calibration geometry: Symmetrical 220° sweep centered at vertical
  const radius = 80;
  const startAngle = -110;
  const endAngle = 110;
  const totalAngle = endAngle - startAngle; // 220°

  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (centerX: number, centerY: number, r: number, sAngle: number, eAngle: number) => {
    const start = polarToCartesian(centerX, centerY, r, sAngle);
    const end = polarToCartesian(centerX, centerY, r, eAngle);
    const sweepAngle = eAngle - sAngle;
    const largeArcFlag = sweepAngle > 180 ? '1' : '0';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  const redBandEnd = Math.round((1 - (rules?.critical_deepfake_threshold ?? 0.65)) * 100);
  const amberBandEnd = Math.round((1 - (rules?.bonafide_allow_threshold ?? 0.35)) * 100);

  const redEndAngle = startAngle + (redBandEnd / 100) * totalAngle;
  const amberEndAngle = startAngle + (amberBandEnd / 100) * totalAngle;

  const needleAngle = startAngle + (Math.max(0, Math.min(100, currentVal)) / 100) * totalAngle;
  const needleTip = polarToCartesian(110, 110, radius - 10, needleAngle);
  const needleBase1 = polarToCartesian(110, 110, 6, needleAngle + 90);
  const needleBase2 = polarToCartesian(110, 110, 6, needleAngle - 90);

  const isAlert = verdict === 'ALERT' || rawLogit >= 0.65 || currentVal < redBandEnd;
  const isWarn = !isAlert && (verdict === 'WARN' || rawLogit >= 0.35 || currentVal < amberBandEnd);

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#181B1F] border border-[#D8D3C8] dark:border-[#2B3037] rounded-sm p-5 flex flex-col justify-between select-none shadow-xs transition-colors">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-[#D8D3C8] dark:border-[#2B3037] pb-3">
        <div>
          <h2 className="text-[13px] font-bold text-[#1A1D20] dark:text-[#F0EEE9] uppercase tracking-wider font-mono">
            Voice Trust Index
          </h2>
          <p className="text-[11px] text-[#525860] dark:text-[#A2A8B0] mt-0.5">
            Calibrated neural confidence scale (0–100)
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono flex items-center gap-1.5 bg-[#EAF5EE] dark:bg-[#0E2316] text-[#165A34] dark:text-[#34D399] border border-[#9CD1B2] dark:border-[#1B5233]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#165A34] dark:bg-[#34D399] animate-pulse" />
          LIVE TELEMETRY
        </span>
      </div>

      {/* Center Gauge with Smooth Spring Needle */}
      <div className="flex flex-col items-center justify-center py-4">
        <svg viewBox="0 0 220 170" className="w-56 h-44 overflow-visible">
          {/* Background Track */}
          <path
            d={describeArc(110, 110, radius, startAngle, endAngle)}
            fill="none"
            className="stroke-[#D8D3C8] dark:stroke-[#2B3037]"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Red Band (Deepfake / Threat) */}
          <path
            d={describeArc(110, 110, radius, startAngle, redEndAngle)}
            fill="none"
            className="stroke-[#E79E9E] dark:stroke-[#941818]"
            strokeWidth="8"
            strokeOpacity="0.8"
          />

          {/* Amber Band (Suspicious / Jitter) */}
          <path
            d={describeArc(110, 110, radius, redEndAngle, amberEndAngle)}
            fill="none"
            className="stroke-[#E5BA78] dark:stroke-[#924A00]"
            strokeWidth="8"
            strokeOpacity="0.8"
          />

          {/* Green Band (Allow / Low Risk) */}
          <path
            d={describeArc(110, 110, radius, amberEndAngle, endAngle)}
            fill="none"
            className="stroke-[#9CD1B2] dark:stroke-[#165A34]"
            strokeWidth="8"
            strokeOpacity="0.8"
          />
          {/* Subtle concentric calibration tick ring */}
          <circle
            cx="110"
            cy="110"
            r={radius + 10}
            fill="none"
            stroke="currentColor"
            strokeDasharray="2 6"
            className="text-[#D8D3C8] dark:text-[#2B3037] opacity-60"
            strokeWidth="1"
          />

          {/* Needle with Mechanical Taper & Smooth RAF Interpolation */}
          <polygon
            points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
            className={`transition-colors duration-200 ${isAlert ? 'fill-[#941818] dark:fill-[#F87171]' : isWarn ? 'fill-[#924A00] dark:fill-[#FBBF24]' : 'fill-[#165A34] dark:fill-[#34D399]'}`}
          />
          {/* Animated Needle Tip Glowing Indicator */}
          <circle
            cx={needleTip.x}
            cy={needleTip.y}
            r="3.5"
            className={`${isAlert ? 'fill-[#941818] dark:fill-[#F87171]' : isWarn ? 'fill-[#924A00] dark:fill-[#FBBF24]' : 'fill-[#165A34] dark:fill-[#34D399]'} animate-ping opacity-75`}
          />
          <circle
            cx={needleTip.x}
            cy={needleTip.y}
            r="2.5"
            className={isAlert ? 'fill-[#941818] dark:fill-[#F87171]' : isWarn ? 'fill-[#924A00] dark:fill-[#FBBF24]' : 'fill-[#165A34] dark:fill-[#34D399]'}
          />

          {/* Center Hub with Concentric Radar Pulse */}
          <circle cx="110" cy="110" r="14" fill="none" stroke="currentColor" strokeWidth="1" className="text-[#1A1D20] dark:text-[#F0EEE9] opacity-20 animate-radar" />
          <circle cx="110" cy="110" r="5" className="fill-[#1A1D20] dark:fill-[#F0EEE9]" />
          <circle cx="110" cy="110" r="2.5" className="fill-[#FFFFFF] dark:fill-[#181B1F]" />
        </svg>

        {/* Big Readout with Fluid Rolling Interpolation */}
        <div className="text-center -mt-6">
          <div
            className={`text-[36px] font-bold font-mono tracking-tight transition-colors duration-200 ${
              isAlert
                ? 'text-[#941818] dark:text-[#F87171]'
                : isWarn
                ? 'text-[#924A00] dark:text-[#FBBF24]'
                : 'text-[#165A34] dark:text-[#34D399]'
            }`}
          >
            {Math.round(currentVal)}<span className="text-[18px] text-[#78808A] dark:text-[#6E7681] font-normal">/100</span>
          </div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#525860] dark:text-[#A2A8B0] mt-0.5">
            {isAlert ? 'Threat Detected' : isWarn ? 'Suspicious Drift' : 'Low Risk Cleared'}
          </div>
        </div>
      </div>

      {/* Footer Metrics: Spoof Probability & Neural Latency */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#D8D3C8] dark:border-[#2B3037] text-center font-mono">
        <div className="p-2.5 rounded-sm bg-[#F7F5F0] dark:bg-[#1F2328] border border-[#D8D3C8] dark:border-[#2B3037]">
          <div className="text-[10px] text-[#525860] dark:text-[#A2A8B0] uppercase">Spoof Probability</div>
          <div className="text-[15px] font-bold text-[#1A1D20] dark:text-[#F0EEE9] mt-0.5 tabular-nums">
            {(currentSpoof * 100).toFixed(1)}%
          </div>
        </div>

        <div className="p-2.5 rounded-sm bg-[#F7F5F0] dark:bg-[#1F2328] border border-[#D8D3C8] dark:border-[#2B3037]">
          <div className="text-[10px] text-[#525860] dark:text-[#A2A8B0] uppercase">Inference Latency</div>
          <div className="text-[15px] font-bold text-[#1A1D20] dark:text-[#F0EEE9] mt-0.5 tabular-nums">
            {inferenceMs > 0 ? `${inferenceMs.toFixed(1)} ms` : '0.0 ms (Live)'}
          </div>
        </div>
      </div>
    </div>
  );
});
