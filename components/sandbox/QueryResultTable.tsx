import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/Table';
import { SandboxValueCell } from '@/components/sandbox/SandboxValueCell';
import type { RelationSchema, Tuple, TupleValue } from '@/lib/engine/types';
import type { SandboxAttributeType } from '@/lib/sandbox/constants';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

const DEFAULT_PAGE_SIZE = 50;

export type SortDirection = 'asc' | 'desc' | 'none';

export interface QueryResultTableProps {
  schema: RelationSchema;
  rows: Tuple[];
  loading?: boolean;
  pageSize?: number;
  /** Shown in caption; does not affect export. */
  executionTimeMs?: number;
  className?: string;
  compact?: boolean;
  emphasizedRowIndices?: number[];
  emphasizedColumns?: string[];
  emphasizedRowVariant?: 'kept' | 'dropped';
}

function attributeType(attrType: string): SandboxAttributeType {
  if (attrType === 'number' || attrType === 'boolean' || attrType === 'date') {
    return attrType;
  }
  return 'string';
}

function compareValues(a: TupleValue, b: TupleValue, type: SandboxAttributeType): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  switch (type) {
    case 'number':
      return (a as number) - (b as number);
    case 'boolean':
      return Number(a) - Number(b);
    case 'date':
    case 'string':
      return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
    default:
      return String(a).localeCompare(String(b));
  }
}

function rowEmphasisClass(
  globalIndex: number,
  emphasizedRowIndices: number[] | undefined,
  variant: 'kept' | 'dropped'
): string {
  if (!emphasizedRowIndices?.includes(globalIndex)) return '';
  if (variant === 'dropped') {
    return 'bg-[var(--color-ember)]/10 line-through opacity-70';
  }
  return 'bg-[var(--color-forest)]/10';
}

function columnEmphasisClass(
  columnName: string,
  emphasizedColumns: string[] | undefined
): string {
  if (!emphasizedColumns?.includes(columnName)) return '';
  return 'bg-[var(--color-amber)]/15';
}

export function QueryResultTable({
  schema,
  rows,
  loading = false,
  pageSize = DEFAULT_PAGE_SIZE,
  executionTimeMs,
  className,
  compact = false,
  emphasizedRowIndices,
  emphasizedColumns,
  emphasizedRowVariant = 'kept',
}: QueryResultTableProps) {
  const [page, setPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('none');

  const columns = schema.attributes;

  const sortedRows = useMemo(() => {
    if (!sortColumn || sortDirection === 'none') {
      return rows;
    }
    const attr = columns.find((c) => c.name === sortColumn);
    const type = attributeType(attr?.type ?? 'string');
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...rows].sort((left, right) => {
      const cmp = compareValues(left[sortColumn] ?? null, right[sortColumn] ?? null, type);
      return cmp * dir;
    });
  }, [columns, rows, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * pageSize;
  const pageRows = sortedRows.slice(pageStart, pageStart + pageSize);

  const toggleSort = (name: string) => {
    setPage(0);
    if (sortColumn !== name) {
      setSortColumn(name);
      setSortDirection('asc');
      return;
    }
    if (sortDirection === 'asc') {
      setSortDirection('desc');
      return;
    }
    if (sortDirection === 'desc') {
      setSortColumn(null);
      setSortDirection('none');
      return;
    }
    setSortDirection('asc');
  };

  const sortLabel = (name: string): 'ascending' | 'descending' | 'none' => {
    if (sortColumn !== name || sortDirection === 'none') return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  };

  if (!loading && columns.length === 0) {
    return (
      <EmptyState
        title="No output attributes"
        description="The evaluator did not return a schema for this result."
        className="py-6"
      />
    );
  }

  if (!loading && rows.length === 0) {
    return (
      <EmptyState
        title="Empty relation"
        description="The expression evaluated successfully but returned zero tuples."
        className="py-6"
      />
    );
  }

  const captionParts = [
    `${rows.length} tuple${rows.length === 1 ? '' : 's'}`,
    executionTimeMs !== undefined ? `${executionTimeMs} ms` : null,
    sortedRows.length > pageSize
      ? `showing ${pageStart + 1}–${Math.min(pageStart + pageSize, sortedRows.length)}`
      : null,
  ].filter(Boolean);

  return (
    <div className="space-y-2" data-testid="query-result-table">
      <p className="text-[11px] text-[var(--color-driftwood)] leading-snug" id="result-order-note">
        Row order in a relation is not meaningful in relational algebra; sorting below affects display
        only and does not change the exported file unless you re-run the query.
      </p>

      <Table className={className}>
        <TableCaption className="text-left not-italic">
          <span className="sr-only">Query result: </span>
          {captionParts.join(' · ')}
        </TableCaption>
        <TableHeader>
          <TableRow>
            {columns.map((attr) => (
              <TableHead
                key={attr.name}
                aria-sort={sortLabel(attr.name)}
                className={`align-bottom ${columnEmphasisClass(attr.name, emphasizedColumns)}`}
              >
                <button
                  type="button"
                  onClick={() => toggleSort(attr.name)}
                  className="inline-flex flex-col items-start gap-0.5 text-left w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)] rounded-[2px] pr-1"
                  aria-label={`Sort by ${attr.name}, type ${attr.type}. Current order: ${sortLabel(attr.name)}`}
                >
                  <span className="inline-flex items-center gap-1">
                    <span>{attr.name}</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" aria-hidden />
                  </span>
                  {!compact && (
                    <span className="text-[10px] font-normal normal-case tracking-normal text-[var(--color-ash)]">
                      {attr.type}
                      {attr.nullable ? ' · nullable' : ''}
                    </span>
                  )}
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: Math.min(3, pageSize) }).map((_, rIdx) => (
                <TableRow key={`sk-${rIdx}`}>
                  {columns.map((attr) => (
                    <TableCell key={attr.name}>
                      <div className="h-4 bg-[var(--color-elevated)] rounded-[2px] animate-pulse w-3/4" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : pageRows.map((row, rIdx) => {
                const globalIndex = pageStart + rIdx;
                const rowClass = rowEmphasisClass(
                  globalIndex,
                  emphasizedRowIndices,
                  emphasizedRowVariant
                );
                return (
                <TableRow key={`${pageStart + rIdx}`} className={rowClass}>
                  {columns.map((attr) => (
                    <TableCell
                      key={attr.name}
                      mono={false}
                      className={columnEmphasisClass(attr.name, emphasizedColumns)}
                    >
                      <SandboxValueCell
                        value={row[attr.name] ?? null}
                        type={attributeType(attr.type)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              );
              })}
        </TableBody>
      </Table>

      {sortedRows.length > pageSize && !loading && (
        <nav
          className="flex items-center justify-between gap-2 text-[12px]"
          aria-label="Result table pagination"
        >
          <span className="text-[var(--color-driftwood)]" aria-live="polite">
            Page {safePage + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              aria-label="Previous page"
              className="gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              aria-label="Next page"
              className="gap-1"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
