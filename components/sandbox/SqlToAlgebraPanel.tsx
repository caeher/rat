import React, { useMemo, useState } from 'react';
import { ArrowRightLeft, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { Textarea } from '@/components/ui/Textarea';
import { translateSqlToAlgebra } from '@/lib/sql';
import type { RelationSchema } from '@/lib/engine/types';

export interface SqlToAlgebraPanelProps {
  schemas: Record<string, RelationSchema>;
  schemaLabel?: string;
  onApplyExpression?: (expression: string) => void;
  /** When true, show confirm before replacing editor contents. */
  editorHasContent?: boolean;
}

export function SqlToAlgebraPanel({
  schemas,
  schemaLabel,
  onApplyExpression,
  editorHasContent,
}: SqlToAlgebraPanelProps) {
  const [sqlInput, setSqlInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [pendingApply, setPendingApply] = useState<string | null>(null);

  const result = useMemo(() => {
    if (!sqlInput.trim()) return null;
    return translateSqlToAlgebra(sqlInput, schemas);
  }, [sqlInput, schemas]);

  const errors = result?.diagnostics.filter((d) => d.severity === 'error') ?? [];

  const handleCopy = async () => {
    if (!result?.expression) return;
    try {
      await navigator.clipboard.writeText(result.expression);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const requestApply = () => {
    if (!result?.success || !result.expression || !onApplyExpression) return;
    if (editorHasContent) {
      setPendingApply(result.expression);
      return;
    }
    onApplyExpression(result.expression);
  };

  const confirmApply = () => {
    if (pendingApply && onApplyExpression) {
      onApplyExpression(pendingApply);
    }
    setPendingApply(null);
  };

  return (
    <div className="space-y-4" data-testid="sql-to-algebra-panel">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <p className="text-[13px] text-[var(--color-driftwood)] font-serif leading-relaxed">
            Optional reverse translation: paste a read-only SQL query in the supported subset (DISTINCT
            selects, joins, set operations). Bag-sensitive SQL is rejected with an explanation.
          </p>
          {schemaLabel ? (
            <Tag variant="default" className="shrink-0">
              {schemaLabel}
            </Tag>
          ) : null}
        </div>
        <Textarea
          value={sqlInput}
          onChange={(e) => setSqlInput(e.target.value)}
          placeholder="SELECT DISTINCT name FROM Students WHERE gpa > 3.5"
          className="font-mono text-[13px] min-h-[88px]"
          aria-label="SQL query to translate into relational algebra"
        />
      </div>

      {!sqlInput.trim() ? (
        <p className="text-[13px] text-[var(--color-driftwood)] py-2 text-center">
          Enter SQL above, then review the suggested algebra below.
        </p>
      ) : null}

      {errors.length > 0 && (
        <div className="space-y-1.5">
          {errors.map((d, i) => (
            <p key={i} className="text-[12px] text-[var(--color-amber)] font-mono">
              {d.message}
            </p>
          ))}
        </div>
      )}

      {result?.success && result.expression ? (
        <div className="space-y-3">
          <div className="relative">
            <pre
              className="p-3.5 pr-12 bg-[var(--color-canvas)] border border-[var(--color-outline)]/60 rounded-[4px] font-mono text-[13px] text-[var(--color-text)] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto"
              data-testid="sql-to-algebra-output"
            >
              {result.expression}
            </pre>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-8 px-2"
              onClick={handleCopy}
              aria-label="Copy relational algebra expression"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-[var(--color-forest)]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>

          {result.steps.length > 0 && (
            <div className="text-[11px] text-[var(--color-driftwood)] space-y-2">
              <div className="font-medium text-[var(--color-text)]">Translation steps</div>
              <ol className="list-decimal list-inside space-y-1.5 font-mono">
                {result.steps.map((step) => (
                  <li key={step.order}>
                    <span className="text-[var(--color-text)]">{step.symbol}</span> — {step.summary}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {onApplyExpression ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={requestApply}>
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Use in algebra editor
              </Button>
              {pendingApply ? (
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-driftwood)]">
                  <span>Replace current expression?</span>
                  <Button type="button" size="sm" variant="primary" onClick={confirmApply}>
                    Replace
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setPendingApply(null)}>
                    Cancel
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
