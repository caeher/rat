import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Input } from '@/components/ui/Input';
import {
  OPERATOR_PALETTE_ITEMS,
  type OperatorPaletteItem,
} from '@/lib/editor/operatorPalette';
import { referenceHrefForOperatorType } from '@/lib/reference/diagnostics';

export interface OperatorPaletteHandle {
  focus: () => void;
}

export interface OperatorPaletteProps {
  onInsertTemplate: (template: string) => void;
  id?: string;
}

export const OperatorPalette = forwardRef<OperatorPaletteHandle, OperatorPaletteProps>(
  function OperatorPalette({ onInsertTemplate, id = 'operator-palette' }, ref) {
    const [query, setQuery] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return OPERATOR_PALETTE_ITEMS;
      return OPERATOR_PALETTE_ITEMS.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.symbol.includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.syntaxExample.toLowerCase().includes(q)
      );
    }, [query]);

    useImperativeHandle(ref, () => ({
      focus() {
        searchRef.current?.focus();
        listRef.current?.scrollTo({ top: 0 });
      },
    }));

    const handleInsert = useCallback(
      (item: OperatorPaletteItem) => {
        onInsertTemplate(item.template);
      },
      [onInsertTemplate]
    );

    return (
      <section
        id={id}
        aria-label="Relational algebra operator palette"
        className="p-3 bg-[var(--color-card)] border border-[var(--color-outline)]/60 rounded-[4px] space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
          <h2 className="text-[12px] font-mono text-[var(--color-ash)] uppercase tracking-wide">
            Operator palette
          </h2>
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-mist)] pointer-events-none"
              aria-hidden
            />
            <Input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter operators…"
              aria-label="Filter operator palette"
              className="pl-8 h-8 text-[13px] font-mono"
            />
          </div>
        </div>

        <div
          ref={listRef}
          role="list"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[min(50vh,320px)] overflow-y-auto pr-1"
        >
          {filtered.length === 0 ? (
            <p className="text-[13px] text-[var(--color-driftwood)] col-span-full py-4 text-center">
              No operators match your filter.
            </p>
          ) : (
            filtered.map((item) => (
              <OperatorPaletteCard key={item.id} item={item} onInsert={() => handleInsert(item)} />
            ))
          )}
        </div>
        <p className="text-[11px] text-[var(--color-ash)]">
          Each operator inserts a syntax template with editable placeholders. Use{' '}
          <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-[var(--color-canvas)] border border-[var(--color-outline)]/50">
            Ctrl+Shift+O
          </kbd>{' '}
          (⌘⇧O on Mac) to focus this palette from the editor.
        </p>
      </section>
    );
  }
);

function OperatorPaletteCard({
  item,
  onInsert,
}: {
  item: OperatorPaletteItem;
  onInsert: () => void;
}) {
  return (
    <article
      role="listitem"
      className="flex flex-col gap-2 p-2.5 rounded-[4px] border border-[var(--color-outline)]/50 bg-[var(--color-canvas)] hover:border-[var(--color-outline)] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[16px] font-bold text-[var(--color-ember)]" aria-hidden>
              {item.symbol}
            </span>
            <span className="font-medium text-[13px] text-[var(--color-text)]">{item.name}</span>
            <span className="text-[10px] uppercase tracking-wide text-[var(--color-mist)]">
              {item.classification}
            </span>
          </div>
          <p className="text-[12px] text-[var(--color-driftwood)] mt-1 leading-snug">{item.description}</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="shrink-0 text-[11px] font-mono text-[var(--color-ash)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)] rounded-[2px]"
            >
              Syntax
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-72">
            <p className="text-[11px] text-[var(--color-driftwood)] mb-1">Example</p>
            <code className="block font-mono text-[11px] bg-[var(--color-elevated)] p-2 rounded-[3px] text-[var(--color-text)] break-all">
              {item.syntaxExample}
            </code>
          </PopoverContent>
        </Popover>
        <Link
          href={referenceHrefForOperatorType(item.operatorType)}
          className="shrink-0 text-[11px] font-mono text-[var(--color-ember)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)] rounded-[2px]"
        >
          Guide
        </Link>
      </div>
      <button
        type="button"
        onClick={onInsert}
        className="w-full text-left font-mono text-[11px] px-2 py-1.5 rounded-[3px] bg-[var(--color-card)] border border-[var(--color-outline)]/60 text-[var(--color-text)] hover:bg-[var(--color-elevated)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)] transition-colors"
        aria-label={`Insert ${item.name} template (${item.symbol})`}
      >
        {item.template.replace(/\$\{([^}]+)\}/g, '$1')}
      </button>
    </article>
  );
}
