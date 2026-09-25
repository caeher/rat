import React, { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes, forwardRef, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-x-auto border border-[var(--color-outline)]/60 rounded-[4px] bg-[var(--color-card)]">
      <table
        ref={ref}
        className={twMerge('w-full caption-bottom text-[13px] text-left', className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = 'Table';

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={twMerge('border-b border-[var(--color-outline)]/60 bg-[var(--color-elevated)]/60 select-none', className)}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={twMerge('divide-y divide-[var(--color-outline)]/40', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={twMerge(
        'transition-colors hover:bg-[var(--color-elevated)]/40 data-[state=selected]:bg-[var(--color-elevated)]',
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

export const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      scope="col"
      className={twMerge(
        'h-9 px-3.5 text-left align-middle font-medium text-[12px] font-mono text-[var(--color-ash)] uppercase tracking-wider',
        className
      )}
      {...props}
    />
  )
);
TableHead.displayName = 'TableHead';

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  mono?: boolean;
}

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, mono = true, ...props }, ref) => (
    <td
      ref={ref}
      className={twMerge(
        'px-3.5 py-2 align-middle text-[var(--color-text)]',
        mono ? 'font-mono text-[12px]' : 'font-sans text-[13px]',
        className
      )}
      {...props}
    />
  )
);
TableCell.displayName = 'TableCell';

export const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={twMerge('mt-2 text-[12px] text-[var(--color-driftwood)] italic text-center', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

export interface DataTableProps<T> {
  columns: { key: keyof T | string; header: string; mono?: boolean; render?: (item: T) => ReactNode }[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  caption?: string;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No relation records found.',
  caption,
  className,
}: DataTableProps<T>) {
  return (
    <Table className={className}>
      {caption && <TableCaption>{caption}</TableCaption>}
      <TableHeader>
        <TableRow>
          {columns.map((col, idx) => (
            <TableHead key={String(col.key) || idx}>{col.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: 3 }).map((_, rIdx) => (
            <TableRow key={`skeleton-${rIdx}`}>
              {columns.map((_, cIdx) => (
                <TableCell key={`skeleton-cell-${cIdx}`}>
                  <div className="h-4 bg-[var(--color-elevated)] rounded-[2px] animate-pulse w-3/4" />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center py-6 text-[var(--color-driftwood)] font-sans">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, rIdx) => (
            <TableRow key={rIdx}>
              {columns.map((col, cIdx) => (
                <TableCell key={String(col.key) || cIdx} mono={col.mono !== false}>
                  {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '')}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
