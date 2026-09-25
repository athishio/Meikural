import React, { useState, useEffect } from 'react';
import { motion, useSpring } from 'framer-motion';
import { Shield, ChevronDown, Info, ArrowDown } from 'lucide-react';
import type { RiskLevel } from '../../types/dashboard';

interface RiskScoreGaugeProps {
  score?: number;
  maxScore?: number;
  label?: string;
  level?: RiskLevel;
  deltaPercent?: number;
  quote?: string;
}

export const RiskScoreGauge: React.FC<RiskScoreGaugeProps> = ({
  score = 67,
  maxScore = 100,
  label = 'Medium Risk',
  deltaPercent = 12,
  quote = 'Proactive detection. A safer tomorrow.',
}) => {
  const [timeframe, setTimeframe] = useState('This Week');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  // Gauge angle sweep: from -190 degrees (left) to 10 degrees (right)
  // Total span = 200 degrees
  const minAngle = -190;
  const maxAngle = 10;
  const targetAngle = minAngle + (score / maxScore) * (maxAngle - minAngle);

  const needleSpring = useSpring(minAngle, {
    stiffness: 120,
    damping: 14,
  });

  useEffect(() => {
    needleSpring.set(targetAngle);

    // Animate score counter
    let startTime: number | null = null;
    const duration = 1100;
    const anim = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(score * ease));
      if (progress < 1) requestAnimationFrame(anim);
      else setAnimatedScore(score);
    };
    requestAnimationFrame(anim);
  }, [score, targetAngle, needleSpring]);

  // Radius definitions for SVG radial gauge
  const cx = 150;
  const cy = 150;
  const r = 105;

  // Semicircular arc ticks
  const totalTicks = 28;
  const ticks = Array.from({ length: totalTicks }).map((_, i) => {
    const angle = minAngle + (i / (totalTicks - 1)) * (maxAngle - minAngle);
    const rad = (angle * Math.PI) / 180;
    const x1 = cx + (r + 14) * Math.cos(rad);
    const y1 = cy + (r + 14) * Math.sin(rad);
    const x2 = cx + (r + 20) * Math.cos(rad);
    const y2 = cy + (r + 20) * Math.sin(rad);
    const percent = (i / (totalTicks - 1)) * 100;
    const color = percent < 38 ? '#22C55E' : percent < 70 ? '#F59E0B' : '#EF4444';
    return { x1, y1, x2, y2, angle, color };
  });

  return (
    <div className="relative bg-[#0D0F11] border border-[#1E2225] hover:border-[#2A2F33] rounded-[16px] p-6 shadow-card flex flex-col justify-between transition-all duration-200">
      {/* Top Title & Dropdown */}
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#9BA3A8]" strokeWidth={1.5} />
            <h2 className="text-[15px] font-semibold text-[#F2F4F5]">Risk Score</h2>
          </div>
          <span className="text-[12px] text-[#9BA3A8] font-normal mt-0.5">
            Overall voice authentication risk level
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 bg-[#141719] border border-[#1E2225] hover:border-[#2A2F33] text-[#F2F4F5] px-3 py-1 rounded-lg text-[12px] font-medium transition-colors"
          >
            <span>{timeframe}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#9BA3A8]" strokeWidth={1.5} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-28 bg-[#0D0F11] border border-[#1E2225] rounded-xl shadow-2xl p-1 z-30">
              {['This Week', 'Today', 'This Month'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    setTimeframe(tf);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-[12px] rounded-md transition-colors ${
                    timeframe === tf
                      ? 'bg-[#141719] text-[#F2F4F5] font-semibold'
                      : 'text-[#9BA3A8] hover:text-[#F2F4F5]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Radial Semicircular Gauge Display */}
      <div className="relative w-full flex flex-col items-center justify-center pt-2">
        <div className="relative w-[300px] h-[190px]">
          <svg viewBox="0 0 300 200" className="w-full h-full overflow-visible select-none">
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22C55E" />
                <stop offset="42%" stopColor="#22C55E" />
                <stop offset="55%" stopColor="#F59E0B" />
                <stop offset="75%" stopColor="#F59E0B" />
                <stop offset="90%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#EF4444" />
              </linearGradient>

              {/* Needle drop shadow */}
              <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#F59E0B" floodOpacity="0.8" />
              </filter>
            </defs>

            {/* Background Arc Track */}
            <path
              d="M 45 150 A 105 105 0 0 1 255 150"
              fill="none"
              stroke="#141719"
              strokeWidth="14"
              strokeLinecap="round"
            />

            {/* Segmented Gradient Glow Arc */}
            <motion.path
              d="M 45 150 A 105 105 0 0 1 255 150"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="14"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.0, ease: 'easeOut' }}
            />

            {/* Outer Radial Tick Marks */}
            {ticks.map((t, idx) => (
              <motion.line
                key={idx}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={t.color}
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ duration: 0.3, delay: idx * 0.01 }}
              />
            ))}

            {/* Zone Labels */}
            <text x="40" y="105" fill="#22C55E" fontSize="10" fontWeight="600" textAnchor="middle">
              LOW
            </text>
            <text x="150" y="24" fill="#F59E0B" fontSize="11" fontWeight="700" textAnchor="middle">
              MEDIUM
            </text>
            <text x="260" y="105" fill="#EF4444" fontSize="10" fontWeight="600" textAnchor="middle">
              HIGH
            </text>

            {/* Animated Needle Layer */}
            <motion.g style={{ rotate: needleSpring, originX: '150px', originY: '150px' }}>
              {/* Needle Stem */}
              <line
                x1="150"
                y1="150"
                x2="245"
                y2="150"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="url(#needleGlow)"
              />
              {/* Needle Tip Arrowhead/Cap */}
              <circle
                cx="245"
                cy="150"
                r="3.5"
                fill={score < 35 ? '#22C55E' : score < 65 ? '#F59E0B' : '#EF4444'}
              />
              {/* Needle Base Pivot Circle */}
              <circle cx="150" cy="150" r="7" fill="#1E2225" stroke="#F2F4F5" strokeWidth="2" />
            </motion.g>
          </svg>

          {/* Center Text Score & Level Readout (High-contrast for demo viewing) */}
          <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-center text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span
                className={`text-[52px] font-bold tracking-tight leading-none tabular-nums ${
                  score < 35 ? 'text-[#22C55E]' : score < 65 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                }`}
              >
                {animatedScore}
              </span>
              <span className="text-[18px] text-[#5E666B] font-medium">
                /{maxScore}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-center">
              <span
                className={`px-3 py-1 rounded-full text-[12px] font-bold uppercase tracking-wider shadow-md transition-all ${
                  score < 35
                    ? 'bg-[#052e16] text-[#22C55E] border border-[#22C55E]/40'
                    : score < 65
                    ? 'bg-[#451a03] text-[#F59E0B] border border-[#F59E0B]/40'
                    : 'bg-[#450a0a] text-[#EF4444] border border-[#EF4444]/60 animate-pulse'
                }`}
              >
                {score < 35
                  ? `ALLOW • ${label.toUpperCase()}`
                  : score < 65
                  ? `WARN • ${label.toUpperCase()}`
                  : `STEP-UP • ${label.toUpperCase()}`}
              </span>
            </div>
          </div>
        </div>

        {/* Info Chip Below Meter */}
        <div className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-[#141719] border border-[#1E2225] rounded-full text-[12px] text-[#9BA3A8]">
          <Info className="w-3.5 h-3.5 text-[#9BA3A8]" strokeWidth={1.5} />
          <span>
            Risk level is{' '}
            <strong className="text-[#22C55E] font-semibold">
              {deltaPercent}% lower
            </strong>{' '}
            than last week
          </span>
          <ArrowDown className="w-3 h-3 text-[#22C55E] stroke-[2.5]" />
        </div>

        {/* Italic Bottom Microcopy */}
        <p className="text-[11px] text-[#5E666B] italic mt-3 text-center">
          &ldquo;{quote}&rdquo;
        </p>
      </div>
    </div>
  );
};
