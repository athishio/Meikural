import React from 'react';

interface FooterProps {
  onOpenPrivacy?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenPrivacy }) => {
  return (
    <footer className="w-full border-t border-[#D8D3C8] dark:border-[#2B3037] bg-[#FFFFFF] dark:bg-[#181B1F] py-5 px-4 sm:px-8 mt-12 select-none transition-colors">
      <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-[#525860] dark:text-[#A2A8B0]">
        <div className="flex items-center gap-2">
          <span className="text-[#1A1D20] dark:text-[#F0EEE9] font-bold">MEIKURAL</span>
          <span>·</span>
          <span>Enterprise Acoustic Anti-Spoofing & Zero-Trust Infrastructure</span>
        </div>

        <div className="flex items-center gap-5">
          <button
            onClick={onOpenPrivacy}
            className="hover:text-[#1A1D20] dark:hover:text-[#F0EEE9] transition-colors cursor-pointer underline-offset-2 hover:underline"
          >
            Privacy & Compliance (DPDP §3(2))
          </button>
          <span>·</span>
          <span>AASIST INT8 v2.4.1</span>
        </div>
      </div>
    </footer>
  );
};
