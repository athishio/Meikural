import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, Menu, X, CheckCircle2, AlertTriangle, ShieldAlert, AlertOctagon } from 'lucide-react';
import type { NotificationItem, WebSocketState } from '../../types/dashboard';

interface HeaderProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenSearch: () => void;
  onEscalate: () => void;
  onReconnectWs: () => void;
  wsState: WebSocketState;
  isDemoMode?: boolean;
  notifications: NotificationItem[];
  onMarkNotificationsRead: () => void;
}

const navTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'active-calls', label: 'Active Calls' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'audit-trail', label: 'Audit Trail' },
  { id: 'rules', label: 'Rules' },
  { id: 'integrations', label: 'Integrations' },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenSearch,
  onEscalate,
  onReconnectWs,
  wsState,
  isDemoMode = false,
  notifications,
  onMarkNotificationsRead,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderWsBadge = () => {
    switch (wsState) {
      case 'live':
        return (
          <button
            onClick={onReconnectWs}
            title="WebSocket Active · Real-time telemetry synchronized"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-[11px] font-mono font-medium hover:bg-[#22C55E]/20 transition-all duration-150 cursor-pointer shadow-[0_0_12px_rgba(34,197,94,0.18)] animate-[pulse_3s_ease-in-out_infinite] active:scale-[0.97]"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
            </span>
            <span>Backend Live</span>
          </button>
        );
      case 'reconnecting':
        return (
          <button
            onClick={onReconnectWs}
            title="Attempting WebSocket reconnect..."
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-[11px] font-mono font-medium hover:bg-[#F59E0B]/20 transition-all duration-150 cursor-pointer active:scale-[0.97]"
          >
            <span className="w-2 h-2 rounded-full border border-current border-t-transparent animate-spin" />
            <span>Reconnecting</span>
          </button>
        );
      case 'offline':
      default:
        return (
          <button
            onClick={onReconnectWs}
            title="WebSocket disconnected. Click to reconnect."
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-[11px] font-mono font-medium hover:bg-[#EF4444]/20 transition-all duration-150 cursor-pointer active:scale-[0.97]"
          >
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
            <span>Offline (Retry)</span>
          </button>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 h-[72px] bg-[#050607]/90 backdrop-blur-md border-b border-[#1E2225] px-4 md:px-8 flex items-center justify-between">
      {/* Left: Logo & Wordmark */}
      <div
        className="flex items-center gap-3 cursor-pointer select-none"
        onClick={() => onSelectTab('overview')}
      >
        {/* Waveform glyph (4 vertical bars) */}
        <div className="flex items-center gap-[3px] h-7 w-7 justify-center bg-[#0D0F11] border border-[#1E2225] rounded-lg p-1.5 shadow-sm">
          <span className="w-[2.5px] h-3.5 bg-[#F2F4F5] rounded-full animate-pulse" />
          <span className="w-[2.5px] h-5 bg-[#F2F4F5] rounded-full" />
          <span className="w-[2.5px] h-2.5 bg-[#F2F4F5] rounded-full" />
          <span className="w-[2.5px] h-4 bg-[#F2F4F5] rounded-full animate-pulse" />
        </div>

        <div className="flex flex-col">
          <span className="text-[20px] font-semibold text-[#F2F4F5] tracking-[0.18em] leading-none">
            MEIKURAL
          </span>
          <span className="text-[10px] text-[#5E666B] tracking-[0.12em] uppercase font-medium mt-0.5">
            SENTINEL NODE
          </span>
        </div>
      </div>

      {/* Center: Pill Navigation (Desktop) */}
      <nav className="hidden lg:flex items-center bg-[#0D0F11] border border-[#1E2225] p-1 rounded-full">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative px-4 py-1.5 text-[13px] font-medium transition-colors duration-150 rounded-full select-none ${
                isActive ? 'text-[#F2F4F5]' : 'text-[#9BA3A8] hover:text-[#F2F4F5]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavPill"
                  className="absolute inset-0 bg-[#1E2225] rounded-full -z-10 shadow-sm"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Right: Backend Live Pill + Escalate + Search + Notifications */}
      <div className="flex items-center gap-2.5">
        {/* Demo Mode Indicator */}
        {isDemoMode && (
          <span
            className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] shadow-[0_0_10px_rgba(245,158,11,0.2)]"
            title="Server is running with DEMO_MODE enabled"
          >
            DEMO MODE
          </span>
        )}

        {/* WebSocket Live Pill */}
        <div className="hidden sm:block">
          {renderWsBadge()}
        </div>

        {/* High-priority Escalate Button */}
        <button
          disabled={wsState === 'offline'}
          onClick={onEscalate}
          title={wsState === 'offline' ? 'Unavailable — backend disconnected' : 'Isolate active trunk, record incident & dispatch multi-channel alerts'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
            wsState === 'offline'
              ? 'opacity-40 cursor-not-allowed bg-[#EF4444]/5 border border-[#EF4444]/15 text-[#EF4444]/40'
              : 'bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/35 shadow-[0_0_15px_rgba(239,68,68,0.15)] cursor-pointer active:scale-95'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Escalate</span>
        </button>

        {/* Global Command Palette / Search Icon */}
        <button
          onClick={onOpenSearch}
          aria-label="Search"
          className="flex items-center gap-2 px-2.5 py-1.5 bg-[#0D0F11] hover:bg-[#141719] border border-[#1E2225] hover:border-[#2A2F33] rounded-lg text-[12px] text-[#9BA3A8] transition-all"
        >
          <Search className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span className="hidden md:inline font-mono text-[10.5px] bg-[#1E2225] px-1.5 py-0.5 rounded text-[#5E666B]">
            ⌘K
          </span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications && unreadCount > 0) {
                onMarkNotificationsRead();
              }
            }}
            aria-label="Notifications"
            className="relative p-2 text-[#9BA3A8] hover:text-[#F2F4F5] bg-[#0D0F11] hover:bg-[#141719] border border-[#1E2225] rounded-lg transition-colors"
          >
            <Bell className="w-4 h-4" strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] text-white text-[9.5px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 mt-2 w-80 bg-[#0D0F11] border border-[#1E2225] rounded-xl shadow-2xl p-3 z-50 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between border-b border-[#1E2225] pb-2 mb-2">
                  <span className="text-[12px] font-semibold text-[#F2F4F5]">Security Alerts</span>
                  <button
                    onClick={onMarkNotificationsRead}
                    className="text-[10px] text-[#9BA3A8] hover:text-[#F2F4F5] transition-colors"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-[12px] text-[#5E666B]">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-lg border text-left transition-colors ${
                          n.read ? 'bg-[#141719]/40 border-transparent' : 'bg-[#141719] border-[#1E2225]'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {n.type === 'alert' && <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />}
                          {n.type === 'warn' && <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />}
                          {n.type === 'safe' && <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-[#F2F4F5] truncate">{n.title}</p>
                            <p className="text-[11px] text-[#9BA3A8] line-clamp-2 mt-0.5">{n.message}</p>
                            <span className="text-[10px] text-[#5E666B] mt-1 block">{n.time}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-[#9BA3A8] hover:text-[#F2F4F5] rounded-lg hover:bg-[#141719]"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-[72px] left-0 right-0 bg-[#0D0F11] border-b border-[#1E2225] px-6 py-4 lg:hidden flex flex-col gap-2 z-50 shadow-2xl"
          >
            <div className="mb-2">
              {renderWsBadge()}
            </div>
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  onSelectTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`text-left px-4 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#141719] text-[#F2F4F5] border border-[#1E2225]'
                    : 'text-[#9BA3A8] hover:text-[#F2F4F5]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
