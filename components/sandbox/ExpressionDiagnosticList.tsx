import React from 'react';
import Link from 'next/link';
import type { Diagnostic } from '@/lib/engine/types';
import { formatDiagnosticPlain } from '@/lib/editor/positions';
import { AlertCircle, Info, ExternalLink } from 'lucide-react';

export interface ExpressionDiagnosticListProps {
  diagnostics: Diagnostic[];
  onSelectDiagnostic?: (diagnostic: Diagnostic) => void;
  id?: string;
  emptyMessage?: string;
}

export function ExpressionDiagnosticList({
  diagnostics,
  onSelectDiagnostic,
  id,
  emptyMessage,
}: ExpressionDiagnosticListProps) {
  const items = diagnostics.filter(
    (d) => d.severity === 'error' || d.severity === 'warning'
  );

  if (items.length === 0) {
    if (!emptyMessage) return null;
    return (
      <p id={id} className="text-[12px] text-[var(--color-driftwood)]">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div id={id}>
      <h3 className="text-[12px] font-medium text-[var(--color-text)] mb-1.5">
        Diagnostics
      </h3>
      <ul
        className="space-y-1 max-h-36 overflow-y-auto"
        role="list"
        aria-label="Expression validation messages"
      >
        {items.map((d, index) => {
          const isError = d.severity === 'error';
          return (
            <li key={`${d.code}-${d.range.start.offset}-${index}`}>
              <button
                type="button"
                onClick={() => onSelectDiagnostic?.(d)}
                className="w-full text-left flex items-start gap-2 px-2 py-1.5 rounded-[3px] border border-transparent hover:border-[var(--color-outline)]/60 hover:bg-[var(--color-elevated)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-card)] transition-colors"
              >
                {isError ? (
                  <AlertCircle
                    className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--color-crimson)]"
                    aria-hidden
                  />
                ) : (
                  <Info
                    className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--color-amber)]"
                    aria-hidden
                  />
                )}
                <span
                  className={`text-[12px] font-mono leading-snug flex-1 ${
                    isError ? 'text-[var(--color-crimson)]' : 'text-[var(--color-amber)]'
                  }`}
                >
                  {formatDiagnosticPlain(d)}
                </span>
                {d.documentationUrl ? (
                  <Link
                    href={d.documentationUrl}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-mono text-[var(--color-ember)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)] rounded-[2px]"
                  >
                    Guide
                    <ExternalLink className="w-3 h-3" aria-hidden />
                  </Link>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
