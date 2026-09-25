import type { ExerciseSessionState } from '@/lib/exercises/session';
import type { QuizDirection, QuizProgressRecord } from '@/lib/quiz/types';
import type { SandboxSchemaSet, SandboxState } from '@/lib/sandbox/types';
import type { WORKSPACE_DOCUMENT_VERSION, WORKSPACE_EXPORT_VERSION } from './constants';

export type QueryRunStatus =
  | 'success'
  | 'algebra_error'
  | 'validation_error'
  | 'sql_mismatch'
  | 'cancelled';

export interface WorkspaceDocument {
  version: typeof WORKSPACE_DOCUMENT_VERSION;
  sandbox: SandboxState;
  expression: string;
  lastRoute?: string;
  updatedAt: number;
}

export interface WorkspaceMeta {
  revision: number;
  updatedAt: number;
}

export interface QueryHistoryEntry {
  id: string;
  executedAt: number;
  expression: string;
  schemaSetId: string;
  schemaSetName: string;
  dataVersion: number;
  /** Deep copy of the active schema set at execution time. */
  schemaSetSnapshot: SandboxSchemaSet;
  status: QueryRunStatus;
  rowCount?: number;
  executionTimeMs?: number;
  message?: string;
}

export type SavedItemKind = 'expression' | 'snapshot';

export interface SavedItem {
  id: string;
  name: string;
  kind: SavedItemKind;
  expression: string;
  createdAt: number;
  updatedAt: number;
  sandbox?: SandboxState;
  schemaFingerprint?: string;
  schemaSetName?: string;
  relationNames?: string[];
}

export interface WorkspaceExportBundle {
  exportVersion: typeof WORKSPACE_EXPORT_VERSION;
  exportedAt: number;
  workspace: WorkspaceDocument;
  history: QueryHistoryEntry[];
  saves: SavedItem[];
  exerciseProgress: Record<string, ExerciseSessionState>;
  quizProgress: QuizProgressRecord[];
}

export interface StorageHealth {
  backend: 'indexeddb' | 'memory' | 'unavailable';
  readable: boolean;
  writable: boolean;
  message?: string;
}

export interface RemoteWorkspaceNotice {
  revision: number;
  updatedAt: number;
}

export type LearningProgressKey =
  | { type: 'exercise'; exerciseId: string }
  | { type: 'quiz'; exerciseId: string; direction: QuizDirection };
