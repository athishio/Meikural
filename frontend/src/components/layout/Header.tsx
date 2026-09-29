import React from 'react';
import type { WebSocketState } from '../../types/dashboard';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onReconnectWs: () => void;
  wsState: WebSocketState;
  isDemoMode?: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const navTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'rules', label: 'Rules & Policy' },
  { id: 'audit-trail', label: 'Audit Trail' },
  { id: 'privacy', label: 'Privacy & Compliance' },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onReconnectWs,
  wsState,
  isDemoMode = false,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="w-full bg-[#FFFFFF] dark:bg-[#181B1F] border-b border-[#D8D3C8] dark:border-[#2B3037] px-4 sm:px-8 py-2.5 sticky top-0 z-40 transition-colors">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-sm bg-[#F7F5F0] dark:bg-[#121417] border border-[#D8D3C8] dark:border-[#2B3037] flex items-center justify-center">
            <div className="flex items-end gap-0.5 h-3.5">
              <span className="w-0.5 h-3 bg-[#1A1D20] dark:bg-[#F0EEE9] rounded-none" />
              <span className="w-0.5 h-2 bg-[#1A1D20] dark:bg-[#F0EEE9] rounded-none" />
              <span className="w-0.5 h-3.5 bg-[#165A34] dark:bg-[#34D399] rounded-none" />
              <span className="w-0.5 h-2.5 bg-[#1A1D20] dark:bg-[#F0EEE9] rounded-none" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold font-mono tracking-wider text-[#1A1D20] dark:text-[#F0EEE9]">
                MEIKURAL
              </span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded-none bg-[#EFECE6] dark:bg-[#242930] text-[#525860] dark:text-[#A2A8B0] border border-[#D8D3C8] dark:border-[#2B3037]">
                NODE // DPDP §3(2)
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#78808A] dark:text-[#6E7681] uppercase tracking-wider">
              Acoustic Evidence Dossier
            </span>
          </div>
        </div>

        {/* Center: Exactly 4 Minimalist Navigation Tabs with Smooth Layout Animation */}
        <nav className="flex items-center gap-1 bg-[#F7F5F0] dark:bg-[#121417] border border-[#D8D3C8] dark:border-[#2B3037] rounded-sm p-0.5" aria-label="Main Navigation">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`relative px-3.5 py-1.5 rounded-sm text-[12.5px] font-medium transition-colors cursor-pointer select-none active:scale-[0.98] ${
                  isActive
                    ? 'text-[#1A1D20] dark:text-[#F0EEE9]'
                    : 'text-[#525860] dark:text-[#A2A8B0] hover:text-[#1A1D20] dark:hover:text-[#F0EEE9]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeHeaderTab"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="absolute inset-0 bg-[#FFFFFF] dark:bg-[#242930] border border-[#BCB6A8] dark:border-[#3F4752] rounded-sm shadow-2xs"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Operational Status & Theme Toggle */}
        <div className="flex items-center gap-2.5">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={theme === 'dark' ? 'Switch to Light Paper Dossier' : 'Switch to Dark Lab Terminal'}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-[#D8D3C8] dark:border-[#2B3037] bg-[#F7F5F0] dark:bg-[#121417] text-[#1A1D20] dark:text-[#F0EEE9] hover:bg-[#EFECE6] dark:hover:bg-[#1F2328] text-[11px] font-mono transition-colors active:scale-[0.96] cursor-pointer"
          >
            <motion.div
              key={theme}
              initial={{ rotate: -25, scale: 0.85 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.18 }}
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-[#FBBF24]" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-[#525860]" />
              )}
            </motion.div>
            <span className="hidden md:inline">{theme === 'dark' ? 'LIGHT' : 'DARK'}</span>
          </button>

          {isDemoMode && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-sm text-[10px] font-mono font-medium bg-[#FDF6E8] dark:bg-[#291B06] border border-[#E5BA78] dark:border-[#5C3E08] text-[#924A00] dark:text-[#FBBF24]">
              DEMO MODE
            </span>
          )}

          {wsState === 'live' ? (
            <button
              onClick={onReconnectWs}
              title="WebSocket Active · Real-time telemetry synchronized"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#EAF5EE] dark:bg-[#0E2316] border border-[#9CD1B2] dark:border-[#1B5233] text-[#165A34] dark:text-[#34D399] text-[11px] font-mono active:scale-[0.98] transition-transform cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#165A34] dark:bg-[#34D399] animate-pulse" />
              <span>Backend Live</span>
            </button>
          ) : (
            <button
              onClick={onReconnectWs}
              title="WebSocket disconnected. Click to reconnect."
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#FDEFEF] dark:bg-[#2B0F0F] border border-[#E79E9E] dark:border-[#5E1A1A] text-[#941818] dark:text-[#F87171] text-[11px] font-mono active:scale-[0.98] transition-transform cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#941818] dark:bg-[#F87171]" />
              <span>Offline (Retry)</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
