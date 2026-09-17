import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, MoreHorizontal, ArrowRight, Table as TableIcon } from 'lucide-react';
import type { RecentAnalysis } from '../../types/dashboard';

interface RecentAnalysesProps {
  analyses: RecentAnalysis[];
  onViewAll?: () => void;
  onSelectAnalysis?: (analysis: RecentAnalysis) => void;
  onTogglePlay?: (id: string) => void;
}

export const RecentAnalyses: React.FC<RecentAnalysesProps> = ({
  analyses,
  onViewAll,
  onSelectAnalysis,
  onTogglePlay,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const renderBadge = (result: RecentAnalysis['result']) => {
    switch (result) {
      case 'Deepfake':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/25 shadow-[0_0_12px_rgba(239,68,68,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
            Deepfake
          </span>
        );
      case 'Authentic':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/25 shadow-[0_0_12px_rgba(34,197,94,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
            Authentic
          </span>
        );
      case 'Uncertain':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/25 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
            Uncertain
          </span>
        );
    }
  };

  return (
    <div className="relative bg-[#0D0F11] border border-[#1E2225] hover:border-[#2A2F33] rounded-[16px] p-6 shadow-card flex flex-col justify-between transition-all duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-[#9BA3A8]" strokeWidth={1.5} />
            <h2 className="text-[15px] font-semibold text-[#F2F4F5]">Recent Analyses</h2>
          </div>
          <span className="text-[12px] text-[#9BA3A8] font-normal mt-0.5">
            Latest voice files analysed by Meikural
          </span>
        </div>

        <button
          onClick={() => onViewAll?.()}
          className="flex items-center gap-1.5 text-[12px] font-medium text-[#9BA3A8] hover:text-[#F2F4F5] bg-[#141719] hover:bg-[#1E2225] border border-[#1E2225] px-3 py-1 rounded-lg transition-all"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1E2225] text-[11px] font-semibold text-[#5E666B] uppercase tracking-wider">
              <th className="pb-2.5 pl-2 font-normal w-9"></th>
              <th className="pb-2.5 font-normal">File Name</th>
              <th className="pb-2.5 font-normal">Result</th>
              <th className="pb-2.5 font-normal">Confidence</th>
              <th className="pb-2.5 font-normal">Time</th>
              <th className="pb-2.5 pr-2 font-normal text-right w-10">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2225]/40 text-[12.5px]">
            {analyses.map((item, idx) => (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                onClick={() => onSelectAnalysis?.(item)}
                className="hover:bg-[#141719] cursor-pointer transition-colors group"
              >
                {/* Play Audio Button / Animated Wave Scrubber */}
                <td className="py-2.5 pl-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onTogglePlay?.(item.id)}
                    className="w-7 h-7 rounded-full bg-[#141719] border border-[#1E2225] group-hover:border-[#2A2F33] flex items-center justify-center text-[#9BA3A8] hover:text-[#F2F4F5] transition-transform duration-150 hover:scale-110"
                    aria-label={item.isPlaying ? 'Pause' : 'Play'}
                  >
                    {item.isPlaying ? (
                      <Pause className="w-3 h-3 text-[#22C55E]" strokeWidth={2} />
                    ) : (
                      <Play className="w-3 h-3 ml-0.5 text-[#F2F4F5]" strokeWidth={2} />
                    )}
                  </button>
                </td>

                {/* File Name */}
                <td className="py-2.5 text-[#F2F4F5] font-medium">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px]">{item.fileName}</span>
                    {item.isPlaying && (
                      <div className="flex items-end gap-[2px] h-3 w-8">
                        <span className="w-1 h-3 bg-[#22C55E] rounded-full animate-bounce" />
                        <span className="w-1 h-2 bg-[#22C55E] rounded-full animate-bounce [animation-delay:0.15s]" />
                        <span className="w-1 h-3.5 bg-[#22C55E] rounded-full animate-bounce [animation-delay:0.3s]" />
                      </div>
                    )}
                  </div>
                </td>

                {/* Result Chip */}
                <td className="py-2.5">{renderBadge(item.result)}</td>

                {/* Confidence */}
                <td className="py-2.5 text-[#9BA3A8] font-mono tabular-nums">
                  {item.confidence}%
                </td>

                {/* Time */}
                <td className="py-2.5 text-[#5E666B] whitespace-nowrap text-[12px]">
                  {item.time}
                </td>

                {/* Actions (···) Menu */}
                <td className="py-2.5 pr-2 text-right relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                    className="p-1 rounded text-[#5E666B] hover:text-[#F2F4F5] hover:bg-[#1E2225] transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
                  </button>

                  <AnimatePresence>
                    {activeMenuId === item.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-2 top-8 w-36 bg-[#0D0F11] border border-[#1E2225] rounded-xl shadow-2xl p-1 z-30 text-left backdrop-blur-xl"
                      >
                        <button
                          onClick={() => {
                            onSelectAnalysis?.(item);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-2.5 py-1.5 text-[11.5px] text-[#9BA3A8] hover:text-[#F2F4F5] hover:bg-[#141719] rounded-md transition-colors"
                        >
                          Open Analysis
                        </button>
                        <button
                          onClick={() => setActiveMenuId(null)}
                          className="w-full px-2.5 py-1.5 text-[11.5px] text-[#9BA3A8] hover:text-[#F2F4F5] hover:bg-[#141719] rounded-md transition-colors"
                        >
                          Download Report
                        </button>
                        <div className="border-t border-[#1E2225] my-1" />
                        <button
                          onClick={() => setActiveMenuId(null)}
                          className="w-full px-2.5 py-1.5 text-[11.5px] text-[#EF4444] hover:bg-[#141719] rounded-md transition-colors"
                        >
                          Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
