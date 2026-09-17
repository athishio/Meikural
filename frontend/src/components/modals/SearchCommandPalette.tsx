import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Radio, ArrowRight, Activity, Zap, Lock } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: string) => void;
}

const commandItems = [
  // Navigation Routes
  { id: 'nav-overview', title: 'Overview', category: 'Navigation', subtitle: 'Voice Trust Index, signal visualizer & sentinel controls', type: 'nav' },
  { id: 'nav-active-calls', title: 'Active Calls', category: 'Navigation', subtitle: 'Live SIP media streams and trunk isolation', type: 'nav' },
  { id: 'nav-incidents', title: 'Incidents', category: 'Navigation', subtitle: 'High-risk deepfake interceptions & forensic certificates', type: 'nav' },
  { id: 'nav-audit-trail', title: 'Audit Trail', category: 'Navigation', subtitle: 'Cryptographic hash-chain ledger & block verifier', type: 'nav' },
  { id: 'nav-rules', title: 'Rules & Thresholds', category: 'Navigation', subtitle: 'Contiguous allow, step-up challenge & alert bands', type: 'nav' },
  { id: 'nav-integrations', title: 'Integrations', category: 'Navigation', subtitle: 'SIP Ingest Node, Twilio SMS & SMTP mailer gateways', type: 'nav' },
  { id: 'nav-privacy', title: 'Privacy & Compliance', category: 'Navigation', subtitle: 'Salted SHA-256 caller ID & 90-day retention auto-purge', type: 'nav' },

  // Active Sessions
  { id: 'sess-1', title: 'call_02db11a4', category: 'Session ID', subtitle: 'Voice Trust: 88/100 · ALLOW · Inbound SIP Trunk #1', type: 'session' },
  { id: 'sess-2', title: 'call_948f2190', category: 'Session ID', subtitle: 'Voice Trust: 18/100 · ALERT (Isolated) · Deepfake Intercept', type: 'session' },
  { id: 'sess-3', title: 'call_88c021ea', category: 'Session ID', subtitle: 'Voice Trust: 22/100 · ALERT · Challenge Timeout', type: 'session' },
  { id: 'sess-4', title: 'call_33e082ba', category: 'Session ID', subtitle: 'Voice Trust: 94/100 · ALLOW · Twilio Media Stream', type: 'session' },

  // Caller Hashes
  { id: 'hash-1', title: '7f9e8a12bc44d019f8e23a4b9102c98d761234ef', category: 'Caller Hash', subtitle: 'Salted SHA-256 · Verified Zero-PII Digest', type: 'hash' },
  { id: 'hash-2', title: '1a8e9903bc776d5421fa409e5124b77f12e8310d', category: 'Caller Hash', subtitle: 'Salted SHA-256 · Flagged Deepfake Target', type: 'hash' },
  { id: 'hash-3', title: '9845d0124b893a771c504e76a0d2f939e65811aa', category: 'Caller Hash', subtitle: 'Salted SHA-256 · Incident Block Committed', type: 'hash' },

  // Actions
  { id: 'act-mic', title: 'Start / Stop Microphone Monitoring', category: 'Action', subtitle: 'Direct 16kHz PCM audio stream capture', type: 'action' },
  { id: 'act-challenge', title: 'Inject Dynamic Voice Challenge', category: 'Action', subtitle: 'Trigger 15s security digits reflex HUD', type: 'action' },
  { id: 'act-escalate', title: 'Escalate Incident', category: 'Action', subtitle: 'Isolate active trunk and dispatch emergency SMS/SMTP', type: 'action' },
  { id: 'act-verify-chain', title: 'Verify Entire Cryptographic Chain', category: 'Action', subtitle: 'Validate sequential sha256 hashes across all blocks', type: 'action' },
  { id: 'act-purge', title: 'Run Regulatory Auto-Purge', category: 'Action', subtitle: 'Permanently remove records older than 90 days', type: 'action' },
];

export const SearchCommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = commandItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  const getIcon = (type: string) => {
    switch (type) {
      case 'nav':
        return <Activity className="w-4 h-4 text-[#FF4713]" />;
      case 'session':
        return <Radio className="w-4 h-4 text-[#22C55E]" />;
      case 'hash':
        return <Lock className="w-4 h-4 text-[#3B82F6]" />;
      case 'action':
        return <Zap className="w-4 h-4 text-[#F59E0B]" />;
      default:
        return <Search className="w-4 h-4 text-[#9BA3A8]" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          className="w-full max-w-2xl bg-[#0D0F11] border border-[#1E2225] rounded-xl shadow-2xl overflow-hidden font-sans select-none"
        >
          {/* Input Box */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1E2225] bg-[#050607]">
            <Search className="w-4 h-4 text-[#9BA3A8]" strokeWidth={1.5} />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search session IDs, caller hashes, pages, or commands..."
              className="flex-1 bg-transparent text-[13px] text-[#F2F4F5] placeholder:text-[#5E666B] focus:outline-none"
            />
            <kbd className="px-2 py-0.5 text-[10px] font-mono text-[#5E666B] bg-[#141719] rounded border border-[#1E2225]">
              ESC
            </kbd>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-[#5E666B]">
                No matching records found for "{query}"
              </div>
            ) : (
              filtered.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectAction(item.title);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                    idx === selectedIndex
                      ? 'bg-[#141719] border border-[#FF4713]/30'
                      : 'hover:bg-[#141719]/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded bg-[#050607] border border-[#1E2225] flex items-center justify-center shrink-0">
                      {getIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-medium text-[#F2F4F5] flex items-center gap-2">
                        <span className="truncate">{item.title}</span>
                        <span className="text-[10px] font-mono text-[#5E666B] px-1.5 py-0.2 rounded bg-[#050607] border border-[#1E2225] shrink-0">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#9BA3A8] truncate">{item.subtitle}</div>
                    </div>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-[#5E666B] shrink-0 ml-2" />
                </button>
              ))
            )}
          </div>

          {/* Quick shortcuts */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[#1E2225] bg-[#050607]/80 text-[10px] font-mono text-[#5E666B]">
            <span>Navigate: ↑ ↓ · Enter to select</span>
            <span>Escape to close</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
