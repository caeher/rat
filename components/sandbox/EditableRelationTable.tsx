import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { SandboxValueCell } from '@/components/sandbox/SandboxValueCell';
import type { SandboxRelation } from '@/lib/sandbox/types';
import type { Tuple } from '@/lib/engine/types';
import { SANDBOX_LIMITS } from '@/lib/sandbox/constants';
import { formatCellForEdit, parseCellInput } from '@/lib/sandbox/validateCell';
import { Plus, Trash2 } from 'lucide-react';

export interface EditableRelationTableProps {
  relation: SandboxRelation;
  onAddRow: () => void;
  onUpdateRow: (rowIndex: number, row: Tuple) => void;
  onDeleteRow: (rowIndex: number) => void;
}

export function EditableRelationTable({
  relation,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
}: EditableRelationTableProps) {
  const [editing, setEditing] = useState<{ row: number; attr: string } | null>(null);
  const [draft, setDraft] = useState('');
  const [cellError, setCellError] = useState<string | null>(null);

  const startEdit = useCallback(
    (rowIndex: number, attrName: string) => {
      const value = relation.rows[rowIndex]?.[attrName] ?? null;
      const attr = relation.attributes.find((a) => a.name === attrName);
      if (!attr) return;
      setEditing({ row: rowIndex, attr: attrName });
      setDraft(formatCellForEdit(value, attr.type));
      setCellError(null);
    },
    [relation]
  );

  const commitEdit = useCallback(() => {
    if (!editing) return;
    const attr = relation.attributes.find((a) => a.name === editing.attr);
    if (!attr) return;

    const parsed = parseCellInput(draft, attr.type, attr.nullable);
    if (!parsed.ok) {
      setCellError(parsed.message);
      return;
    }

    const row = { ...relation.rows[editing.row], [editing.attr]: parsed.value };
    onUpdateRow(editing.row, row);
    setEditing(null);
    setCellError(null);
  }, [draft, editing, onUpdateRow, relation]);

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setCellError(null);
  }, []);

  if (relation.attributes.length === 0) {
    return (
      <EmptyState
        title="No attributes defined"
        description="Add at least one column before entering rows."
      />
    );
  }

  const atRowLimit = relation.rows.length >= SANDBOX_LIMITS.maxRowsPerRelation;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] text-[var(--color-driftwood)]">
          {relation.rows.length} / {SANDBOX_LIMITS.maxRowsPerRelation} rows · NULL, (empty), and{' '}
          <span className="text-[var(--color-amber)]">0</span> are styled distinctly
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={onAddRow}
          disabled={atRowLimit}
          title={atRowLimit ? 'Row limit reached' : 'Add row'}
        >
          <Plus className="w-3.5 h-3.5" />
          Add row
        </Button>
      </div>

      {relation.rows.length === 0 ? (
        <EmptyState
          title="No rows yet"
          description="Add a row to build your relation. Try sample values like 1, Alice, or 2024-01-15 for dates."
          action={
            <Button variant="primary" size="sm" onClick={onAddRow} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Add first row
            </Button>
          }
        />
      ) : (
        <Table>
          <TableCaption>
            Editable data for relation {relation.name}. Press Enter to save a cell, Escape to cancel.
          </TableCaption>
          <TableHeader>
            <TableRow>
              {relation.attributes.map((attr) => (
                <TableHead key={attr.name} scope="col">
                  {attr.name}
                  <span className="block text-[10px] normal-case tracking-normal text-[var(--color-mist)]">
                    {attr.type}{attr.nullable ? ' · null' : ''}
                  </span>
                </TableHead>
              ))}
              <TableHead scope="col" className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {relation.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {relation.attributes.map((attr) => {
                  const isEditing =
                    editing?.row === rowIndex && editing?.attr === attr.name;
                  const value = row[attr.name] ?? null;

                  return (
                    <TableCell key={attr.name}>
                      {isEditing ? (
                        <div className="min-w-[120px]">
                          <Input
                            inputSize="sm"
                            mono
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                commitEdit();
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelEdit();
                              }
                            }}
                            onBlur={() => {
                              // Delay to allow button clicks
                              window.setTimeout(() => {
                                if (editing?.row === rowIndex && editing?.attr === attr.name) {
                                  commitEdit();
                                }
                              }, 0);
                            }}
                            error={cellError ?? undefined}
                            aria-label={`Edit ${attr.name} row ${rowIndex + 1}`}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="w-full text-left rounded-[3px] px-1 py-0.5 hover:bg-[var(--color-elevated)]/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)]"
                          onClick={() => startEdit(rowIndex, attr.name)}
                          aria-label={`Edit ${attr.name} value in row ${rowIndex + 1}`}
                        >
                          <SandboxValueCell value={value} type={attr.type} />
                        </button>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-[var(--color-ash)] hover:text-[var(--color-ember)]"
                    onClick={() => onDeleteRow(rowIndex)}
                    aria-label={`Delete row ${rowIndex + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
