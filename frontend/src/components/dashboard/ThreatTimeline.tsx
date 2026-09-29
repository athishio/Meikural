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
    <div className="relative bg-[#FFFFFF] dark:bg-[#181B1F] border border-[#D8D3C8] dark:border-[#2B3037] rounded-sm p-5 shadow-xs flex flex-col justify-between select-none transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-[#D8D3C8] dark:border-[#2B3037] pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#1A1D20] dark:text-[#F0EEE9]" strokeWidth={2} />
          <h2 className="text-[13px] font-bold font-mono uppercase tracking-wider text-[#1A1D20] dark:text-[#F0EEE9]">
            Threat Timeline
          </h2>
          <span className="text-[10px] font-mono text-[#78808A] dark:text-[#6E7681]">
            Confidence Trajectory
          </span>
        </div>

        {/* Window Selector */}
        <div className="flex items-center gap-1 bg-[#F7F5F0] dark:bg-[#121417] border border-[#D8D3C8] dark:border-[#2B3037] p-0.5 rounded-sm">
          {(['30s', '5m', '1h'] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWindowRange(w)}
              className={`px-2.5 py-0.5 text-[11px] font-mono font-medium rounded-sm transition-colors cursor-pointer ${
                windowRange === w
                  ? 'bg-[#FFFFFF] dark:bg-[#242930] text-[#1A1D20] dark:text-[#F0EEE9] border border-[#BCB6A8] dark:border-[#3F4752] shadow-2xs'
                  : 'text-[#525860] dark:text-[#A2A8B0] hover:text-[#1A1D20] dark:hover:text-[#F0EEE9]'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart Frame with Hover Tooltip */}
      <div className="relative h-44 w-full rounded-sm overflow-hidden bg-[#F7F5F0] dark:bg-[#121417] border border-[#D8D3C8] dark:border-[#2B3037] flex items-center justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="timelineAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#941818" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#924A00" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#165A34" stopOpacity="0.02" />
            </linearGradient>

            <linearGradient id="timelineStrokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#165A34" />
              <stop offset="50%" stopColor="#924A00" />
              <stop offset="100%" stopColor="#941818" />
            </linearGradient>
          </defs>

          {/* Reference Threshold Grid Lines */}
          <line
            x1={padding}
            y1={height - padding - 0.65 * (height - padding * 2)}
            x2={width - padding}
            y2={height - padding - 0.65 * (height - padding * 2)}
            stroke="#941818"
            strokeWidth="1"
            strokeDasharray="3 3"
            strokeOpacity="0.5"
          />
          <line
            x1={padding}
            y1={height - padding - 0.35 * (height - padding * 2)}
            x2={width - padding}
            y2={height - padding - 0.35 * (height - padding * 2)}
            stroke="#165A34"
            strokeWidth="1"
            strokeDasharray="3 3"
            strokeOpacity="0.5"
          />

          {/* Shaded Area */}
          <path d={areaData} fill="url(#timelineAreaGradient)" />

          {/* Trajectory Path */}
          <path
            d={pathData}
            fill="none"
            stroke="url(#timelineStrokeGradient)"
            strokeWidth="2"
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
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#FFFFFF] dark:bg-[#181B1F] border border-[#D8D3C8] dark:border-[#2B3037] px-3 py-1.5 rounded-sm shadow-md font-mono text-[11px] pointer-events-none flex items-center gap-2">
            <span className="text-[#525860] dark:text-[#A2A8B0]">{hoveredPoint.timestamp}</span>
            <span className="text-[#78808A]">|</span>
            <span
              className={
                hoveredPoint.score > 0.65
                  ? 'text-[#941818] dark:text-[#F87171] font-bold'
                  : hoveredPoint.score > 0.35
                  ? 'text-[#924A00] dark:text-[#FBBF24] font-bold'
                  : 'text-[#165A34] dark:text-[#34D399] font-bold'
              }
            >
              Risk: {(hoveredPoint.score * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Threshold Indicators */}
      <div className="flex items-center justify-between text-[11px] font-mono mt-3 text-[#525860] dark:text-[#A2A8B0]">
        <span className="flex items-center gap-1.5 text-[#165A34] dark:text-[#34D399]">
          <span className="w-1.5 h-1.5 rounded-none bg-[#165A34] dark:bg-[#34D399]" />
          ALLOW (&le;0.35)
        </span>
        <span className="flex items-center gap-1.5 text-[#924A00] dark:text-[#FBBF24]">
          <span className="w-1.5 h-1.5 rounded-none bg-[#924A00] dark:bg-[#FBBF24]" />
          WARN (0.35–0.65)
        </span>
        <span className="flex items-center gap-1.5 text-[#941818] dark:text-[#F87171]">
          <span className="w-1.5 h-1.5 rounded-none bg-[#941818] dark:bg-[#F87171]" />
          ALERT (&ge;0.65)
        </span>
      </div>
    </div>
  );
});
