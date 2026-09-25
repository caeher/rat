import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tag } from '@/components/ui/Tag';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/Dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import {
  SANDBOX_LIMITS,
  SUPPORTED_ATTRIBUTE_TYPES,
  buildDefaultMappings,
  inferColumnTypes,
  parseCsvText,
  truncateCsvPreview,
  validateCsvImport,
  type CsvColumnMapping,
  type CsvDelimiter,
  type SandboxAction,
} from '@/lib/sandbox';
import type { SandboxRelation, SandboxSchemaSet } from '@/lib/sandbox/types';
import type { SandboxAttributeType } from '@/lib/sandbox/constants';
import { FileUp, AlertTriangle } from 'lucide-react';

export interface CsvImportDialogProps {
  activeSchemaSet: SandboxSchemaSet;
  selectedRelation: SandboxRelation | undefined;
  dispatch: (action: SandboxAction) => void;
}

type DelimiterChoice = CsvDelimiter | 'auto';

export function CsvImportDialog({
  activeSchemaSet: _activeSchemaSet,
  selectedRelation,
  dispatch,
}: CsvImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [delimiter, setDelimiter] = useState<DelimiterChoice>('auto');
  const [mappings, setMappings] = useState<CsvColumnMapping[]>([]);
  const [relationName, setRelationName] = useState('ImportedRelation');
  const [importMode, setImportMode] = useState<'new_relation' | 'replace_relation'>('new_relation');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [parseToken, setParseToken] = useState(0);

  const parsed = useMemo(() => {
    if (!rawText) return null;
    return parseCsvText(rawText, {
      delimiter,
      stripBom: true,
    });
  }, [rawText, delimiter, parseToken]);

  useEffect(() => {
    if (!parsed || parsed.headers.length === 0) {
      setMappings([]);
      return;
    }
    const guesses = inferColumnTypes(parsed.rows, parsed.headers.length);
    setMappings(buildDefaultMappings(parsed.headers, guesses));
  }, [parsed?.headers.join('|'), parsed?.rows.length]);

  const previewRows = useMemo(() => {
    if (!parsed) return [];
    return truncateCsvPreview(parsed.rows, SANDBOX_LIMITS.maxCsvPreviewRows);
  }, [parsed]);

  const validation = useMemo(() => {
    if (!parsed || parsed.headers.length === 0) return null;
    return validateCsvImport(parsed.headers, parsed.rows, mappings, relationName.trim());
  }, [parsed, mappings, relationName]);

  const handleFile = useCallback(async (file: File | null) => {
    setFileError(null);
    if (!file) return;
    if (file.size > SANDBOX_LIMITS.maxCsvFileBytes) {
      setFileError(
        `File exceeds ${Math.round(SANDBOX_LIMITS.maxCsvFileBytes / 1024)} KB limit (see docs/SANDBOX_LIMITS.md).`
      );
      return;
    }
    const text = await file.text();
    setFileName(file.name);
    setRawText(text);
    setParseToken((t) => t + 1);
    const base = file.name.replace(/\.csv$/i, '').replace(/[^\w]/g, '_');
    setRelationName(base || 'ImportedRelation');
  }, []);

  const resetDialog = useCallback(() => {
    setFileName(null);
    setRawText('');
    setFileError(null);
    setMappings([]);
    setConfirmReplace(false);
  }, []);

  const commitImport = useCallback(() => {
    if (!validation || !validation.ok) return;
    dispatch({
      type: 'IMPORT_CSV',
      mode: importMode,
      relationId: importMode === 'replace_relation' ? selectedRelation?.id : undefined,
      relationName: relationName.trim(),
      attributes: validation.attributes,
      rows: validation.rows,
    });
    setOpen(false);
    resetDialog();
  }, [dispatch, importMode, relationName, resetDialog, selectedRelation?.id, validation]);

  const tryImport = useCallback(() => {
    if (!validation?.ok) return;
    if (
      importMode === 'replace_relation' &&
      selectedRelation &&
      selectedRelation.rows.length > 0
    ) {
      setConfirmReplace(true);
      return;
    }
    commitImport();
  }, [commitImport, importMode, selectedRelation, validation?.ok]);

  const updateMapping = (index: number, patch: Partial<CsvColumnMapping>) => {
    setMappings((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetDialog();
        }}
      >
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm" className="gap-1">
            <FileUp className="w-3.5 h-3.5" />
            Import CSV
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import CSV into sandbox</DialogTitle>
            <DialogDescription>
              Files are read locally in your browser (max{' '}
              {Math.round(SANDBOX_LIMITS.maxCsvFileBytes / 1024)} KB). Preview shows plain text — no HTML
              rendering.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1">
                <label className="text-[11px] text-[var(--color-ash)] mb-1 block" htmlFor="csv-file">
                  CSV file
                </label>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="block w-full text-[12px] text-[var(--color-driftwood)] file:mr-3 file:py-1.5 file:px-3 file:rounded-[3px] file:border file:border-[var(--color-outline)] file:bg-[var(--color-card)] file:text-[var(--color-text)]"
                  onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                />
                {fileName ? (
                  <p className="text-[11px] text-[var(--color-ash)] mt-1 font-mono">{fileName}</p>
                ) : null}
                {fileError ? (
                  <p className="text-[12px] text-[var(--color-ember)] mt-1">{fileError}</p>
                ) : null}
              </div>
              <div className="w-full sm:w-40">
                <label className="text-[11px] text-[var(--color-ash)] mb-1 block">Delimiter</label>
                <Select value={delimiter} onValueChange={(v) => setDelimiter(v as DelimiterChoice)}>
                  <SelectTrigger selectSize="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    <SelectItem value=",">Comma (,)</SelectItem>
                    <SelectItem value=";">Semicolon (;)</SelectItem>
                    <SelectItem value="	">Tab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {parsed && parsed.issues.length > 0 ? (
              <div className="rounded-[4px] border border-[var(--color-amber)]/40 bg-[var(--color-card)] p-2 space-y-1">
                {parsed.issues.map((issue, i) => (
                  <p key={i} className="text-[12px] text-[var(--color-driftwood)] flex gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-amber)] shrink-0 mt-0.5" />
                    {issue.message}
                  </p>
                ))}
              </div>
            ) : null}

            {rawText ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[var(--color-ash)]">Raw preview (plain text)</span>
                  {parsed ? (
                    <Tag variant="default" className="font-mono">
                      delim &quot;{parsed.delimiter === '\t' ? '\\t' : parsed.delimiter}&quot;
                    </Tag>
                  ) : null}
                </div>
                <pre className="max-h-28 overflow-auto p-2 text-[11px] font-mono bg-[var(--color-canvas)] border border-[var(--color-outline)]/60 rounded-[4px] whitespace-pre-wrap break-all">
                  {rawText.slice(0, 2000)}
                  {rawText.length > 2000 ? '\n…' : ''}
                </pre>
              </div>
            ) : null}

            {parsed && parsed.headers.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Relation name"
                    inputSize="sm"
                    mono
                    value={relationName}
                    onChange={(e) => setRelationName(e.target.value)}
                  />
                  <div>
                    <label className="text-[11px] text-[var(--color-ash)] mb-1 block">Import mode</label>
                    <Select
                      value={importMode}
                      onValueChange={(v) => setImportMode(v as 'new_relation' | 'replace_relation')}
                    >
                      <SelectTrigger selectSize="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new_relation">New relation</SelectItem>
                        <SelectItem value="replace_relation" disabled={!selectedRelation}>
                          Replace &ldquo;{selectedRelation?.name ?? '…'}&rdquo;
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[12px] font-medium text-[var(--color-text)]">Column mapping & types</h4>
                  <p className="text-[11px] text-[var(--color-driftwood)]">
                    Confirm types and nullability. Empty cells map to NULL when nullable; use &ldquo;empty
                    string&rdquo; for literal &quot;&quot; on string columns.
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {mappings.map((mapping, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2 border border-[var(--color-outline)]/40 rounded-[4px] bg-[var(--color-canvas)]"
                      >
                        <div className="sm:col-span-3 text-[11px] font-mono text-[var(--color-ash)] flex items-center">
                          {parsed.rawHeaders[mapping.sourceIndex] ?? mapping.attributeName}
                        </div>
                        <Input
                          className="sm:col-span-3"
                          inputSize="sm"
                          mono
                          label="Attribute"
                          value={mapping.attributeName}
                          onChange={(e) => updateMapping(index, { attributeName: e.target.value })}
                        />
                        <div className="sm:col-span-2">
                          <label className="text-[11px] text-[var(--color-ash)] mb-1 block">Type</label>
                          <Select
                            value={mapping.type}
                            onValueChange={(v) =>
                              updateMapping(index, { type: v as SandboxAttributeType })
                            }
                          >
                            <SelectTrigger selectSize="sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SUPPORTED_ATTRIBUTE_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="sm:col-span-2 flex flex-col gap-1 justify-end pb-1">
                          <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={mapping.nullable}
                              onChange={(e) => updateMapping(index, { nullable: e.target.checked })}
                            />
                            Nullable
                          </label>
                          <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={mapping.treatEmptyAsEmptyString}
                              onChange={(e) =>
                                updateMapping(index, { treatEmptyAsEmptyString: e.target.checked })
                              }
                            />
                            Empty → &quot;&quot;
                          </label>
                        </div>
                        <div className="sm:col-span-2 flex items-end">
                          <label className="flex items-center gap-2 text-[11px] cursor-pointer pb-1">
                            <input
                              type="checkbox"
                              checked={mapping.sourceIndex < 0}
                              onChange={(e) =>
                                updateMapping(index, {
                                  sourceIndex: e.target.checked ? -1 : index,
                                })
                              }
                            />
                            Skip
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto border border-[var(--color-outline)]/50 rounded-[4px]">
                  <table className="w-full text-[11px] font-mono">
                    <thead>
                      <tr className="bg-[var(--color-elevated)]">
                        {parsed.headers.map((h) => (
                          <th key={h} className="px-2 py-1 text-left font-medium text-[var(--color-text)]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, ri) => (
                        <tr key={ri} className="border-t border-[var(--color-outline)]/30">
                          {parsed.headers.map((_, ci) => (
                            <td key={ci} className="px-2 py-1 text-[var(--color-driftwood)] whitespace-pre-wrap">
                              {row[ci] ?? ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.rows.length > previewRows.length ? (
                    <p className="text-[10px] text-[var(--color-ash)] p-2">
                      Previewing first {previewRows.length} of {parsed.rows.length} rows.
                    </p>
                  ) : null}
                </div>

                {validation && !validation.ok ? (
                  <div className="rounded-[4px] border border-[var(--color-ember)]/40 p-2 space-y-1 max-h-32 overflow-y-auto">
                    {'limitError' in validation && validation.limitError ? (
                      <p className="text-[12px] text-[var(--color-ember)]">{validation.limitError}</p>
                    ) : null}
                    {'errors' in validation &&
                      validation.errors.slice(0, 20).map((err, i) => (
                        <p key={i} className="text-[12px] text-[var(--color-ember)] font-mono">
                          Row {err.row}, {err.column}: {err.message}
                        </p>
                      ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              variant="primary"
              disabled={!validation?.ok}
              onClick={tryImport}
            >
              Import validated data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmReplace} onOpenChange={setConfirmReplace}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace relation data?</AlertDialogTitle>
            <AlertDialogDescription>
              Importing will replace all rows and columns in &ldquo;{selectedRelation?.name}&rdquo;. Cancel
              to keep the current sandbox unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={commitImport}>Replace with CSV</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
