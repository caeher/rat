import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Copy, Check } from 'lucide-react';

export interface TerminalSnippetProps {
  command: string;
  prompt?: string;
  className?: string;
  showCopy?: boolean;
}

export function TerminalSnippet({
  command,
  prompt = '$',
  className,
  showCopy = true,
}: TerminalSnippetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className={twMerge(
        clsx(
          'bg-[var(--color-card)] border border-[var(--color-outline)]/60 rounded-[4px] px-3.5 py-2.5 font-mono text-[12px] text-[var(--color-text)] flex items-center justify-between gap-3 overflow-x-auto group',
          className
        )
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[var(--color-ash)] select-none shrink-0 font-medium">{prompt}</span>
        <span className="font-mono tracking-tight select-all truncate">{command}</span>
      </div>

      {showCopy && (
        <button
          onClick={handleCopy}
          aria-label={copied ? 'Copied to clipboard' : 'Copy command to clipboard'}
          className="shrink-0 p-1 text-[var(--color-ash)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)] rounded-[2px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)] cursor-pointer"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-[var(--color-forest)]" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
