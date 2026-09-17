import React, { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';

interface ThreatTimelineProps {
  score: number;
}

interface TimelinePoint {
  timeOffset: string;
  score: number;
  timestamp: string;
}

export const ThreatTimeline: React.FC<ThreatTimelineProps> = React.memo(({ score }) => {
  const [windowRange, setWindowRange] = useState<'30s' | '5m' | '1h'>('30s');
  const [hoveredPoint, setHoveredPoint] = useState<TimelinePoint | null>(null);

  // Generate smooth rolling trajectory according to window
  const points: TimelinePoint[] = useMemo(() => {
    const pts: TimelinePoint[] = [];
    const count = windowRange === '30s' ? 30 : windowRange === '5m' ? 40 : 50;
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const offsetSec = (count - i) * (windowRange === '30s' ? 1 : windowRange === '5m' ? 7.5 : 72);
      const timeStr = `-${Math.round(offsetSec)}s`;
      const dateStr = new Date(now - offsetSec * 1000).toLocaleTimeString();
      // Wave shape influenced by current score
      const base = score;
      const noise = Math.sin(i * 0.4) * 0.08 + Math.cos(i * 0.2) * 0.05;
      const ptScore = Math.max(0.04, Math.min(0.98, base + noise * (1 - i / count)));
      pts.push({
        timeOffset: timeStr,
        score: Math.round(ptScore * 1000) / 1000,
        timestamp: dateStr,
      });
    }
    return pts;
  }, [windowRange, score]);

  const width = 480;
  const height = 150;
  const padding = 20;

  const pathData = useMemo(() => {
    if (points.length === 0) return '';
    const sliceWidth = (width - padding * 2) / (points.length - 1);
    let d = '';

    points.forEach((pt, i) => {
      const x = padding + i * sliceWidth;
      // High score = high threat (drawn higher or lower; higher threat drawn near top)
      const y = height - padding - pt.score * (height - padding * 2);
      if (i === 0) d += `M ${x} ${y}`;
      else d += ` L ${x} ${y}`;
    });

    return d;
  }, [points]);

  const areaData = useMemo(() => {
    if (!pathData) return '';
    const lastX = width - padding;
    const firstX = padding;
    const bottomY = height - padding;
    return `${pathData} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [pathData]);

  return (
    <div className="relative bg-[#0D0F11] border border-[#1E2225] hover:border-[#2A2F33] rounded-[16px] p-5 shadow-card flex flex-col justify-between transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#FF4713]" strokeWidth={1.8} />
          <h2 className="text-[14px] font-semibold text-[#F2F4F5]">Threat Timeline</h2>
          <span className="text-[10px] font-mono text-[#5E666B]">Confidence Trajectory</span>
        </div>

        {/* Window Selector */}
        <div className="flex items-center gap-1 bg-[#141719] border border-[#1E2225] p-1 rounded-lg">
          {(['30s', '5m', '1h'] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWindowRange(w)}
              className={`px-2.5 py-0.5 text-[11px] font-mono font-medium rounded transition-all ${
                windowRange === w
                  ? 'bg-[#1E2225] text-[#F2F4F5] shadow-sm'
                  : 'text-[#9BA3A8] hover:text-[#F2F4F5]'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart Frame with Hover Tooltip */}
      <div className="relative h-44 w-full rounded-xl overflow-hidden bg-[#050607] border border-[#1E2225] flex items-center justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="timelineAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0.02" />
            </linearGradient>

            <linearGradient id="timelineStrokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22C55E" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>

          {/* Reference Threshold Grid Lines */}
          <line
            x1={padding}
            y1={height - padding - 0.65 * (height - padding * 2)}
            x2={width - padding}
            y2={height - padding - 0.65 * (height - padding * 2)}
            stroke="#EF4444"
            strokeWidth="1"
            strokeDasharray="3 3"
            strokeOpacity="0.4"
          />
          <line
            x1={padding}
            y1={height - padding - 0.35 * (height - padding * 2)}
            x2={width - padding}
            y2={height - padding - 0.35 * (height - padding * 2)}
            stroke="#22C55E"
            strokeWidth="1"
            strokeDasharray="3 3"
            strokeOpacity="0.4"
          />

          {/* Shaded Area */}
          <path d={areaData} fill="url(#timelineAreaGradient)" />

          {/* Trajectory Path */}
          <path
            d={pathData}
            fill="none"
            stroke="url(#timelineStrokeGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Hover interactive tracker */}
        <div className="absolute inset-0 flex">
          {points.map((pt, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredPoint(pt)}
              onMouseLeave={() => setHoveredPoint(null)}
              className="flex-1 h-full cursor-crosshair group relative"
            />
          ))}
        </div>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#0D0F11]/95 border border-[#1E2225] px-3 py-1.5 rounded-lg shadow-xl font-mono text-[11px] pointer-events-none flex items-center gap-2 backdrop-blur-md">
            <span className="text-[#9BA3A8]">{hoveredPoint.timestamp}</span>
            <span className="text-[#5E666B]">|</span>
            <span
              className={
                hoveredPoint.score > 0.65
                  ? 'text-[#EF4444] font-bold'
                  : hoveredPoint.score > 0.35
                  ? 'text-[#F59E0B] font-bold'
                  : 'text-[#22C55E] font-bold'
              }
            >
              Risk: {(hoveredPoint.score * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Threshold Indicators */}
      <div className="flex items-center justify-between text-[11px] font-mono mt-3 text-[#5E666B]">
        <span className="flex items-center gap-1.5 text-[#22C55E]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          ALLOW (&le;0.35)
        </span>
        <span className="flex items-center gap-1.5 text-[#F59E0B]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          WARN (0.35–0.65)
        </span>
        <span className="flex items-center gap-1.5 text-[#EF4444]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
          ALERT (&ge;0.65)
        </span>
      </div>
    </div>
  );
});
