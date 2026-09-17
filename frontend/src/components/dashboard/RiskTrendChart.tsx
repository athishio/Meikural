import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp } from 'lucide-react';
import type { RiskPoint, RiskAnnotation } from '../../types/dashboard';

interface RiskTrendChartProps {
  points: RiskPoint[];
  annotations: RiskAnnotation[];
  selectedRange: string;
  onSelectRange: (range: string) => void;
}

const timeRanges = ['24 Hours', 'Last 7 days', '30 Days', '90 Days'];

export const RiskTrendChart: React.FC<RiskTrendChartProps> = ({
  points,
  annotations,
  selectedRange,
  onSelectRange,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dimensions & bounds
  const width = 800;
  const height = 280;
  const padding = { top: 30, right: 25, bottom: 40, left: 45 };

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  // Coordinate scales
  const pointCoords = useMemo(() => {
    return points.map((p, idx) => {
      const x = padding.left + (idx / (points.length - 1)) * innerW;
      const y = padding.top + innerH - (p.score / 100) * innerH;
      return { ...p, x, y };
    });
  }, [points, innerW, innerH, padding.left, padding.top]);

  // Generate SVG path string with smooth bezier curve
  const pathD = useMemo(() => {
    if (pointCoords.length === 0) return '';
    let d = `M ${pointCoords[0].x} ${pointCoords[0].y}`;
    for (let i = 1; i < pointCoords.length; i++) {
      const prev = pointCoords[i - 1];
      const curr = pointCoords[i];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr.y;
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [pointCoords]);

  // Area path closing to bottom
  const areaD = useMemo(() => {
    if (pointCoords.length === 0) return '';
    const bottomY = padding.top + innerH;
    const firstX = pointCoords[0].x;
    const lastX = pointCoords[pointCoords.length - 1].x;
    return `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [pathD, pointCoords, padding.top, innerH]);

  // Pinned annotations position lookup
  const pinnedPoints = useMemo(() => {
    return annotations.map((ann) => {
      let matched = pointCoords.find((p) => p.timestamp === ann.timestamp);
      if (!matched) {
        matched = pointCoords.find((p) => p.score === ann.score) || pointCoords[0];
      }
      return {
        ...ann,
        x: matched.x,
        y: matched.y,
      };
    });
  }, [annotations, pointCoords]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaleX = width / rect.width;
    const svgX = clientX * scaleX;

    // Find closest data point
    let closestIdx = 0;
    let minDiff = Infinity;
    pointCoords.forEach((p, idx) => {
      const diff = Math.abs(p.x - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    const target = pointCoords[closestIdx];
    setHoveredIndex(closestIdx);
    setHoverPos({ x: target.x, y: target.y });
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setHoverPos(null);
  };

  const activeHoverPoint = hoveredIndex !== null ? pointCoords[hoveredIndex] : null;

  return (
    <div
      ref={containerRef}
      className="relative bg-[#0D0F11] border border-[#1E2225] hover:border-[#2A2F33] rounded-[16px] p-6 shadow-card flex flex-col justify-between transition-all duration-200"
    >
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#9BA3A8]" strokeWidth={1.5} />
            <h2 className="text-[15px] font-semibold text-[#F2F4F5]">Risk Trend</h2>
          </div>
          <span className="text-[12px] text-[#9BA3A8] font-normal mt-0.5">
            Voice authentication risk level over time
          </span>
        </div>

        <div className="flex items-center gap-5 flex-wrap">
          {/* Legend Dots */}
          <div className="flex items-center gap-4 text-[12px] text-[#9BA3A8]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span>Low Risk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              <span>Medium Risk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
              <span>High Risk</span>
            </div>
          </div>

          {/* Timeframe Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 bg-[#141719] border border-[#1E2225] hover:border-[#2A2F33] text-[#F2F4F5] px-3 py-1 rounded-lg text-[12px] font-medium transition-colors"
            >
              <span>{selectedRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#9BA3A8]" strokeWidth={1.5} />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-1.5 w-32 bg-[#0D0F11] border border-[#1E2225] rounded-xl shadow-2xl p-1 z-30 backdrop-blur-xl"
                >
                  {timeRanges.map((range) => (
                    <button
                      key={range}
                      onClick={() => {
                        onSelectRange(range);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-[12px] rounded-md transition-colors ${
                        selectedRange === range
                          ? 'bg-[#141719] text-[#F2F4F5] font-semibold'
                          : 'text-[#9BA3A8] hover:text-[#F2F4F5] hover:bg-[#141719]/60'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* SVG Interactive Chart Frame */}
      <div className="relative w-full h-[260px] md:h-[280px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Linear Vertical Color Gradient for the Risk Curve */}
            <linearGradient id="riskLineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="35%" stopColor="#EF4444" />
              <stop offset="55%" stopColor="#F59E0B" />
              <stop offset="80%" stopColor="#22C55E" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>

            {/* Fading area under line */}
            <linearGradient id="riskAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.22" />
              <stop offset="45%" stopColor="#F59E0B" stopOpacity="0.14" />
              <stop offset="75%" stopColor="#22C55E" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines & Y-Axis Labels */}
          {[0, 20, 40, 60, 80, 100].map((val) => {
            const y = padding.top + innerH - (val / 100) * innerH;
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1E2225"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
                <text
                  x={padding.left - 12}
                  y={y + 3.5}
                  fill="#5E666B"
                  fontSize="11"
                  textAnchor="end"
                  className="font-mono tabular-nums"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Faint Background Gray Volume Bars */}
          {pointCoords.map((p, idx) => {
            const barH = (p.volume / 120) * 35;
            const barY = padding.top + innerH - barH;
            return (
              <motion.rect
                key={`vol-${idx}`}
                x={p.x - 2}
                y={barY}
                width={4}
                height={barH}
                fill="#5E666B"
                opacity="0.25"
                rx={1}
                initial={{ height: 0, y: padding.top + innerH }}
                animate={{ height: barH, y: barY }}
                transition={{ duration: 0.6, delay: idx * 0.008, ease: 'easeOut' }}
              />
            );
          })}

          {/* Area Fill */}
          <motion.path
            d={areaD}
            fill="url(#riskAreaGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.4 }}
          />

          {/* Main Risk Line with Continuous Gradient */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="url(#riskLineGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* X-Axis Dates */}
          {['Sep 10', 'Sep 11', 'Sep 12', 'Sep 13', 'Sep 14', 'Sep 15', 'Sep 16', 'Sep 17'].map(
            (dateLabel, dIdx) => {
              const xPos = padding.left + (dIdx / 7) * innerW;
              return (
                <text
                  key={dateLabel}
                  x={xPos}
                  y={height - 10}
                  fill="#9BA3A8"
                  fontSize="11"
                  textAnchor="middle"
                  className="font-sans"
                >
                  {dateLabel}
                </text>
              );
            }
          )}

          {/* Pinned Vertical Dashed Rules for Annotations */}
          {pinnedPoints.map((ann) => (
            <g key={`pin-line-${ann.id}`}>
              <line
                x1={ann.x}
                y1={ann.y}
                x2={ann.x}
                y2={padding.top + innerH}
                stroke={ann.color}
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <circle
                cx={ann.x}
                cy={ann.y}
                r="4.5"
                fill={ann.color}
                stroke="#0D0F11"
                strokeWidth="2"
                className="drop-shadow-[0_0_8px_currentColor]"
              />
            </g>
          ))}

          {/* Active Hover Crosshair Line */}
          {hoverPos && (
            <g>
              <line
                x1={hoverPos.x}
                y1={padding.top}
                x2={hoverPos.x}
                y2={padding.top + innerH}
                stroke="#9BA3A8"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.8"
              />
              <circle
                cx={hoverPos.x}
                cy={hoverPos.y}
                r="5"
                fill="#FFFFFF"
                stroke="#0D0F11"
                strokeWidth="2"
                className="drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
              />
            </g>
          )}
        </svg>

        {/* Pinned Annotation Tooltips (Floating Over SVG) */}
        {pinnedPoints.map((ann, aIdx) => {
          const leftPercent = (ann.x / width) * 100;
          const topPercent = (ann.y / height) * 100;

          return (
            <motion.div
              key={ann.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 1.4 + aIdx * 0.12 }}
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                transform: 'translate(-50%, -115%)',
              }}
              className="absolute pointer-events-none z-20 flex flex-col bg-[#141719]/95 border border-[#1E2225] px-2.5 py-1.5 rounded-lg shadow-xl backdrop-blur-md min-w-[75px]"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: ann.color }}
                />
                <span
                  className="text-[10px] font-semibold tracking-wide"
                  style={{ color: ann.color }}
                >
                  {ann.riskLevel}
                </span>
              </div>
              <div className="text-[13px] font-bold text-[#F2F4F5] tabular-nums mt-0.5">
                {ann.score}
              </div>
              <span className="text-[9.5px] text-[#5E666B] mt-0.5 whitespace-nowrap">
                {ann.timestamp}
              </span>
            </motion.div>
          );
        })}

        {/* Interactive Hover Tooltip */}
        {activeHoverPoint && hoverPos && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              left: `${(hoverPos.x / width) * 100}%`,
              top: `${(hoverPos.y / height) * 100}%`,
              transform: 'translate(-50%, -125%)',
            }}
            className="absolute pointer-events-none z-30 flex flex-col bg-[#0D0F11] border border-[#2A2F33] px-3 py-2 rounded-lg shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor:
                    activeHoverPoint.riskLevel === 'high'
                      ? '#EF4444'
                      : activeHoverPoint.riskLevel === 'medium'
                      ? '#F59E0B'
                      : '#22C55E',
                }}
              />
              <span
                className="text-[11px] font-semibold capitalize"
                style={{
                  color:
                    activeHoverPoint.riskLevel === 'high'
                      ? '#EF4444'
                      : activeHoverPoint.riskLevel === 'medium'
                      ? '#F59E0B'
                      : '#22C55E',
                }}
              >
                {activeHoverPoint.riskLevel} Risk
              </span>
            </div>
            <div className="text-[15px] font-bold text-[#F2F4F5] tabular-nums mt-0.5">
              Score: {activeHoverPoint.score}
            </div>
            <span className="text-[10px] text-[#9BA3A8] mt-0.5">
              {activeHoverPoint.timestamp}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
};
