import React, { useState } from 'react';
import { Fingerprint, Link2, Copy, Check, Hash } from 'lucide-react';
import { Tooltip } from './Tooltip';

export interface ReferenceTokenProps {
  /** Type of identifier: caller, session, or hash */
  type: 'caller' | 'session' | 'hash';
  /** The full underlying raw cryptographic hash or session ID */
  raw: string;
  /** 1-based sequential index (e.g. 1 -> "Caller ID #1", "Session Ref #1") */
  index?: number;
  /** Optional custom alias label override */
  label?: string;
  /** Table-level full cryptographic hashes toggle */
  fullView?: boolean;
  /** Allow inline copy button */
  copyable?: boolean;
  /** Click action (e.g. to scope session in Overview) */
  onSelect?: () => void;
  /** Additional styling */
  className?: string;
  /** Custom toast callback */
  onCopyToast?: (msg: string) => void;
}

export const ReferenceToken: React.FC<ReferenceTokenProps> = ({
  type,
  raw,
  index = 1,
  label,
  fullView = false,
  copyable = true,
  onSelect,
  className = '',
  onCopyToast,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(raw);
    setCopied(true);
    if (onCopyToast) {
      onCopyToast(`Raw ${type === 'caller' ? 'SHA-256' : type === 'session' ? 'Session ID' : 'Merkle Hash'} copied to clipboard`);
    }
    setTimeout(() => setCopied(false), 1600);
  };

  const getReferenceLabel = () => {
    if (label) return label;
    switch (type) {
      case 'caller':
        return `Caller ID #${index}`;
      case 'session':
        return `Session Ref #${index}`;
      case 'hash':
        return `Block Ref #${index}`;
    }
  };

  const getTooltipContent = () => {
    switch (type) {
      case 'caller':
        return (
          <div className="flex flex-col gap-0.5 text-[11px] font-mono">
            <span className="text-[#5E666B] uppercase text-[9.5px]">Salted Caller Hash (SHA-256)</span>
            <span className="text-[#F2F4F5] break-all">{raw}</span>
            <span className="text-[#22C55E] text-[10px] mt-0.5">Click copy icon to copy raw hash</span>
          </div>
        );
      case 'session':
        return (
          <div className="flex flex-col gap-0.5 text-[11px] font-mono">
            <span className="text-[#5E666B] uppercase text-[9.5px]">Underlying Session Identifier</span>
            <span className="text-[#FF4713]">{raw}</span>
            <span className="text-[#9BA3A8] text-[10px] mt-0.5">Click to scope Overview to this session</span>
          </div>
        );
      case 'hash':
        return (
          <div className="flex flex-col gap-0.5 text-[11px] font-mono">
            <span className="text-[#5E666B] uppercase text-[9.5px]">Cryptographic Merkle Block Hash</span>
            <span className="text-[#22C55E] break-all">{raw}</span>
            <span className="text-[#22C55E] text-[10px] mt-0.5">● Tamper-Evident SHA-256 Seal</span>
          </div>
        );
    }
  };

  const ariaDesc = `${getReferenceLabel()}, raw value ${raw.slice(0, 16)}..., click to copy`;

  return (
    <Tooltip content={getTooltipContent()} position="top">
      <div
        role="button"
        tabIndex={0}
        aria-label={ariaDesc}
        onClick={onSelect}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && onSelect) {
            e.preventDefault();
            onSelect();
          }
        }}
        className={`group/ref inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#141719] border border-[#1E2225] hover:border-[#2A2F33] transition-all duration-150 select-none ${
          onSelect ? 'cursor-pointer hover:bg-[#1A1F24]' : 'cursor-default'
        } ${className}`}
      >
        {/* Leading Semantic Icon */}
        {type === 'caller' && (
          <Fingerprint
            className="w-3.5 h-3.5 text-[#9BA3A8] group-hover/ref:text-[#F2F4F5] shrink-0 transition-colors"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        )}
        {type === 'session' && (
          <Hash
            className="w-3 h-3 text-[#FF4713] shrink-0"
            strokeWidth={2}
            aria-hidden="true"
          />
        )}
        {type === 'hash' && (
          <Link2
            className="w-3.5 h-3.5 text-[#22C55E] shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        )}

        {/* Display Text: Reference Alias OR Full Raw Hash */}
        <span className="font-mono text-[11.5px] tracking-tight">
          {fullView ? (
            <span className="text-[#F2F4F5] max-w-[140px] sm:max-w-[220px] truncate inline-block align-bottom">
              {raw}
            </span>
          ) : (
            <span
              className={
                type === 'session'
                  ? 'text-[#FF4713] font-semibold hover:underline'
                  : type === 'hash'
                  ? 'text-[#22C55E] font-medium'
                  : 'text-[#9BA3A8] font-medium group-hover/ref:text-[#F2F4F5] transition-colors'
              }
            >
              {getReferenceLabel()}
            </span>
          )}
        </span>

        {/* Copy to Clipboard Trigger */}
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy raw hash'}
            aria-label="Copy raw identifier to clipboard"
            className="p-0.5 rounded text-[#5E666B] hover:text-[#F2F4F5] hover:bg-[#1E2225] transition-colors ml-0.5"
          >
            {copied ? (
              <Check className="w-3 h-3 text-[#22C55E]" strokeWidth={2} />
            ) : (
              <Copy className="w-3 h-3 opacity-60 group-hover/ref:opacity-100 transition-opacity" strokeWidth={1.75} />
            )}
          </button>
        )}
      </div>
    </Tooltip>
  );
};
