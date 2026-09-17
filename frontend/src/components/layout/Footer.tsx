import React from 'react';
import type { WebSocketState } from '../../types/dashboard';

interface FooterProps {
  onOpenPrivacy?: () => void;
  wsState?: WebSocketState;
}

export const Footer: React.FC<FooterProps> = ({ onOpenPrivacy }) => {
  return (
    <footer className="w-full border-t border-[#1E2225] bg-[#050607] pt-12 pb-8 px-6 sm:px-8 mt-16 select-none">
      <div className="max-w-[1400px] mx-auto space-y-10">
        {/* Small, centered two-line text block directly above the big wordmark */}
        <div className="flex flex-col items-center justify-center text-center space-y-1">
          <span className="text-[12px] uppercase font-semibold text-[#5E666B] tracking-[0.2em]">
            MEIKURAL
          </span>
          <span className="text-[11px] text-[#5E666B] tracking-normal font-normal">
            True Voice. Safer World.
          </span>
        </div>

        {/* Big Wordmark Section (Watermark-like legibility rgba(255,255,255,0.12-0.16), aria-hidden) */}
        <div className="relative py-4 flex flex-col items-center justify-center text-center overflow-hidden">
          <div
            aria-hidden="true"
            className="text-[72px] sm:text-[110px] md:text-[150px] lg:text-[180px] font-black tracking-[0.14em] text-transparent bg-clip-text bg-gradient-to-b from-white/[0.16] via-white/[0.11] to-[#FF4713]/[0.08] pointer-events-none select-none leading-none -mb-8 sm:-mb-12 md:-mb-16"
          >
            MEIKURAL
          </div>

          <div className="z-10 flex flex-col items-center space-y-1">
            <p className="text-[12px] text-[#5E666B] font-mono">
              Enterprise Voice Security Operations Center & Acoustic Anti-Spoofing Infrastructure
            </p>
          </div>
        </div>

        {/* Legal & Compliance Bottom Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#5E666B] pt-4 border-t border-[#1E2225]/40 font-mono">
          <span>Meikural © 2026 · All Rights Reserved</span>

          <div className="flex items-center gap-6">
            <button
              onClick={onOpenPrivacy}
              className="hover:text-[#F2F4F5] transition-colors"
            >
              Privacy & Compliance
            </button>
            <a href="#terms" className="hover:text-[#F2F4F5] transition-colors">
              Terms of Service
            </a>
            <a href="mailto:soc@meikural.security" className="hover:text-[#F2F4F5] transition-colors">
              SOC Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
