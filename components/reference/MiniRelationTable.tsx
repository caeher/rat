import React from 'react';
import type { ReferenceTable } from '@/lib/reference/types';

export function MiniRelationTable({ table }: { table: ReferenceTable }) {
  return (
    <figure className="space-y-1.5">
      <figcaption className="text-[11px] font-mono text-[var(--color-ash)]">{table.title}</figcaption>
      <div className="overflow-x-auto border border-[var(--color-outline)]/60 rounded-[4px]">
        <table className="w-full text-left text-[12px] font-mono border-collapse min-w-[12rem]">
          <thead>
            <tr className="bg-[var(--color-elevated)] border-b border-[var(--color-outline)]/60">
              {table.columns.map((col) => (
                <th key={col} scope="col" className="px-2 py-1.5 font-medium text-[var(--color-text)]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-[var(--color-outline)]/40 last:border-b-0"
              >
                {table.columns.map((col) => (
                  <td key={col} className="px-2 py-1.5 text-[var(--color-driftwood)]">
                    {row[col] === null ? (
                      <span className="text-[var(--color-mist)] italic">NULL</span>
                    ) : (
                      String(row[col])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
