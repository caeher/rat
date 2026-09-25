import { WORKSPACE_DOCUMENT_VERSION, WORKSPACE_EXPORT_VERSION } from './constants';
import type {
  QueryHistoryEntry,
  SavedItem,
  WorkspaceDocument,
  WorkspaceExportBundle,
} from './types';
import { StorageError } from './errors';
import type { SandboxState } from '@/lib/sandbox/types';
import type { ExerciseSessionState } from '@/lib/exercises/session';
import type { QuizProgressRecord } from '@/lib/quiz/types';
import { QUIZ_RESULT_FORMAT_VERSION } from '@/lib/quiz/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function validateSandboxState(raw: unknown): SandboxState | null {
  if (!isRecord(raw)) return null;
  if (!Array.isArray(raw.schemaSets) || !isString(raw.activeSchemaSetId)) return null;
  if (!isNumber(raw.dataVersion)) return null;
  return raw as unknown as SandboxState;
}

export function validateWorkspaceDocument(raw: unknown): WorkspaceDocument | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== WORKSPACE_DOCUMENT_VERSION) return null;
  const sandbox = validateSandboxState(raw.sandbox);
  if (!sandbox || !isString(raw.expression) || !isNumber(raw.updatedAt)) return null;
  const lastRoute = raw.lastRoute;
  if (lastRoute !== undefined && !isString(lastRoute)) return null;
  return {
    version: WORKSPACE_DOCUMENT_VERSION,
    sandbox,
    expression: raw.expression,
    lastRoute: lastRoute as string | undefined,
    updatedAt: raw.updatedAt,
  };
}

function validateHistoryEntry(raw: unknown): QueryHistoryEntry | null {
  if (!isRecord(raw)) return null;
  if (
    !isString(raw.id) ||
    !isNumber(raw.executedAt) ||
    !isString(raw.expression) ||
    !isString(raw.schemaSetId) ||
    !isString(raw.schemaSetName) ||
    !isNumber(raw.dataVersion) ||
    !isRecord(raw.schemaSetSnapshot)
  ) {
    return null;
  }
  return raw as unknown as QueryHistoryEntry;
}

function validateSavedItem(raw: unknown): SavedItem | null {
  if (!isRecord(raw)) return null;
  if (
    !isString(raw.id) ||
    !isString(raw.name) ||
    (raw.kind !== 'expression' && raw.kind !== 'snapshot') ||
    !isString(raw.expression) ||
    !isNumber(raw.createdAt) ||
    !isNumber(raw.updatedAt)
  ) {
    return null;
  }
  if (raw.kind === 'snapshot' && !validateSandboxState(raw.sandbox)) return null;
  return raw as unknown as SavedItem;
}

function validateExerciseProgress(raw: unknown): ExerciseSessionState | null {
  if (!isRecord(raw)) return null;
  if (
    !isBoolean(raw.completedIndependently) ||
    !isBoolean(raw.solutionRevealed) ||
    !isNumber(raw.hintsRevealed)
  ) {
    return null;
  }
  return raw as unknown as ExerciseSessionState;
}

function validateQuizRecord(raw: unknown): QuizProgressRecord | null {
  if (!isRecord(raw)) return null;
  if (raw.formatVersion !== QUIZ_RESULT_FORMAT_VERSION) return null;
  if (!isString(raw.exerciseId) || (raw.direction !== 'algebra_to_sql' && raw.direction !== 'sql_to_algebra')) {
    return null;
  }
  return raw as unknown as QuizProgressRecord;
}

export function validateWorkspaceExport(raw: unknown): WorkspaceExportBundle {
  if (!isRecord(raw)) {
    throw new StorageError('invalid_import', 'Import file is not a valid JSON object.');
  }
  if (raw.exportVersion !== WORKSPACE_EXPORT_VERSION) {
    throw new StorageError(
      'version_mismatch',
      `This export uses version ${String(raw.exportVersion)}; this app supports version ${WORKSPACE_EXPORT_VERSION}.`
    );
  }
  const workspace = validateWorkspaceDocument(raw.workspace);
  if (!workspace) {
    throw new StorageError('invalid_import', 'Workspace section is missing or invalid.');
  }
  if (!Array.isArray(raw.history) || !Array.isArray(raw.saves)) {
    throw new StorageError('invalid_import', 'History or saves section is missing.');
  }
  const history: QueryHistoryEntry[] = [];
  for (const item of raw.history) {
    const entry = validateHistoryEntry(item);
    if (!entry) {
      throw new StorageError('invalid_import', 'One or more history entries are invalid.');
    }
    history.push(entry);
  }
  const saves: SavedItem[] = [];
  for (const item of raw.saves) {
    const save = validateSavedItem(item);
    if (!save) {
      throw new StorageError('invalid_import', 'One or more saved items are invalid.');
    }
    saves.push(save);
  }
  const exerciseProgress: Record<string, ExerciseSessionState> = {};
  if (isRecord(raw.exerciseProgress)) {
    for (const [key, value] of Object.entries(raw.exerciseProgress)) {
      const progress = validateExerciseProgress(value);
      if (!progress) {
        throw new StorageError('invalid_import', `Exercise progress for "${key}" is invalid.`);
      }
      exerciseProgress[key] = progress;
    }
  }
  const quizProgress: QuizProgressRecord[] = [];
  if (Array.isArray(raw.quizProgress)) {
    for (const item of raw.quizProgress) {
      const record = validateQuizRecord(item);
      if (!record) {
        throw new StorageError('invalid_import', 'One or more quiz progress records are invalid.');
      }
      quizProgress.push(record);
    }
  }
  if (!isNumber(raw.exportedAt)) {
    throw new StorageError('invalid_import', 'Export timestamp is missing.');
  }
  return {
    exportVersion: WORKSPACE_EXPORT_VERSION,
    exportedAt: raw.exportedAt,
    workspace,
    history,
    saves,
    exerciseProgress,
    quizProgress,
  };
}

export function parseImportJson(text: string): WorkspaceExportBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new StorageError('invalid_import', 'File is not valid JSON.');
  }
  return validateWorkspaceExport(parsed);
}
