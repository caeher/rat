import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Tag } from '@/components/ui/Tag';
import type { SandboxAction } from '@/lib/sandbox/reducer';
import type { SandboxSchemaSet, SandboxState } from '@/lib/sandbox/types';
import {
  buildExpressionSave,
  buildSnapshotSave,
  buildWorkspaceExport,
  clearAllPersistedData,
  clearQueryHistory,
  deleteSavedItem,
  expressionSaveCompatible,
  importWorkspaceBundle,
  listQueryHistory,
  listSavedItems,
  upsertSavedItem,
} from '@/lib/persistence/client';
import type { QueryHistoryEntry, SavedItem } from '@/lib/persistence/types';
import { Archive, Clock, Download, FolderOpen, History, Trash2, Upload } from 'lucide-react';

interface WorkspacePersistencePanelProps {
  expression: string;
  sandboxState: SandboxState;
  activeSchemaSet: SandboxSchemaSet | undefined;
  dispatch: (action: SandboxAction) => void;
  onLoadExpression: (expression: string) => void;
  onWorkspaceImported: (sandbox: SandboxState, expression: string) => void;
}

export function WorkspacePersistencePanel({
  expression,
  sandboxState,
  activeSchemaSet,
  dispatch,
  onLoadExpression,
  onWorkspaceImported,
}: WorkspacePersistencePanelProps) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
  const [saves, setSaves] = useState<SavedItem[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveMode, setSaveMode] = useState<'expression' | 'snapshot'>('expression');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [renameTarget, setRenameTarget] = useState<SavedItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [schemaMismatch, setSchemaMismatch] = useState<SavedItem | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const refreshLists = useCallback(async () => {
    setHistory(await listQueryHistory(50));
    setSaves(await listSavedItems());
  }, []);

  useEffect(() => {
    if (open) void refreshLists();
  }, [open, refreshLists]);

  const handleSave = async () => {
    if (!saveName.trim() || !activeSchemaSet) return;
    const item =
      saveMode === 'snapshot'
        ? buildSnapshotSave({ name: saveName, expression, sandbox: sandboxState })
        : buildExpressionSave({ name: saveName, expression, schemaSet: activeSchemaSet });
    const result = await upsertSavedItem(item);
    if (result.ok) {
      setFeedback(`Saved “${item.name}” (${item.kind === 'snapshot' ? 'expression + data' : 'expression only'}).`);
      setSaveName('');
      await refreshLists();
    } else {
      setFeedback(result.error?.message ?? 'Save failed.');
    }
  };

  const handleLoadSave = (item: SavedItem) => {
    if (item.kind === 'snapshot' && item.sandbox) {
      dispatch({ type: 'REPLACE_SANDBOX_STATE', state: item.sandbox });
      onLoadExpression(item.expression);
      setFeedback(`Loaded snapshot “${item.name}”.`);
      return;
    }
    if (activeSchemaSet && !expressionSaveCompatible(item, activeSchemaSet)) {
      setSchemaMismatch(item);
      return;
    }
    onLoadExpression(item.expression);
    setFeedback(`Loaded expression “${item.name}”.`);
  };

  const handleConfirmExpressionOnly = () => {
    if (!schemaMismatch) return;
    onLoadExpression(schemaMismatch.expression);
    setFeedback(
      `Loaded expression “${schemaMismatch.name}”. Verify relation names match (${schemaMismatch.relationNames?.join(', ') ?? 'see saved metadata'}).`
    );
    setSchemaMismatch(null);
  };

  const handleRestoreHistory = (entry: QueryHistoryEntry) => {
    dispatch({ type: 'RESTORE_SCHEMA_SET_SNAPSHOT', schemaSet: entry.schemaSetSnapshot });
    onLoadExpression(entry.expression);
    setFeedback(`Restored history run from ${new Date(entry.executedAt).toLocaleString()}.`);
  };

  const handleExport = async () => {
    const bundle = await buildWorkspaceExport();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rat-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setFeedback('Workspace exported.');
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const result = await importWorkspaceBundle(text);
    if (!result.ok || !result.value) {
      setFeedback(result.error?.message ?? 'Import failed.');
      return;
    }
    onWorkspaceImported(result.value.sandbox, result.value.expression);
    setFeedback('Workspace imported. Previous data was replaced atomically after validation.');
    await refreshLists();
  };

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    const updated: SavedItem = { ...renameTarget, name: renameValue.trim(), updatedAt: Date.now() };
    await upsertSavedItem(updated);
    setRenameTarget(null);
    setRenameValue('');
    await refreshLists();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm" className="gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" />
            Workspace
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Workspace & history</DialogTitle>
            <DialogDescription>
              Saves, query history, and import/export stay on this device (no account). Expression-only
              saves record the schema fingerprint so you know when data must match.
            </DialogDescription>
          </DialogHeader>

          {feedback ? (
            <p className="text-[12px] text-[var(--color-driftwood)] border border-[var(--color-outline)]/50 rounded-[4px] px-3 py-2">
              {feedback}
            </p>
          ) : null}

          <Tabs defaultValue="saved">
            <TabsList>
              <TabsTrigger value="saved" className="gap-1.5">
                <Archive className="w-3.5 h-3.5" />
                Saved
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5">
                <History className="w-3.5 h-3.5" />
                History
              </TabsTrigger>
              <TabsTrigger value="data" className="gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Import / export
              </TabsTrigger>
            </TabsList>

            <TabsContent value="saved" className="space-y-4 pt-2">
              <div className="space-y-2 border border-[var(--color-outline)]/50 rounded-[4px] p-3">
                <label className="text-[12px] font-medium text-[var(--color-text)]" htmlFor="save-name">
                  Name
                </label>
                <input
                  id="save-name"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full text-[13px] px-2 py-1.5 border border-[var(--color-outline)] rounded-[4px] bg-[var(--color-canvas)]"
                  placeholder="Midterm practice"
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={saveMode === 'expression' ? 'primary' : 'secondary'}
                    onClick={() => setSaveMode('expression')}
                  >
                    Expression only
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={saveMode === 'snapshot' ? 'primary' : 'secondary'}
                    onClick={() => setSaveMode('snapshot')}
                  >
                    Expression + data
                  </Button>
                </div>
                <Button size="sm" variant="amber" onClick={() => void handleSave()} disabled={!saveName.trim()}>
                  Save
                </Button>
              </div>

              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {saves.length === 0 ? (
                  <li className="text-[12px] text-[var(--color-driftwood)]">No named saves yet.</li>
                ) : (
                  saves.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 border border-[var(--color-outline)]/40 rounded-[4px] px-2 py-1.5"
                    >
                      <div>
                        <div className="text-[13px] font-medium">{item.name}</div>
                        <div className="flex gap-1.5 mt-0.5 flex-wrap">
                          <Tag variant="default">{item.kind === 'snapshot' ? 'Data + query' : 'Query only'}</Tag>
                          {item.schemaSetName ? (
                            <span className="text-[11px] text-[var(--color-driftwood)]">{item.schemaSetName}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => handleLoadSave(item)}>
                          Load
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setRenameTarget(item);
                            setRenameValue(item.name);
                          }}
                        >
                          Rename
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void deleteSavedItem(item.id).then(refreshLists)}
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </TabsContent>

            <TabsContent value="history" className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-[12px] text-[var(--color-driftwood)]">Recent runs include dataset snapshots.</span>
                <Button size="sm" variant="secondary" onClick={() => setConfirmClearHistory(true)}>
                  Clear history
                </Button>
              </div>
              <ul className="space-y-2 max-h-56 overflow-y-auto">
                {history.length === 0 ? (
                  <li className="text-[12px] text-[var(--color-driftwood)]">No runs recorded yet.</li>
                ) : (
                  history.map((entry) => (
                    <li
                      key={entry.id}
                      className="border border-[var(--color-outline)]/40 rounded-[4px] px-2 py-1.5 space-y-1"
                    >
                      <div className="flex justify-between gap-2 flex-wrap">
                        <span className="text-[11px] text-[var(--color-driftwood)] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(entry.executedAt).toLocaleString()}
                        </span>
                        <Tag variant={entry.status === 'success' ? 'forest' : 'default'}>{entry.status}</Tag>
                      </div>
                      <code className="text-[11px] font-mono block truncate">{entry.expression}</code>
                      <div className="text-[11px] text-[var(--color-driftwood)]">
                        {entry.schemaSetName} · v{entry.dataVersion}
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => handleRestoreHistory(entry)}>
                        Restore query & data
                      </Button>
                    </li>
                  ))
                )}
              </ul>
            </TabsContent>

            <TabsContent value="data" className="space-y-4 pt-2">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => void handleExport()}>
                  <Download className="w-3.5 h-3.5" />
                  Export JSON
                </Button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImportFile(file);
                    e.target.value = '';
                  }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => importInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import JSON
                </Button>
              </div>
              <p className="text-[12px] text-[var(--color-driftwood)]">
                Imports are validated before replacing stored workspace data. If validation fails, your
                existing data is left unchanged.
              </p>
              <Button size="sm" variant="secondary" onClick={() => setConfirmClearAll(true)}>
                Delete all local data
              </Button>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClearHistory} onOpenChange={setConfirmClearHistory}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear query history?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes run history from this browser. Saved named items and your current workspace are
              kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void clearQueryHistory().then(refreshLists);
                setConfirmClearHistory(false);
              }}
            >
              Clear history
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClearAll} onOpenChange={setConfirmClearAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all local RAT data?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes workspace, history, saves, and learning progress from this browser. Export first if
              you need a backup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void clearAllPersistedData();
                setConfirmClearAll(false);
                setFeedback('All local data deleted.');
              }}
            >
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={schemaMismatch !== null} onOpenChange={(o) => !o && setSchemaMismatch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Schema may not match</AlertDialogTitle>
            <AlertDialogDescription>
              “{schemaMismatch?.name}” was saved for schema “{schemaMismatch?.schemaSetName}” with
              relations {schemaMismatch?.relationNames?.join(', ')}. Your active schema looks different.
              Load the expression anyway, or open a snapshot save that includes data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExpressionOnly}>Load expression</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={renameTarget !== null} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename save</DialogTitle>
          </DialogHeader>
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="w-full text-[13px] px-2 py-1.5 border border-[var(--color-outline)] rounded-[4px]"
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => void handleRename()}>Save name</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
