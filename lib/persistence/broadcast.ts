import { BROADCAST_CHANNEL_NAME } from './constants';
import type { RemoteWorkspaceNotice } from './types';

export type WorkspaceBroadcastMessage =
  | { type: 'workspace_saved'; notice: RemoteWorkspaceNotice }
  | { type: 'import_completed'; notice: RemoteWorkspaceNotice }
  | { type: 'cleared' };

export function createWorkspaceBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  try {
    return new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch {
    return null;
  }
}

export function postWorkspaceSaved(
  channel: BroadcastChannel | null,
  notice: RemoteWorkspaceNotice
): void {
  channel?.postMessage({ type: 'workspace_saved', notice } satisfies WorkspaceBroadcastMessage);
}

export function postImportCompleted(
  channel: BroadcastChannel | null,
  notice: RemoteWorkspaceNotice
): void {
  channel?.postMessage({ type: 'import_completed', notice } satisfies WorkspaceBroadcastMessage);
}

export function postStorageCleared(channel: BroadcastChannel | null): void {
  channel?.postMessage({ type: 'cleared' } satisfies WorkspaceBroadcastMessage);
}
