import {
  WORKSPACE_DOCUMENT_VERSION,
  WORKSPACE_EXPORT_VERSION,
} from '@/lib/persistence/constants';
import type { WorkspaceExportBundle } from '@/lib/persistence/types';
import type { SandboxState } from '@/lib/sandbox/types';

export function buildWorkspaceFileBundle(
  expression: string,
  sandbox: SandboxState
): WorkspaceExportBundle {
  const now = Date.now();
  return {
    exportVersion: WORKSPACE_EXPORT_VERSION,
    exportedAt: now,
    workspace: {
      version: WORKSPACE_DOCUMENT_VERSION,
      sandbox,
      expression,
      updatedAt: now,
    },
    history: [],
    saves: [],
    exerciseProgress: {},
    quizProgress: [],
  };
}

export function workspaceFileJson(bundle: WorkspaceExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

export function suggestWorkspaceFilename(schemaSetName: string): string {
  const safe = schemaSetName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const stamp = new Date().toISOString().slice(0, 10);
  return `rat-workspace-${safe || 'sandbox'}-${stamp}.json`;
}
