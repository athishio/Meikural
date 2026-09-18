import React, { useState, useRef, useEffect } from 'react';
import { Lock, Unlock, Eye, EyeOff, Check, Copy } from 'lucide-react';

export interface PrivacyMaskProps {
  /** The sensitive string to mask */
  value: string;
  /** Human-friendly label for accessibility e.g. "Session ID", "Caller Hash" */
  label?: string;
  /** If false, bypasses masking and renders directly */
  sensitive?: boolean;
  /** Externally controlled reveal state (e.g. from table "Reveal All" button) */
  alwaysRevealed?: boolean;
  /** Stagger index for animated page-level reveal (multiplied by 20ms) */
  staggerIndex?: number;
  /** Show explicit eye toggle button */
  showEyeButton?: boolean;
  /** Allow inline copy button */
  copyable?: boolean;
  /** Additional styling */
  className?: string;
  /** Callback when copied */
  onCopy?: (val: string) => void;
  /** Custom render callback for the text if needed (e.g. wrap in a link/button) */
  children?: (revealedValue: string, isRevealed: boolean) => React.ReactNode;
}

export const PrivacyMask: React.FC<PrivacyMaskProps> = ({
  value,
  label = 'Identifier',
  sensitive = true,
  alwaysRevealed = false,
  staggerIndex = 0,
  showEyeButton = true,
  copyable = false,
  className = '',
  onCopy,
  children,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isManuallyToggled, setIsManuallyToggled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [staggerRevealed, setStaggerRevealed] = useState(alwaysRevealed);

  const unhoverTimerRef = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);

  // Staggered reveal when alwaysRevealed changes
  useEffect(() => {
    if (alwaysRevealed) {
      const timer = window.setTimeout(() => {
        setStaggerRevealed(true);
      }, staggerIndex * 20);
      return () => clearTimeout(timer);
    } else {
      setStaggerRevealed(false);
    }
  }, [alwaysRevealed, staggerIndex]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (unhoverTimerRef.current) clearTimeout(unhoverTimerRef.current);
    };
  }, []);

  if (!sensitive) {
    return children ? (
      <>{children(value, true)}</>
    ) : (
      <span className={className}>{value}</span>
    );
  }

  const isRevealed = staggerRevealed || isManuallyToggled || isHovered || isFocused;

  const handleMouseEnter = () => {
    if (unhoverTimerRef.current) {
      clearTimeout(unhoverTimerRef.current);
      unhoverTimerRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    // 300ms grace period before re-masking to prevent flicker
    unhoverTimerRef.current = window.setTimeout(() => {
      setIsHovered(false);
      unhoverTimerRef.current = null;
    }, 300);
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsManuallyToggled((prev) => !prev);
    }
  };

  const handleTouchEnd = () => {
    const now = Date.now();
    // Double tap within 400ms copies to clipboard
    if (now - lastTapRef.current < 400 && isRevealed) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      onCopy?.(value);
      setTimeout(() => setCopied(false), 1800);
    } else {
      // Single tap toggles reveal
      setIsManuallyToggled((prev) => !prev);
    }
    lastTapRef.current = now;
  };

  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    onCopy?.(value);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleEyeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsManuallyToggled((prev) => !prev);
  };

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`${label} ${value}, ${isRevealed ? 'revealed' : 'masked, press Enter to reveal'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onTouchEnd={handleTouchEnd}
      title={isRevealed ? 'Click or move away to re-mask' : 'Hover, focus, or click to reveal'}
      className={`group/mask inline-flex items-center gap-1.5 cursor-pointer select-none rounded px-1 -mx-1 py-0.5 outline-none focus-visible:ring-1 focus-visible:ring-[#FF4713]/60 transition-colors ${
        isRevealed ? 'bg-[#FF4713]/5' : 'hover:bg-white/[0.03]'
      } ${className}`}
    >
      {/* Lock Icon */}
      <span className="flex-shrink-0 transition-all duration-120 flex items-center">
        {isRevealed ? (
          <Unlock
            className="w-3 h-3 text-[#FF4713] transition-transform scale-100"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        ) : (
          <Lock
            className="w-3 h-3 text-[#5E666B] group-hover/mask:text-[#9BA3A8] transition-colors"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        )}
      </span>

      {/* Masked / Revealed Text (Maintains 100% strict layout width) */}
      <span className="relative font-mono inline-block">
        <span
          style={{
            filter: isRevealed ? 'blur(0px)' : 'blur(6px)',
            letterSpacing: isRevealed ? 'normal' : '0.04em',
            transition: 'filter 180ms cubic-bezier(0.16, 1, 0.3, 1), letter-spacing 180ms ease-out',
          }}
          className={`block transition-all select-all ${
            isRevealed ? 'text-[#F2F4F5]' : 'text-[#9BA3A8]/80'
          }`}
        >
          {children ? children(value, isRevealed) : value}
        </span>
      </span>

      {/* Quick Eye Toggle Trigger */}
      {showEyeButton && (
        <button
          type="button"
          onClick={handleEyeClick}
          aria-label={isRevealed ? `Mask ${label}` : `Reveal ${label}`}
          title={isRevealed ? 'Mask value' : 'Reveal value'}
          className="p-0.5 rounded text-[#5E666B] hover:text-[#F2F4F5] hover:bg-[#1E2225] transition-colors opacity-0 group-hover/mask:opacity-100 focus:opacity-100 focus:outline-none"
        >
          {isRevealed ? (
            <EyeOff className="w-3 h-3" strokeWidth={1.75} />
          ) : (
            <Eye className="w-3 h-3" strokeWidth={1.75} />
          )}
        </button>
      )}

      {/* Inline Copy Button */}
      {copyable && (
        <button
          type="button"
          onClick={handleCopyClick}
          aria-label={`Copy ${label} to clipboard`}
          title={copied ? 'Copied!' : 'Copy value'}
          className="p-0.5 rounded text-[#5E666B] hover:text-[#F2F4F5] hover:bg-[#1E2225] transition-colors"
        >
          {copied ? (
            <Check className="w-3 h-3 text-[#22C55E]" strokeWidth={2} />
          ) : (
            <Copy className="w-3 h-3" strokeWidth={1.75} />
          )}
        </button>
      )}
    </span>
  );
};
