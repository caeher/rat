import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { StorageError } from '@/lib/persistence/errors';
import type { RemoteWorkspaceNotice } from '@/lib/persistence/types';

interface StorageNoticeBannerProps {
  storageNotice: StorageError | null;
  remoteNotice: RemoteWorkspaceNotice | null;
  isDirty: boolean;
  onDismissStorage: () => void;
  onDismissRemote: () => void;
  onApplyRemote: () => void;
}

export function StorageNoticeBanner({
  storageNotice,
  remoteNotice,
  isDirty,
  onDismissStorage,
  onDismissRemote,
  onApplyRemote,
}: StorageNoticeBannerProps) {
  if (!storageNotice && !remoteNotice) return null;

  return (
    <div className="space-y-2">
      {storageNotice ? (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-[4px] border border-[var(--color-ember)]/40 bg-[var(--color-ember)]/8 text-[13px] text-[var(--color-text)]"
        >
          <div className="flex items-start gap-2 flex-1">
            <AlertTriangle className="w-4 h-4 text-[var(--color-ember)] shrink-0 mt-0.5" />
            <span>{storageNotice.message}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={onDismissStorage} className="gap-1.5 shrink-0">
            <X className="w-3.5 h-3.5" />
            Dismiss
          </Button>
        </div>
      ) : null}

      {remoteNotice ? (
        <div
          role="status"
          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-[4px] border border-[var(--color-amber)]/50 bg-[var(--color-amber)]/10 text-[13px] text-[var(--color-text)]"
        >
          <div className="flex items-start gap-2 flex-1">
            <RefreshCw className="w-4 h-4 text-[var(--color-amber)] shrink-0 mt-0.5" />
            <span>
              Another browser tab saved a newer workspace
              {isDirty ? ' while you have unsaved edits here' : ''}. Reload the stored workspace or keep
              working in this tab.
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={onDismissRemote}>
              Keep this tab
            </Button>
            <Button variant="primary" size="sm" onClick={onApplyRemote}>
              Load newer save
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
