import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { toExecutableSql, transpileExpression } from '@/lib/sql';
import type { RelationSchema } from '@/lib/engine/types';
import { Copy, Check } from 'lucide-react';

export interface SqlTranslationPanelProps {
  expression: string;
  schemas: Record<string, RelationSchema>;
  schemaLabel?: string;
  valid: boolean;
}

export function SqlTranslationPanel({
  expression,
  schemas,
  schemaLabel,
  valid,
}: SqlTranslationPanelProps) {
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    if (!valid || !expression.trim()) {
      return null;
    }
    return transpileExpression(expression, schemas);
  }, [expression, schemas, valid]);

  const displaySql = result?.formattedSql ?? result?.sql;
  const errors = result?.diagnostics.filter((d) => d.severity === 'error') ?? [];

  const handleCopy = async () => {
    if (!result?.sql) return;
    const text = toExecutableSql(result.sql, result.parameters);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (!expression.trim()) {
    return (
      <p className="text-[13px] text-[var(--color-driftwood)] py-4 text-center">
        Enter an expression to generate SQLite SQL.
      </p>
    );
  }

  if (!valid) {
    return (
      <p className="text-[13px] text-[var(--color-driftwood)] py-4 text-center">
        Fix expression errors to generate SQL.
      </p>
    );
  }

  if (!result?.success || !displaySql) {
    return (
      <div className="space-y-2">
        {errors.map((d, i) => (
          <p key={i} className="text-[12px] text-[var(--color-amber)] font-mono">
            {d.message}
          </p>
        ))}
        {!errors.length && (
          <p className="text-[13px] text-[var(--color-driftwood)]">SQL could not be generated.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-driftwood)]">
        <Tag variant="default">SQLite {result.dialectVersion}</Tag>
        {schemaLabel ? <span>Schema: {schemaLabel}</span> : null}
        {result.parameters.length > 0 ? (
          <span>
            {result.parameters.length} bound parameter{result.parameters.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      <div className="relative">
        <pre
          className="p-3.5 pr-12 bg-[var(--color-canvas)] border border-[var(--color-outline)]/60 rounded-[4px] font-mono text-[13px] text-[var(--color-text)] whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto"
          data-testid="sql-transpilation-output"
        >
          {displaySql}
        </pre>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-8 px-2"
          onClick={handleCopy}
          aria-label="Copy executable SQL"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-[var(--color-forest)]" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span className="sr-only">Copy</span>
        </Button>
      </div>

      {result.parameters.length > 0 && (
        <div className="text-[11px] font-mono text-[var(--color-driftwood)] space-y-1">
          <div className="font-medium text-[var(--color-text)]">Parameters</div>
          {result.parameters.map((p) => (
            <div key={p.index}>
              ?{p.index} ({p.affinity}) = {JSON.stringify(p.value)}
            </div>
          ))}
          <p className="text-[10px] pt-1">
            Copy inlines these values into a runnable SQLite statement.
          </p>
        </div>
      )}

      {result.mappings.length > 0 && (
        <div className="text-[11px] text-[var(--color-driftwood)]">
          <div className="font-medium text-[var(--color-text)] mb-1">Algebra → SQL operators</div>
          <div className="flex flex-wrap gap-1.5">
            {result.mappings.map((m) => (
              <span
                key={m.nodeId}
                className="font-mono px-1.5 py-0.5 rounded-[3px] bg-[var(--color-elevated)] border border-[var(--color-outline)]/50"
                title={m.operator}
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
