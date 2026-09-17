import React from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Calendar, ShieldCheck } from 'lucide-react';

interface HeroBandProps {
  dateString?: string;
}

export const HeroBand: React.FC<HeroBandProps> = React.memo(({
  dateString = '17 Sept 2026',
}) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 40, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 40, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / 35;
    const y = (e.clientY - rect.top - rect.height / 2) / 35;
    mouseX.set(x);
    mouseY.set(y);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative w-full min-h-[110px] py-3 px-2 md:px-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden select-none"
    >
      {/* Left: Neutral System Overview Headline */}
      <div className="z-10 flex flex-col max-w-xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#141719] border border-[#1E2225] text-[10.5px] font-mono text-[#9BA3A8] uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3 text-[#22C55E]" />
            MEIKURAL SENTINEL NODE
          </span>
          <span className="text-[11px] font-mono text-[#5E666B]">AASIST INT8 v2.4.1</span>
        </div>
        <h1 className="text-[24px] md:text-[28px] font-semibold leading-tight tracking-tight text-[#F2F4F5]">
          Voice Security Operations Center
        </h1>
        <p className="text-[12.5px] text-[#9BA3A8] font-normal mt-1 leading-snug">
          Real-time deepfake telemetry, zero-trust acoustic attestation & sovereign sentinel control
        </p>
      </div>

      {/* Center: Morphing Flowing Light Ribbon */}
      <motion.div
        style={{ x: springX, y: springY }}
        className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-35 overflow-hidden"
      >
        <svg
          viewBox="0 0 1000 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[120%] h-full max-w-none transform -translate-y-2 will-change-transform"
        >
          <defs>
            <linearGradient id="silverRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="25%" stopColor="#9BA3A8" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="75%" stopColor="#9BA3A8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="ribbonSecondary" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5E666B" stopOpacity="0" />
              <stop offset="50%" stopColor="#F2F4F5" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#5E666B" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Ribbon 1 - Glow underlay */}
          <path
            d="M -100 120 C 150 40, 350 200, 600 110 C 850 20, 1050 180, 1200 90"
            stroke="#FFFFFF"
            strokeWidth="8"
            strokeLinecap="round"
            strokeOpacity="0.08"
          />
          <motion.path
            d="M -100 120 C 150 40, 350 200, 600 110 C 850 20, 1050 180, 1200 90"
            stroke="url(#silverRibbon)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0.85, pathOffset: 0 }}
            animate={{
              pathOffset: [0, 1],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          {/* Ribbon 2 */}
          <motion.path
            d="M -100 135 C 180 190, 380 50, 640 140 C 900 230, 1080 60, 1200 130"
            stroke="url(#ribbonSecondary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0.7, pathOffset: 0 }}
            animate={{
              pathOffset: [1, 0],
            }}
            transition={{
              duration: 28,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </svg>
      </motion.div>

      {/* Right: Slogan & Current Date Card */}
      <div className="z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="text-left md:text-right hidden sm:block">
          <p className="text-[13px] font-semibold text-[#F2F4F5] leading-snug">
            Real Voices Build Trust.
          </p>
          <p className="text-[11.5px] text-[#9BA3A8] font-normal leading-snug">
            AI Helps You Keep It Real.
          </p>
        </div>

        {/* Date Chip */}
        <div className="flex items-center gap-2.5 bg-[#0D0F11] border border-[#1E2225] px-3.5 py-2 rounded-xl shadow-sm">
          <div className="p-1.5 bg-[#141719] border border-[#1E2225] rounded-lg text-[#9BA3A8]">
            <Calendar className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-[#5E666B] uppercase tracking-wider font-semibold leading-none">
              Wednesday
            </span>
            <span className="text-[12px] font-medium text-[#F2F4F5] leading-tight mt-0.5">
              {dateString}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
