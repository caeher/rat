import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ReferenceSearchField } from '@/components/reference/ReferenceSearchField';
import { filterOperatorDocs } from '@/lib/reference/search';
import { operatorReferenceHref } from '@/lib/reference/paths';

export interface SandboxReferencePanelProps {
  onLoadExample?: (exampleId: string) => void;
}

export function SandboxReferencePanel({ onLoadExample }: SandboxReferencePanelProps) {
  const [query, setQuery] = useState('');
  const operators = useMemo(() => filterOperatorDocs(query), [query]);

  return (
    <section
      aria-label="Operator reference cheat sheet"
      className="p-3 bg-[var(--color-card)] border border-[var(--color-outline)]/60 rounded-[4px] space-y-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-[12px] font-mono text-[var(--color-ash)] uppercase tracking-wide">
          Operator reference
        </h2>
        <Link
          href="/reference"
          className="text-[12px] font-mono text-[var(--color-ember)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)] rounded-[2px]"
        >
          Full guide →
        </Link>
      </div>

      <ReferenceSearchField
        value={query}
        onChange={setQuery}
        label="Filter operator reference"
        placeholder="Search operators…"
      />

      <ul className="space-y-2 max-h-[min(40vh,280px)] overflow-y-auto pr-1" role="list">
        {operators.length === 0 ? (
          <li className="text-[13px] text-[var(--color-driftwood)] py-3 text-center">No matches.</li>
        ) : (
          operators.map((op) => (
            <li key={op.id}>
              <div className="p-2.5 rounded-[4px] border border-[var(--color-outline)]/50 bg-[var(--color-canvas)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-[15px] font-bold text-[var(--color-ember)] mr-1.5">
                      {op.symbol}
                    </span>
                    <span className="text-[13px] font-medium text-[var(--color-text)]">{op.name}</span>
                    <p className="text-[11px] font-mono text-[var(--color-ash)] mt-0.5 truncate">
                      {op.unicodeSyntax}
                    </p>
                  </div>
                  <Link
                    href={operatorReferenceHref(op.id)}
                    className="shrink-0 text-[11px] font-mono text-[var(--color-ember)] underline-offset-2 hover:underline"
                  >
                    Read
                  </Link>
                </div>
                <p className="text-[12px] text-[var(--color-driftwood)] mt-1 line-clamp-2">{op.whenToUse}</p>
                {op.executableExampleId && onLoadExample ? (
                  <button
                    type="button"
                    onClick={() => onLoadExample(op.executableExampleId!)}
                    className="mt-2 text-[11px] font-mono text-[var(--color-text)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)] rounded-[2px]"
                  >
                    Load sandbox example
                  </button>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
