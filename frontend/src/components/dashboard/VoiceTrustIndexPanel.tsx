import React, { useEffect, useState, useRef } from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, Fingerprint } from 'lucide-react';
import type { VerdictType, RulesConfig } from '../../types/dashboard';

interface VoiceTrustIndexPanelProps {
  score: number; // 0 - 100
  verdict: VerdictType;
  sessionId: string;
  rawLogit: number; // 0.0 - 1.0 (P(Spoof))
  confidence: number; // percentage
  rules?: RulesConfig;
  onTriggerChallenge?: () => void;
}

export const VoiceTrustIndexPanel: React.FC<VoiceTrustIndexPanelProps> = React.memo(({
  score = 88,
  verdict = 'ALLOW',
  sessionId = 'call_02db11a4',
  rawLogit = 0.0841,
  confidence = 98.4,
  rules,
}) => {
  // Spring-synchronized single source of truth for needle angle & number readout
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
    const duration = 500; // Spring-like smooth transition

    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      // easeOutCubic
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

  // Calibration geometry: Symmetrical 220° sweep centered at vertical (12 o'clock = 0°)
  // startAngle = -110° (down-left, red), endAngle = +110° (down-right, green)
  const radius = 86;
  const strokeWidth = 9;
  const startAngle = -110;
  const endAngle = 110;
  const totalAngle = endAngle - startAngle; // 220°

  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    // 0° is 12 o'clock (vertical). Subtract 90° so 0° aligns with -Y axis.
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

  // Threshold domain mapping:
  // Spoof probability >= critical (e.g. 0.65) -> Trust <= 35 (RED)
  // Spoof probability 0.35 to 0.65 -> Trust 35 to 65 (AMBER)
  // Spoof probability <= allow (e.g. 0.35) -> Trust >= 65 (GREEN)
  const redBandEnd = Math.round((1 - (rules?.critical_deepfake_threshold ?? 0.65)) * 100); // 35
  const amberBandEnd = Math.round((1 - (rules?.bonafide_allow_threshold ?? 0.35)) * 100); // 65

  const redEndAngle = startAngle + (redBandEnd / 100) * totalAngle; // -33°
  const amberEndAngle = startAngle + (amberBandEnd / 100) * totalAngle; // +33°

  // Single source of truth calculation:
  // Value 88 -> needleAngle = -110 + 0.88 * 220 = +83.6° (deep in green zone [+33°, +110°])
  const needleAngle = startAngle + (Math.max(0, Math.min(100, currentVal)) / 100) * totalAngle;
  const displayInt = Math.round(currentVal);

  const getVerdictStyle = () => {
    switch (verdict) {
      case 'ALLOW':
        return {
          text: 'ALLOW',
          bg: 'bg-[#22C55E]/10',
          border: 'border-[#22C55E]/30',
          color: 'text-[#22C55E]',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />,
        };
      case 'WARN':
        return {
          text: 'WARN',
          bg: 'bg-[#F59E0B]/10',
          border: 'border-[#F59E0B]/30',
          color: 'text-[#F59E0B]',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />,
        };
      case 'ALERT':
      default:
        return {
          text: 'ALERT',
          bg: 'bg-[#EF4444]/10',
          border: 'border-[#EF4444]/30',
          color: 'text-[#EF4444]',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-[#EF4444]" />,
        };
    }
  };

  const vStyle = getVerdictStyle();

  return (
    <div className="relative bg-[#0D0F11] border border-[#1E2225] hover:border-[#2A2F33] rounded-[16px] p-5 shadow-card flex flex-col justify-between transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-[#9BA3A8]" strokeWidth={1.5} />
          <h2 className="text-[14px] font-semibold text-[#F2F4F5]">Voice Trust Index</h2>
        </div>

        {/* Verdict Pill */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider font-mono border ${vStyle.bg} ${vStyle.border} ${vStyle.color} shadow-sm`}
        >
          {vStyle.icon}
          {vStyle.text}
        </span>
      </div>

      {/* Semicircular Radial Gauge */}
      <div className="relative flex flex-col items-center justify-center my-1">
        <div className="w-[240px] h-[155px] relative flex items-center justify-center">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 240 160">
            <defs>
              <filter id="gaugeShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000000" floodOpacity="0.5" />
              </filter>
            </defs>

            {/* Background Track Arc */}
            <path
              d={describeArc(120, 125, radius, startAngle, endAngle)}
              fill="none"
              stroke="#141719"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Outer Tick Marks */}
            {Array.from({ length: 23 }).map((_, idx) => {
              const tickAngle = startAngle + (idx / 22) * totalAngle;
              const innerPos = polarToCartesian(120, 125, radius + 8, tickAngle);
              const outerPos = polarToCartesian(120, 125, radius + (idx % 5 === 0 ? 15 : 12), tickAngle);
              const isMajor = idx % 5 === 0;
              const tickVal = (idx / 22) * 100;
              const tickColor = tickVal <= redBandEnd ? '#EF4444' : tickVal <= amberBandEnd ? '#F59E0B' : '#22C55E';
              return (
                <line
                  key={idx}
                  x1={innerPos.x}
                  y1={innerPos.y}
                  x2={outerPos.x}
                  y2={outerPos.y}
                  stroke={isMajor ? tickColor : '#2A2F33'}
                  strokeWidth={isMajor ? 1.5 : 1}
                  strokeOpacity={isMajor ? 0.7 : 0.4}
                />
              );
            })}

            {/* 3 Contiguous Arc Color Bands matching Rules & Thresholds Domain */}
            {/* Red Band: 0 to redBandEnd (0 - 35) */}
            <path
              d={describeArc(120, 125, radius, startAngle, redEndAngle)}
              fill="none"
              stroke="#EF4444"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeOpacity="0.85"
            />

            {/* Amber Band: redBandEnd to amberBandEnd (35 - 65) */}
            <path
              d={describeArc(120, 125, radius, redEndAngle, amberEndAngle)}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={strokeWidth}
              strokeOpacity="0.85"
            />

            {/* Green Band: amberBandEnd to 100 (65 - 100) */}
            <path
              d={describeArc(120, 125, radius, amberEndAngle, endAngle)}
              fill="none"
              stroke="#22C55E"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeOpacity="0.9"
            />

            {/* Active Needle Pivot & Arm — Positioned by needleAngle in sync with displayInt */}
            <g
              transform={`translate(120, 125) rotate(${needleAngle})`}
              className="will-change-transform"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={-(radius - 12)}
                stroke="#F2F4F5"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8))' }}
              />
              <circle cx="0" cy="0" r="6" fill="#F2F4F5" stroke="#1E2225" strokeWidth="2" />
              <circle cx="0" cy="0" r="2.5" fill="#FF4713" />
            </g>
          </svg>

          {/* Central Live Score Readout — Derived synchronously from the same currentVal */}
          <div className="absolute top-[75px] flex flex-col items-center select-none pointer-events-none">
            <span className="text-[36px] font-extrabold tracking-tight font-mono text-[#F2F4F5] tabular-nums leading-none">
              {displayInt}
            </span>
            <span className="text-[11px] font-mono text-[#5E666B] mt-1 font-semibold uppercase tracking-wider">
              / 100 Index
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Fields (Session ID, AASIST Raw Logit, AASIST Confidence) */}
      <div className="mt-2 pt-3 border-t border-[#1E2225] space-y-1.5 font-mono text-[11px]">
        <div className="flex items-center justify-between text-[#9BA3A8]">
          <span className="text-[#5E666B]">Session ID:</span>
          <span className="text-[#F2F4F5] truncate max-w-[140px]">{sessionId}</span>
        </div>

        <div className="flex items-center justify-between text-[#9BA3A8]">
          <span className="text-[#5E666B]">AASIST Raw Logit P(Spoof):</span>
          <span className={rawLogit > 0.5 ? 'text-[#EF4444] font-semibold' : 'text-[#22C55E] font-semibold'}>
            {rawLogit.toFixed(4)}
          </span>
        </div>

        <div className="flex items-center justify-between text-[#9BA3A8]">
          <span className="text-[#5E666B]">AASIST Confidence:</span>
          <span className="text-[#F2F4F5] font-semibold">{confidence.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
});
