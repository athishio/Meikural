import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Layers, AudioWaveform, Cpu, Radio, PhoneCall, Tag } from 'lucide-react';
import type { ThreatType } from '../../types/dashboard';

interface ThreatTypesProps {
  threats: ThreatType[];
}

export const ThreatTypes: React.FC<ThreatTypesProps> = ({ threats }) => {
  const [timeframe, setTimeframe] = useState('This Week');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getBarColor = (severity: ThreatType['severityColor']) => {
    switch (severity) {
      case 'red':
        return 'bg-[#EF4444] shadow-[0_0_10px_rgba(239,68,68,0.4)]';
      case 'amber':
        return 'bg-[#F59E0B] shadow-[0_0_10px_rgba(245,158,11,0.4)]';
      case 'amber-yellow':
        return 'bg-[#FBBF24] shadow-[0_0_10px_rgba(251,191,36,0.3)]';
      case 'gray':
      default:
        return 'bg-[#5E666B]';
    }
  };

  const getThreatIcon = (name: string) => {
    const strokeWidth = 1.5;
    if (name.includes('Cloning')) return <AudioWaveform className="w-4 h-4 text-[#EF4444]" strokeWidth={strokeWidth} />;
    if (name.includes('Speech')) return <Cpu className="w-4 h-4 text-[#F59E0B]" strokeWidth={strokeWidth} />;
    if (name.includes('Conversion')) return <Radio className="w-4 h-4 text-[#FBBF24]" strokeWidth={strokeWidth} />;
    if (name.includes('Call')) return <PhoneCall className="w-4 h-4 text-[#9BA3A8]" strokeWidth={strokeWidth} />;
    return <Tag className="w-4 h-4 text-[#5E666B]" strokeWidth={strokeWidth} />;
  };

  return (
    <div className="relative bg-[#0D0F11] border border-[#1E2225] hover:border-[#2A2F33] rounded-[16px] p-6 shadow-card flex flex-col justify-between transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#9BA3A8]" strokeWidth={1.5} />
            <h2 className="text-[15px] font-semibold text-[#F2F4F5]">Threat Types</h2>
          </div>
          <span className="text-[12px] text-[#9BA3A8] font-normal mt-0.5">
            Types of synthetic voice threats detected
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

      {/* Rows */}
      <div className="flex flex-col gap-3 my-auto">
        {threats.map((threat, idx) => (
          <div key={threat.id} className="flex flex-col gap-1.5 group">
            <div className="flex items-center justify-between text-[12.5px]">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[#141719] border border-[#1E2225] flex items-center justify-center shrink-0">
                  {getThreatIcon(threat.name)}
                </div>
                <span className="text-[#F2F4F5] font-medium">{threat.name}</span>
              </div>

              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span className="text-[#9BA3A8] font-medium">{threat.count}</span>
                <span className="text-[#F2F4F5] font-semibold w-8 text-right">
                  {threat.percentage}%
                </span>
              </div>
            </div>

            {/* Progress Track & Fill */}
            <div className="w-full h-1.5 bg-[#141719] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${threat.percentage}%` }}
                transition={{ duration: 0.8, delay: idx * 0.08, ease: 'easeOut' }}
                className={`h-full rounded-full ${getBarColor(threat.severityColor)}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
