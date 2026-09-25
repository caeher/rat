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
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import type { SandboxAction } from '@/lib/sandbox/reducer';
import type { SandboxState } from '@/lib/sandbox/types';
import {
  buildPortableShareLink,
  cloneSandboxStateWithFreshIds,
  parseShareFromLocationHash,
  suggestWorkspaceFilename,
  workspaceFileJson,
  type SandboxSharePayloadV1,
  type SharePreview,
} from '@/lib/share';
import { sandboxNeedsExampleConfirm } from '@/lib/reference/loadInSandbox';
import { parseImportJson } from '@/lib/persistence/validate';
import { StorageError } from '@/lib/persistence/errors';
import { Share2, Download, Upload, AlertTriangle } from 'lucide-react';
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

interface SandboxShareDialogProps {
  expression: string;
  sandboxState: SandboxState;
  dispatch: (action: SandboxAction) => void;
  onExpressionChange: (expression: string) => void;
  onShareApplied: () => void;
  workspaceReady: boolean;
}

function SharePreviewSummary({ preview }: { preview: SharePreview }) {
  return (
    <ul className="text-[13px] text-[var(--color-driftwood)] space-y-1 list-disc pl-4">
      <li>
        Expression ({preview.expression.length} characters)
        <span className="block font-mono text-[11px] text-[var(--color-text)] mt-0.5 truncate">
          {preview.expression.trim() || '(empty)'}
        </span>
      </li>
      <li>
        {preview.schemaSetCount} schema set{preview.schemaSetCount === 1 ? '' : 's'} — active:{' '}
        <span className="text-[var(--color-text)]">{preview.schemaSetName}</span>
      </li>
      <li>
        {preview.relationCount} relation{preview.relationCount === 1 ? '' : 's'}, {preview.rowCount} total row
        {preview.rowCount === 1 ? '' : 's'}
      </li>
      {preview.approxDecodedBytes > 0 && (
        <li>Approx. payload size: {Math.round(preview.approxDecodedBytes / 1024)} KB</li>
      )}
    </ul>
  );
}

export function SandboxShareDialog({
  expression,
  sandboxState,
  dispatch,
  onExpressionChange,
  onShareApplied,
  workspaceReady,
}: SandboxShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<SharePreview | null>(null);
  const [oversizedBundle, setOversizedBundle] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [buildError, setBuildError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingImport, setPendingImport] = useState<{
    payload: SandboxSharePayloadV1;
    preview: SharePreview;
  } | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const consumedHashRef = useRef<string | null>(null);

  const refreshShareLink = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setBuildError(null);
    setOversizedBundle(null);
    setShareUrl(null);
    const result = await buildPortableShareLink(window.location.origin, expression, sandboxState);
    setPreview(result.preview);
    if (result.ok) {
      setShareUrl(result.url);
      return;
    }
    setOversizedBundle(workspaceFileJson(result.bundle));
    setBuildError(
      'This sandbox is too large for a portable URL. Download the workspace file and share that instead (import below).'
    );
  }, [expression, sandboxState]);

  useEffect(() => {
    if (open) void refreshShareLink();
  }, [open, refreshShareLink]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
    }
  };

  const handleDownloadWorkspace = () => {
    if (!oversizedBundle || typeof window === 'undefined') return;
    const active = sandboxState.schemaSets.find((s) => s.id === sandboxState.activeSchemaSetId);
    const blob = new Blob([oversizedBundle], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = suggestWorkspaceFilename(active?.name ?? 'sandbox');
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const applyImport = useCallback(
    (payload: SandboxSharePayloadV1, mode: 'merge' | 'replace') => {
      const cloned = cloneSandboxStateWithFreshIds(payload.sandbox);
      dispatch({ type: 'IMPORT_SHARED_SANDBOX', mode, state: cloned });
      onExpressionChange(payload.expression);
      onShareApplied();
      setPendingImport(null);
      setConfirmReplace(false);
      if (typeof window !== 'undefined' && window.location.hash) {
        const path = window.location.pathname + window.location.search;
        window.history.replaceState(null, '', path);
      }
    },
    [dispatch, onExpressionChange, onShareApplied]
  );

  const handleRequestImportAsNew = () => {
    if (!pendingImport) return;
    applyImport(pendingImport.payload, 'merge');
  };

  const handleRequestReplace = () => {
    if (!pendingImport) return;
    if (sandboxNeedsExampleConfirm(expression, sandboxState.dataVersion)) {
      setConfirmReplace(true);
      return;
    }
    applyImport(pendingImport.payload, 'replace');
  };

  const handleWorkspaceFile = async (file: File) => {
    setImportError(null);
    try {
      const text = await file.text();
      const bundle = parseImportJson(text);
      const previewData = {
        payload: {
          v: 1 as const,
          expression: bundle.workspace.expression,
          sandbox: bundle.workspace.sandbox,
        },
        preview: {
          expression: bundle.workspace.expression,
          schemaSetName:
            bundle.workspace.sandbox.schemaSets.find(
              (s) => s.id === bundle.workspace.sandbox.activeSchemaSetId
            )?.name ?? 'Imported',
          schemaSetCount: bundle.workspace.sandbox.schemaSets.length,
          relationCount: bundle.workspace.sandbox.schemaSets.reduce(
            (n, s) => n + s.relations.length,
            0
          ),
          rowCount: bundle.workspace.sandbox.schemaSets.reduce(
            (n, s) => n + s.relations.reduce((r, rel) => r + rel.rows.length, 0),
            0
          ),
          approxDecodedBytes: new TextEncoder().encode(text).length,
        },
      };
      setPendingImport(previewData);
      setOpen(true);
    } catch (error) {
      if (error instanceof StorageError) {
        setImportError(error.message);
      } else {
        setImportError(error instanceof Error ? error.message : 'Could not import workspace file.');
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !workspaceReady) return;
    const hash = window.location.hash;
    if (!hash || consumedHashRef.current === hash) return;

    void (async () => {
      const result = await parseShareFromLocationHash(hash);
      consumedHashRef.current = hash;
      if (!result.ok) {
        if (result.code !== 'missing') {
          setImportError(result.message);
          setOpen(true);
        }
        return;
      }
      setPendingImport({ payload: result.payload, preview: result.preview });
      setOpen(true);
    })();
  }, [workspaceReady]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm" className="gap-1.5">
            <Share2 className="w-3.5 h-3.5" />
            Share
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Share sandbox</DialogTitle>
            <DialogDescription>
              Portable links encode your schema, relation data, and expression in the URL fragment (nothing is sent to a
              server). Anyone with the link can read the included data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {preview && (
              <div className="rounded-[4px] border border-[var(--color-outline)]/70 bg-[var(--color-card)] p-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-medium text-[var(--color-text)]">Included in this share</span>
                  <Tag variant="default">Browser-only</Tag>
                </div>
                <SharePreviewSummary preview={preview} />
              </div>
            )}

            <div className="flex items-start gap-2 text-[12px] text-[var(--color-driftwood)]">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--color-amber)] mt-0.5" aria-hidden />
              <p>
                Links are public to whoever receives them. Do not share sensitive or personal data. Content is restored
                locally in the browser only.
              </p>
            </div>

            {buildError && (
              <p className="text-[13px] text-[var(--color-amber)]" role="status">
                {buildError}
              </p>
            )}

            {shareUrl && (
              <div className="p-3 bg-[var(--color-card)] border border-[var(--color-outline)]/70 rounded-[4px] font-mono text-[11px] text-[var(--color-text)] break-all select-all">
                {shareUrl}
              </div>
            )}

            {importError && (
              <p className="text-[13px] text-[var(--color-ember)]" role="alert">
                {importError}
              </p>
            )}

            <div className="border-t border-[var(--color-outline)]/50 pt-3 space-y-2">
              <p className="text-[12px] text-[var(--color-driftwood)]">
                Workspace file fallback (for oversized sandboxes or issue #19 exports)
              </p>
              <div className="flex flex-wrap gap-2">
                {oversizedBundle && (
                  <Button variant="secondary" size="sm" className="gap-1.5" onClick={handleDownloadWorkspace}>
                    <Download className="w-3.5 h-3.5" />
                    Download workspace file
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import workspace file
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void handleWorkspaceFile(file);
                  }}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
            <Button variant="primary" onClick={() => void handleCopy()} disabled={!shareUrl}>
              {copyState === 'copied' ? 'Copied link' : copyState === 'error' ? 'Copy failed' : 'Copy link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingImport !== null} onOpenChange={(next) => !next && setPendingImport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Open shared sandbox?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p>
                  A portable share was detected. Choose how to open it — your current sandbox is not changed until you
                  confirm.
                </p>
                {pendingImport && <SharePreviewSummary preview={pendingImport.preview} />}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="secondary" onClick={handleRequestImportAsNew}>
              Import as new schema set
            </Button>
            <AlertDialogAction onClick={handleRequestReplace}>Replace entire sandbox</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReplace} onOpenChange={setConfirmReplace}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace current sandbox?</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard your current schema sets and expression in this tab. Import as a new schema set instead
              to keep existing work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current work</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingImport) applyImport(pendingImport.payload, 'replace');
              }}
            >
              Replace sandbox
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
