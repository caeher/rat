import { createId } from '@/lib/sandbox/defaults';
import { createInitialSandboxState } from '@/lib/sandbox/defaults';
import type { SandboxSchemaSet, SandboxState } from '@/lib/sandbox/types';
import type { ExerciseSessionState } from '@/lib/exercises/session';
import type { QuizDirection, QuizProgressRecord } from '@/lib/quiz/types';
import { defaultQuizProgress } from '@/lib/quiz/progress';
import {
  MAX_HISTORY_ENTRIES,
  WORKSPACE_DOCUMENT_VERSION,
  WORKSPACE_EXPORT_VERSION,
} from './constants';
import { IndexedDbPersistenceBackend } from './idb-backend';
import { MemoryPersistenceBackend } from './memory-backend';
import { migrateLegacyBrowserStores } from './migrations';
import {
  createWorkspaceBroadcastChannel,
  postImportCompleted,
  postStorageCleared,
  postWorkspaceSaved,
  type WorkspaceBroadcastMessage,
} from './broadcast';
import { schemaSetFingerprint } from './fingerprint';
import { mapDomException, storageFail, storageOk, StorageError, type StorageResult } from './errors';
import { parseImportJson, validateWorkspaceDocument } from './validate';
import type {
  QueryHistoryEntry,
  QueryRunStatus,
  RemoteWorkspaceNotice,
  SavedItem,
  StorageHealth,
  WorkspaceDocument,
  WorkspaceExportBundle,
  WorkspaceMeta,
} from './types';

type Backend = IndexedDbPersistenceBackend | MemoryPersistenceBackend;

let backend: Backend | null = null;
let initPromise: Promise<StorageHealth> | null = null;
let broadcast: BroadcastChannel | null = null;

const exerciseCache = new Map<string, ExerciseSessionState>();
const quizCache = new Map<string, QuizProgressRecord>();

let workspaceRevision = 0;
let persistedRevision = 0;
let lastStorageNotice: StorageError | null = null;
let remoteNotice: RemoteWorkspaceNotice | null = null;

export type PersistenceInitStatus = 'idle' | 'loading' | 'ready' | 'error';

const defaultExerciseSession = (): ExerciseSessionState => ({
  completedIndependently: false,
  solutionRevealed: false,
  hintsRevealed: 0,
});

function quizCacheKey(exerciseId: string, direction: QuizDirection): string {
  return `${exerciseId}:${direction}`;
}

function createBackend(): Backend {
  if (typeof indexedDB !== 'undefined') {
    return new IndexedDbPersistenceBackend();
  }
  return new MemoryPersistenceBackend();
}

export function getLastStorageNotice(): StorageError | null {
  return lastStorageNotice;
}

export function clearLastStorageNotice(): void {
  lastStorageNotice = null;
}

export function getRemoteWorkspaceNotice(): RemoteWorkspaceNotice | null {
  return remoteNotice;
}

export function clearRemoteWorkspaceNotice(): void {
  remoteNotice = null;
}

export function isWorkspaceDirty(localRevision: number): boolean {
  return localRevision > persistedRevision;
}

export async function initPersistence(forceMemory = false): Promise<StorageHealth> {
  if (initPromise && !forceMemory) return initPromise;
  initPromise = (async () => {
    backend = forceMemory ? new MemoryPersistenceBackend() : createBackend();
    const health = await backend.init();
    if (health.writable) {
      await migrateLegacyBrowserStores(backend);
      await hydrateLearningCaches();
    }
    broadcast = createWorkspaceBroadcastChannel();
    broadcast?.addEventListener('message', (event: MessageEvent<WorkspaceBroadcastMessage>) => {
      const msg = event.data;
      if (msg.type === 'workspace_saved' || msg.type === 'import_completed') {
        remoteNotice = msg.notice;
      }
      if (msg.type === 'cleared') {
        remoteNotice = { revision: 0, updatedAt: 0 };
      }
    });
    return health;
  })();
  return initPromise;
}

export function usePersistenceBackendForTests(memory: MemoryPersistenceBackend): void {
  backend = memory;
  initPromise = Promise.resolve({ backend: 'memory', readable: true, writable: true });
}

async function requireBackend(): Promise<Backend> {
  if (!backend) {
    await initPersistence();
  }
  if (!backend) {
    throw new StorageError('unavailable', 'Persistence is not available.', false);
  }
  return backend;
}

async function hydrateLearningCaches(): Promise<void> {
  const store = await requireBackend();
  if (store instanceof MemoryPersistenceBackend) {
    return;
  }
  // Warm caches lazily on read; legacy migration already wrote to IDB.
}

export function createDefaultWorkspaceDocument(): WorkspaceDocument {
  return {
    version: WORKSPACE_DOCUMENT_VERSION,
    sandbox: createInitialSandboxState(),
    expression: 'π name, dept_name ( Employees ⋈ Departments )',
    updatedAt: Date.now(),
  };
}

export async function loadWorkspaceDocument(): Promise<{
  document: WorkspaceDocument;
  meta: WorkspaceMeta;
  fromStorage: boolean;
}> {
  const store = await requireBackend();
  try {
    const existing = await store.getWorkspace();
    const meta = await store.getWorkspaceMeta();
    persistedRevision = meta.revision;
    workspaceRevision = meta.revision;
    if (existing && validateWorkspaceDocument(existing)) {
      return { document: existing, meta, fromStorage: true };
    }
  } catch (err) {
    lastStorageNotice = mapDomException(err);
  }
  const document = createDefaultWorkspaceDocument();
  return { document, meta: { revision: 0, updatedAt: 0 }, fromStorage: false };
}

export async function saveWorkspaceDocument(
  document: WorkspaceDocument,
  options?: { localRevision?: number; lastRoute?: string }
): Promise<StorageResult<WorkspaceMeta>> {
  const store = await requireBackend();
  const localRevision =
    options?.localRevision ?? Math.max(workspaceRevision, persistedRevision) + 1;
  if (options?.localRevision !== undefined && localRevision <= persistedRevision) {
    return storageFail(
      new StorageError(
        'conflict',
        'Skipped save because a newer workspace revision is already stored.'
      )
    );
  }
  const payload: WorkspaceDocument = {
    ...document,
    version: WORKSPACE_DOCUMENT_VERSION,
    lastRoute: options?.lastRoute ?? document.lastRoute,
    updatedAt: Date.now(),
  };
  try {
    const result = await store.putWorkspace(payload, localRevision);
    if (!result.ok || !result.value) {
      if (result.error) lastStorageNotice = result.error;
      return result;
    }
    workspaceRevision = localRevision;
    persistedRevision = localRevision;
    postWorkspaceSaved(broadcast, result.value);
    lastStorageNotice = null;
    return result;
  } catch (err) {
    const mapped = mapDomException(err);
    lastStorageNotice = mapped;
    return storageFail(mapped);
  }
}

export async function reloadWorkspaceFromStorage(): Promise<WorkspaceDocument | null> {
  const store = await requireBackend();
  try {
    const doc = await store.getWorkspace();
    const meta = await store.getWorkspaceMeta();
    persistedRevision = meta.revision;
    workspaceRevision = meta.revision;
    remoteNotice = null;
    return doc;
  } catch (err) {
    lastStorageNotice = mapDomException(err);
    return null;
  }
}

export function createHistoryId(): string {
  return createId();
}

export async function appendQueryHistory(entry: QueryHistoryEntry): Promise<StorageResult<void>> {
  const store = await requireBackend();
  const result = await store.appendHistory(entry);
  if (!result.ok && result.error) lastStorageNotice = result.error;
  const all = await store.listHistory();
  if (all.length > MAX_HISTORY_ENTRIES) {
    const trimmed = all
      .sort((a, b) => b.executedAt - a.executedAt)
      .slice(0, MAX_HISTORY_ENTRIES);
    await store.replaceHistory(trimmed);
  }
  return result;
}

export function buildHistoryEntry(params: {
  expression: string;
  schemaSet: SandboxSchemaSet;
  dataVersion: number;
  status: QueryRunStatus;
  rowCount?: number;
  executionTimeMs?: number;
  message?: string;
}): QueryHistoryEntry {
  return {
    id: createHistoryId(),
    executedAt: Date.now(),
    expression: params.expression,
    schemaSetId: params.schemaSet.id,
    schemaSetName: params.schemaSet.name,
    dataVersion: params.dataVersion,
    schemaSetSnapshot: structuredClone(params.schemaSet),
    status: params.status,
    rowCount: params.rowCount,
    executionTimeMs: params.executionTimeMs,
    message: params.message,
  };
}

export async function listQueryHistory(limit?: number): Promise<QueryHistoryEntry[]> {
  const store = await requireBackend();
  try {
    return await store.listHistory(limit);
  } catch (err) {
    lastStorageNotice = mapDomException(err);
    return [];
  }
}

export async function clearQueryHistory(): Promise<StorageResult<void>> {
  const store = await requireBackend();
  const result = await store.clearHistory();
  if (!result.ok && result.error) lastStorageNotice = result.error;
  return result;
}

export async function listSavedItems(): Promise<SavedItem[]> {
  const store = await requireBackend();
  try {
    return await store.listSaves();
  } catch (err) {
    lastStorageNotice = mapDomException(err);
    return [];
  }
}

export async function upsertSavedItem(item: SavedItem): Promise<StorageResult<void>> {
  const store = await requireBackend();
  const result = await store.putSave(item);
  if (!result.ok && result.error) lastStorageNotice = result.error;
  return result;
}

export async function deleteSavedItem(id: string): Promise<StorageResult<void>> {
  const store = await requireBackend();
  const result = await store.deleteSave(id);
  if (!result.ok && result.error) lastStorageNotice = result.error;
  return result;
}

export function buildExpressionSave(params: {
  name: string;
  expression: string;
  schemaSet: SandboxSchemaSet;
}): SavedItem {
  const now = Date.now();
  return {
    id: createId(),
    name: params.name.trim(),
    kind: 'expression',
    expression: params.expression,
    createdAt: now,
    updatedAt: now,
    schemaFingerprint: schemaSetFingerprint(params.schemaSet),
    schemaSetName: params.schemaSet.name,
    relationNames: params.schemaSet.relations.map((r) => r.name),
  };
}

export function buildSnapshotSave(params: {
  name: string;
  expression: string;
  sandbox: SandboxState;
}): SavedItem {
  const now = Date.now();
  const active = params.sandbox.schemaSets.find((s) => s.id === params.sandbox.activeSchemaSetId);
  return {
    id: createId(),
    name: params.name.trim(),
    kind: 'snapshot',
    expression: params.expression,
    createdAt: now,
    updatedAt: now,
    sandbox: structuredClone(params.sandbox),
    schemaSetName: active?.name,
    relationNames: active?.relations.map((r) => r.name),
  };
}

export function expressionSaveCompatible(
  item: SavedItem,
  schemaSet: SandboxSchemaSet
): boolean {
  if (item.kind !== 'expression' || !item.schemaFingerprint) return true;
  return item.schemaFingerprint === schemaSetFingerprint(schemaSet);
}

// --- Learning progress (sync reads from cache, async writes) ---

export function readCachedExerciseSession(exerciseId: string): ExerciseSessionState {
  return exerciseCache.get(exerciseId) ?? defaultExerciseSession();
}

export async function hydrateExerciseSession(exerciseId: string): Promise<ExerciseSessionState> {
  const cached = exerciseCache.get(exerciseId);
  if (cached) return cached;
  const store = await requireBackend();
  try {
    const stored = await store.getExerciseProgress(exerciseId);
    const state = stored ?? defaultExerciseSession();
    exerciseCache.set(exerciseId, state);
    return state;
  } catch {
    return defaultExerciseSession();
  }
}

export async function persistExerciseSession(
  exerciseId: string,
  state: ExerciseSessionState
): Promise<void> {
  exerciseCache.set(exerciseId, state);
  const store = await requireBackend();
  const result = await store.putExerciseProgress(exerciseId, state);
  if (!result.ok && result.error) lastStorageNotice = result.error;
}

export function readCachedQuizProgress(
  exerciseId: string,
  direction: QuizDirection
): QuizProgressRecord {
  const key = quizCacheKey(exerciseId, direction);
  return quizCache.get(key) ?? defaultQuizProgress(exerciseId, direction);
}

export async function hydrateQuizProgress(
  exerciseId: string,
  direction: QuizDirection
): Promise<QuizProgressRecord> {
  const key = quizCacheKey(exerciseId, direction);
  const cached = quizCache.get(key);
  if (cached) return cached;
  const store = await requireBackend();
  try {
    const stored = await store.getQuizProgress(exerciseId, direction);
    const record = stored ?? defaultQuizProgress(exerciseId, direction);
    quizCache.set(key, record);
    return record;
  } catch {
    return defaultQuizProgress(exerciseId, direction);
  }
}

export async function persistQuizProgressRecord(record: QuizProgressRecord): Promise<void> {
  const key = quizCacheKey(record.exerciseId, record.direction);
  quizCache.set(key, record);
  const store = await requireBackend();
  const result = await store.putQuizProgress(record);
  if (!result.ok && result.error) lastStorageNotice = result.error;
}

export async function buildWorkspaceExport(): Promise<WorkspaceExportBundle> {
  const store = await requireBackend();
  const workspace =
    (await store.getWorkspace()) ??
    createDefaultWorkspaceDocument();
  const history = await store.listHistory();
  const saves = await store.listSaves();
  const exerciseProgress: Record<string, ExerciseSessionState> = {};
  if (store instanceof MemoryPersistenceBackend) {
    for (const [id, state] of exerciseCache) {
      exerciseProgress[id] = state;
    }
  }
  const quizProgress: QuizProgressRecord[] = [];
  for (const record of quizCache.values()) {
    quizProgress.push(record);
  }
  return {
    exportVersion: WORKSPACE_EXPORT_VERSION,
    exportedAt: Date.now(),
    workspace,
    history,
    saves,
    exerciseProgress,
    quizProgress,
  };
}

export async function importWorkspaceBundle(text: string): Promise<StorageResult<WorkspaceDocument>> {
  const store = await requireBackend();
  try {
    const bundle = parseImportJson(text);
    const nextRevision = Math.max(persistedRevision, workspaceRevision) + 1;
    const workspacePayload: WorkspaceDocument = {
      ...bundle.workspace,
      updatedAt: Date.now(),
    };
    const putResult = await store.putWorkspace(workspacePayload, nextRevision);
    if (!putResult.ok) {
      if (putResult.error) lastStorageNotice = putResult.error;
      return storageFail(putResult.error ?? new StorageError('unknown', 'Import failed.'));
    }
    await store.replaceHistory(bundle.history);
    await store.replaceSaves(bundle.saves);
    await store.replaceExerciseProgress(bundle.exerciseProgress);
    await store.replaceQuizProgress(bundle.quizProgress);
    exerciseCache.clear();
    quizCache.clear();
    for (const [exerciseId, state] of Object.entries(bundle.exerciseProgress)) {
      exerciseCache.set(exerciseId, state);
    }
    for (const record of bundle.quizProgress) {
      quizCache.set(quizCacheKey(record.exerciseId, record.direction), record);
    }
    workspaceRevision = nextRevision;
    persistedRevision = nextRevision;
    postImportCompleted(broadcast, { revision: nextRevision, updatedAt: workspacePayload.updatedAt });
    lastStorageNotice = null;
    return storageOk(bundle.workspace);
  } catch (err) {
    const mapped = mapDomException(err);
    lastStorageNotice = mapped;
    return storageFail(mapped);
  }
}

export async function clearAllPersistedData(): Promise<StorageResult<void>> {
  const store = await requireBackend();
  const result = await store.clearAll();
  exerciseCache.clear();
  quizCache.clear();
  workspaceRevision = 0;
  persistedRevision = 0;
  postStorageCleared(broadcast);
  if (!result.ok && result.error) lastStorageNotice = result.error;
  return result;
}

export function bumpLocalWorkspaceRevision(): number {
  workspaceRevision += 1;
  return workspaceRevision;
}

export function getPersistedRevision(): number {
  return persistedRevision;
}
