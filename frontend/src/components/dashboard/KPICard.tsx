import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, ShieldCheck, AlertTriangle, Clock, Link2 } from 'lucide-react';
import type { KPICardData } from '../../types/dashboard';

interface KPICardProps {
  data: KPICardData;
  index: number;
}

export const KPICard: React.FC<KPICardProps> = React.memo(({ data, index }) => {
  const [displayValue, setDisplayValue] = useState<string>(data.value);
  const [isHovered, setIsHovered] = useState(false);
  const rafRef = useRef<number | null>(null);
  const currentNumRef = useRef<number>(data.numericValue);

  useEffect(() => {
    const startVal = currentNumRef.current;
    const target = data.numericValue;

    if (Math.abs(startVal - target) < 0.001) {
      setDisplayValue(data.value);
      return;
    }

    let startTime: number | null = null;
    const duration = 400; // snappy, smooth transition

    const animateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (target - startVal) * ease;
      currentNumRef.current = current;

      if (data.value.includes('.')) {
        const decimals = data.value.split('.')[1]?.replace(/[^0-9]/g, '').length || 1;
        const suffix = data.value.replace(/^[0-9.]+/, '');
        setDisplayValue(`${current.toFixed(decimals)}${suffix}`);
      } else {
        const suffix = data.value.replace(/^[0-9,]+/, '');
        setDisplayValue(`${Math.round(current).toLocaleString()}${suffix}`);
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animateCount);
      } else {
        currentNumRef.current = target;
        setDisplayValue(data.value);
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animateCount);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [data.value, data.numericValue]);

  // Semantic Icon Renderer — one distinct icon per metric
  const renderIcon = () => {
    const strokeWidth = 1.75;
    switch (data.id) {
      case 'kpi-trust':
      case 'kpi-1':
        return <ShieldCheck className="w-5 h-5 text-[#22C55E]" strokeWidth={strokeWidth} />;
      case 'kpi-spoof':
      case 'kpi-2':
        return <AlertTriangle className="w-5 h-5 text-[#EF4444]" strokeWidth={strokeWidth} />;
      case 'kpi-lat':
      case 'kpi-4':
        return <Clock className="w-5 h-5 text-[#9BA3A8]" strokeWidth={strokeWidth} />;
      case 'kpi-chain':
      case 'kpi-3':
        return <Link2 className="w-5 h-5 text-[#9BA3A8]" strokeWidth={strokeWidth} />;
      default:
        return <ShieldCheck className="w-5 h-5 text-[#9BA3A8]" strokeWidth={strokeWidth} />;
    }
  };

  // Semantic Icon Container Styling
  const getIconContainerStyle = () => {
    switch (data.semanticColor) {
      case 'red':
        return 'bg-[#EF4444]/10 border-[#EF4444]/25 shadow-[0_0_16px_rgba(239,68,68,0.12)]';
      case 'green':
        return 'bg-[#22C55E]/10 border-[#22C55E]/25 shadow-[0_0_16px_rgba(34,197,94,0.12)]';
      default:
        return 'bg-[#141719] border-[#1E2225] shadow-sm';
    }
  };

  // Sparkline color
  const getBarColor = () => {
    if (data.id === 'kpi-2') return '#EF4444';
    if (data.id === 'kpi-3') return '#22C55E';
    return '#5E666B';
  };

  const isDownArrow = data.delta.startsWith('-');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: index * 0.06,
        ease: [0.16, 1, 0.3, 1],
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative bg-[#0D0F11] border border-[#1E2225] hover:border-[#2A2F33] rounded-[16px] p-5 flex items-center justify-between transition-all duration-200 shadow-card group"
    >
      {/* Left side: Icon, Title, Big Number, Delta */}
      <div className="flex items-start gap-4">
        {/* 44px Circular Icon Tile */}
        <div
          className={`w-11 h-11 rounded-full border flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${getIconContainerStyle()}`}
        >
          {renderIcon()}
        </div>

        <div className="flex flex-col">
          <span className="text-[12px] font-medium text-[#9BA3A8] leading-tight">
            {data.title}
          </span>
          <span className="text-[32px] md:text-[34px] font-semibold text-[#F2F4F5] tracking-tight leading-none mt-1.5 tabular-nums">
            {displayValue}
          </span>

          {/* Delta Row */}
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className={`inline-flex items-center text-[12px] font-semibold ${
                data.isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'
              }`}
            >
              {isDownArrow ? (
                <ArrowDown className="w-3 h-3 mr-0.5 stroke-[2.5]" />
              ) : (
                <ArrowUp className="w-3 h-3 mr-0.5 stroke-[2.5]" />
              )}
              {data.delta}
            </span>
            <span className="text-[11px] text-[#5E666B] font-normal">
              {data.deltaLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Mini Sparkline Bar Chart (~20 bars) */}
      <div className="flex items-end gap-[2px] h-10 w-24 sm:w-28 pl-2 shrink-0">
        {data.sparkline.map((val, bIdx) => {
          const barHPercent = Math.max(12, Math.min(100, val));
          return (
            <motion.div
              key={bIdx}
              className="flex-1 rounded-t-[1px]"
              style={{
                backgroundColor: getBarColor(),
                opacity: (bIdx / data.sparkline.length) * 0.7 + 0.3,
              }}
              initial={{ height: 0 }}
              animate={{
                height: isHovered
                  ? [`${barHPercent}%`, `${Math.max(15, barHPercent * 0.7)}%`, `${barHPercent}%`]
                  : `${barHPercent}%`,
              }}
              transition={{
                duration: isHovered ? 0.4 : 0.6,
                delay: isHovered ? bIdx * 0.015 : bIdx * 0.012,
                ease: 'easeOut',
              }}
            />
          );
        })}
      </div>
    </motion.div>
  );
});
