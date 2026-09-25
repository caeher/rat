import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { QueryResultTable } from '@/components/sandbox/QueryResultTable';
import type { RelationSchema, Tuple } from '@/lib/engine/types';
import {
  CSV_NULL_TOKEN,
  serializeRelationToCsv,
} from '@/lib/sandbox/csv/exportCsv';
import { downloadTextFile } from '@/lib/sandbox/csv/download';
import { SPREADSHEET_SAFE_POLICY_SUMMARY } from '@/lib/sandbox/csv/spreadsheetSafe';
import {
  deriveRunPhase,
  getResultExportEligibility,
  type ResultRunPhase,
} from '@/lib/sandbox/resultExport';
import { Download, HelpCircle, AlertTriangle, Loader2 } from 'lucide-react';

export interface QueryResultPanelProps {
  schema?: RelationSchema;
  rows: Tuple[];
  executionTimeMs?: number;
  algebraError?: string;
  isEvaluating: boolean;
  hasRunSnapshot: boolean;
  isStale: boolean;
  staleReason?: string;
  /** When set, comparison UI is shown elsewhere; this panel focuses on primary algebra output metadata. */
  hideTableWhenComparison?: boolean;
}

function phaseTag(phase: ResultRunPhase): { label: string; variant: 'forest' | 'default' | 'amber' } {
  switch (phase) {
    case 'running':
      return { label: 'Running', variant: 'default' };
    case 'success':
      return { label: 'Success', variant: 'forest' };
    case 'empty':
      return { label: 'Empty relation', variant: 'forest' };
    case 'failed':
      return { label: 'Failed', variant: 'amber' };
    case 'stale':
      return { label: 'Stale', variant: 'amber' };
    case 'idle':
    default:
      return { label: 'No run yet', variant: 'default' };
  }
}

export function QueryResultPanel({
  schema,
  rows,
  executionTimeMs,
  algebraError,
  isEvaluating,
  hasRunSnapshot,
  isStale,
  staleReason,
  hideTableWhenComparison = false,
}: QueryResultPanelProps) {
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const phase = deriveRunPhase({
    isEvaluating,
    hasSnapshot: hasRunSnapshot,
    algebraError,
    schema,
    rowCount: rows.length,
    isStale,
  });

  const exportEligibility = getResultExportEligibility({
    phase,
    schema,
    rows,
    algebraError,
  });

  const handleExport = useCallback(() => {
    if (!exportEligibility.ok) {
      setExportNotice(exportEligibility.reason);
      return;
    }
    const { csv, spreadsheetSafeTransformCount } = serializeRelationToCsv(
      exportEligibility.schema,
      exportEligibility.rows,
      { spreadsheetSafe: true }
    );
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadTextFile(`rat-result-${stamp}.csv`, csv);
    setExportNotice(
      spreadsheetSafeTransformCount > 0
        ? `Downloaded UTF-8 CSV (${exportEligibility.rows.length} rows). ${spreadsheetSafeTransformCount} cell(s) were spreadsheet-safed.`
        : `Downloaded UTF-8 CSV (${exportEligibility.rows.length} rows).`
    );
  }, [exportEligibility]);

  const status = phaseTag(phase);

  if (!hasRunSnapshot && !isEvaluating) {
    return (
      <div className="text-[13px] text-[var(--color-driftwood)] py-6 text-center" role="status">
        Enter an expression, then run to evaluate against the snapshot.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="query-result-panel">
      <div
        className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-[4px] border border-[var(--color-outline)]/50 bg-[var(--color-canvas)]/60"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Tag variant={status.variant}>{status.label}</Tag>
          {schema ? (
            <span className="text-[12px] text-[var(--color-driftwood)]">
              {schema.attributes.length} attribute{schema.attributes.length === 1 ? '' : 's'} ·{' '}
              {rows.length} row{rows.length === 1 ? '' : 's'}
              {executionTimeMs !== undefined ? ` · ${executionTimeMs} ms` : ''}
            </span>
          ) : (
            <span className="text-[12px] text-[var(--color-driftwood)]">No schema from last run</span>
          )}
          {isEvaluating && (
            <span className="inline-flex items-center gap-1 text-[12px] text-[var(--color-driftwood)]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              Evaluating…
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1" aria-label="CSV export help">
                <HelpCircle className="w-3.5 h-3.5" />
                CSV policy
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 text-[12px] space-y-2" sideOffset={6}>
              <p className="font-medium text-[var(--color-text)]">Export format</p>
              <ul className="list-disc pl-4 text-[var(--color-driftwood)] space-y-1">
                <li>UTF-8 with BOM for Excel; RFC 4180 quoting for commas, quotes, and newlines.</li>
                <li>
                  SQL NULL is written as <code className="font-mono">{CSV_NULL_TOKEN}</code>; empty
                  strings export as <code className="font-mono">&quot;&quot;</code>.
                </li>
                <li>{SPREADSHEET_SAFE_POLICY_SUMMARY}</li>
                <li>Export always includes every row from the last successful run, not only the current page.</li>
              </ul>
            </PopoverContent>
          </Popover>

          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={!exportEligibility.ok}
            aria-disabled={!exportEligibility.ok}
            title={!exportEligibility.ok ? exportEligibility.reason : 'Download full result as CSV'}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {isStale && (
        <div
          className="flex items-start gap-2 p-2 rounded-[4px] bg-[var(--color-elevated)]/80 text-[12px] text-[var(--color-driftwood)]"
          role="status"
        >
          <AlertTriangle className="w-4 h-4 text-[var(--color-amber)] shrink-0 mt-0.5" aria-hidden />
          <div>
            <div className="font-medium text-[var(--color-text)]">Results may be out of date</div>
            <p>{staleReason ?? 'Re-run to refresh results against the current editor and dataset.'}</p>
          </div>
        </div>
      )}

      {algebraError && !isEvaluating && (
        <p className="text-[12px] text-[var(--color-ember)] font-mono" role="alert">
          {algebraError}
        </p>
      )}

      {exportNotice && (
        <p className="text-[11px] text-[var(--color-driftwood)]" role="status">
          {exportNotice}
        </p>
      )}

      {schema && !hideTableWhenComparison && (
        <>
          <QueryResultTable
            schema={schema}
            rows={rows}
            loading={isEvaluating}
            executionTimeMs={executionTimeMs}
          />
          <div className="flex flex-wrap gap-2" aria-label="Output attribute types">
            {schema.attributes.map((a) => (
              <span
                key={a.name}
                className="text-[11px] font-mono px-2 py-0.5 rounded-[3px] bg-[var(--color-canvas)] border border-[var(--color-outline)]/60"
              >
                {a.name}: {a.type}
                {a.nullable ? '?' : ''}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
