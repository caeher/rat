import React from 'react';
import { Tag } from '@/components/ui/Tag';
import { DataTable } from '@/components/ui/Table';
import type { RelationSchema, Tuple, TupleValue } from '@/lib/engine/types';
import type { DualPathComparison, SqlExecutionOutcome } from '@/lib/sql/runtime';
import { AlertTriangle, CheckCircle2, GitCompare, XCircle } from 'lucide-react';

export interface AlgebraSqlComparisonPanelProps {
  algebraSchema?: RelationSchema;
  algebraRows: Tuple[];
  algebraTimeMs?: number;
  algebraError?: string;
  sqlOutcome?: SqlExecutionOutcome;
  translationError?: string;
  comparison?: DualPathComparison;
  loading?: boolean;
}

function rowsToTableData(
  schema: RelationSchema | undefined,
  rows: Tuple[]
): { columns: { key: string; header: string; type: 'string' | 'number' | 'boolean' | 'date' }[]; data: Record<string, TupleValue>[] } {
  if (!schema) {
    return { columns: [], data: [] };
  }
  const columns = schema.attributes.map((a) => ({
    key: a.name,
    header: a.name,
    type: (a.type === 'null' ? 'string' : a.type) as 'string' | 'number' | 'boolean' | 'date',
  }));
  return { columns, data: rows };
}

function statusBanner(comparison: DualPathComparison | undefined, loading: boolean) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-[var(--color-driftwood)]">
        <GitCompare className="w-4 h-4 animate-pulse" />
        Running algebra and SQLite verification…
      </div>
    );
  }

  if (!comparison) {
    return null;
  }

  if (comparison.status === 'match') {
    return (
      <div
        className="flex items-start gap-2 p-2.5 rounded-[4px] bg-[var(--color-forest)]/10 border border-[var(--color-forest)]/30 text-[12px]"
        role="status"
      >
        <CheckCircle2 className="w-4 h-4 text-[var(--color-forest)] shrink-0 mt-0.5" />
        <div>
          <div className="font-medium text-[var(--color-text)]">Algebra and SQL agree</div>
          <div className="text-[var(--color-driftwood)]">
            {comparison.algebraRowCount} tuple(s) on both paths (unordered set comparison).
          </div>
        </div>
      </div>
    );
  }

  if (comparison.status === 'mismatch') {
    return (
      <div
        className="flex items-start gap-2 p-2.5 rounded-[4px] bg-[var(--color-amber)]/10 border border-[var(--color-amber)]/40 text-[12px]"
        role="status"
      >
        <XCircle className="w-4 h-4 text-[var(--color-amber)] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-medium text-[var(--color-text)]">Result mismatch</div>
          <div className="text-[var(--color-driftwood)]">
            Algebra: {comparison.algebraRowCount} row(s) · SQL: {comparison.sqlRowCount} row(s).{' '}
            {comparison.diff
              ? `${comparison.diff.onlyInLeft.length} only in algebra, ${comparison.diff.onlyInRight.length} only in SQL.`
              : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-start gap-2 p-2.5 rounded-[4px] bg-[var(--color-elevated)] border border-[var(--color-outline)]/50 text-[12px]"
      role="status"
    >
      <AlertTriangle className="w-4 h-4 text-[var(--color-amber)] shrink-0 mt-0.5" />
      <div>
        <div className="font-medium text-[var(--color-text)]">Comparison incomplete</div>
        <p className="text-[var(--color-driftwood)]">
          {comparison.message ??
            'Both paths need successful results before equality can be reported.'}
        </p>
      </div>
    </div>
  );
}

export function AlgebraSqlComparisonPanel({
  algebraSchema,
  algebraRows,
  algebraTimeMs,
  algebraError,
  sqlOutcome,
  translationError,
  comparison,
  loading,
}: AlgebraSqlComparisonPanelProps) {
  const algebraTable = rowsToTableData(algebraSchema, algebraRows);
  const sqlTable = rowsToTableData(
    sqlOutcome?.schema ?? algebraSchema,
    sqlOutcome?.relation?.tuples ?? []
  );

  const sqlError =
    translationError ??
    (sqlOutcome && !sqlOutcome.success ? sqlOutcome.message : undefined);

  const sqlFailureLabel = sqlOutcome?.failureKind
    ? sqlOutcome.failureKind.replace(/_/g, ' ')
    : translationError
      ? 'translation'
      : undefined;

  return (
    <div className="space-y-4" data-testid="algebra-sql-comparison">
      {statusBanner(comparison, loading ?? false)}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="space-y-2 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-[12px] font-medium text-[var(--color-text)]">Algebra result</h3>
            {algebraTimeMs !== undefined ? (
              <Tag variant="default">{algebraTimeMs} ms</Tag>
            ) : null}
          </div>
          {algebraError ? (
            <p className="text-[12px] text-[var(--color-ember)] font-mono">{algebraError}</p>
          ) : algebraSchema ? (
            <DataTable
              columns={algebraTable.columns}
              data={algebraTable.data}
              loading={loading}
              emptyMessage="No tuples from algebra evaluation."
              caption={`${algebraRows.length} tuple(s)`}
            />
          ) : (
            <p className="text-[12px] text-[var(--color-driftwood)]">No algebra result yet.</p>
          )}
        </section>

        <section className="space-y-2 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-[12px] font-medium text-[var(--color-text)]">SQLite result</h3>
            {sqlFailureLabel ? (
              <Tag variant="default">{sqlFailureLabel}</Tag>
            ) : sqlOutcome?.executionTimeMs !== undefined ? (
              <Tag variant="default">{sqlOutcome.executionTimeMs} ms</Tag>
            ) : null}
          </div>
          {sqlError ? (
            <p className="text-[12px] text-[var(--color-ember)] font-mono">{sqlError}</p>
          ) : sqlOutcome?.schema ? (
            <DataTable
              columns={sqlTable.columns}
              data={sqlTable.data}
              loading={loading}
              emptyMessage="No tuples from SQL execution."
              caption={`${sqlOutcome.rowCount ?? sqlTable.data.length} tuple(s)`}
            />
          ) : (
            <p className="text-[12px] text-[var(--color-driftwood)]">No SQL result yet.</p>
          )}
        </section>
      </div>

      {comparison?.status === 'mismatch' && comparison.diff && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pt-2 border-t border-[var(--color-outline)]/40">
          <div className="space-y-2">
            <h4 className="text-[11px] font-medium text-[var(--color-text)]">
              Only in algebra ({comparison.diff.onlyInLeft.length})
            </h4>
            {comparison.diff.onlyInLeft.length > 0 ? (
              <pre className="text-[11px] font-mono p-2 bg-[var(--color-canvas)] rounded-[4px] overflow-x-auto max-h-40">
                {comparison.diff.onlyInLeft.map((t) => JSON.stringify(t)).join('\n')}
              </pre>
            ) : (
              <p className="text-[11px] text-[var(--color-driftwood)]">None</p>
            )}
          </div>
          <div className="space-y-2">
            <h4 className="text-[11px] font-medium text-[var(--color-text)]">
              Only in SQL ({comparison.diff.onlyInRight.length})
            </h4>
            {comparison.diff.onlyInRight.length > 0 ? (
              <pre className="text-[11px] font-mono p-2 bg-[var(--color-canvas)] rounded-[4px] overflow-x-auto max-h-40">
                {comparison.diff.onlyInRight.map((t) => JSON.stringify(t)).join('\n')}
              </pre>
            ) : (
              <p className="text-[11px] text-[var(--color-driftwood)]">None</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
