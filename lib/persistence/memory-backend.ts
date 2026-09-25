import type { ExerciseSessionState } from '@/lib/exercises/session';
import type { QuizDirection, QuizProgressRecord } from '@/lib/quiz/types';
import { storageOk, type StorageResult } from './errors';
import type {
  QueryHistoryEntry,
  SavedItem,
  StorageHealth,
  WorkspaceDocument,
  WorkspaceMeta,
} from './types';

export class MemoryPersistenceBackend {
  readonly kind = 'memory' as const;

  private workspace: WorkspaceDocument | null = null;
  private meta: WorkspaceMeta = { revision: 0, updatedAt: 0 };
  private history: QueryHistoryEntry[] = [];
  private saves: SavedItem[] = [];
  private exercises = new Map<string, ExerciseSessionState>();
  private quizzes = new Map<string, QuizProgressRecord>();

  async init(): Promise<StorageHealth> {
    return { backend: 'memory', readable: true, writable: true };
  }

  async getWorkspaceMeta(): Promise<WorkspaceMeta> {
    return { ...this.meta };
  }

  async getWorkspace(): Promise<WorkspaceDocument | null> {
    return this.workspace ? { ...this.workspace, sandbox: structuredClone(this.workspace.sandbox) } : null;
  }

  async putWorkspace(doc: WorkspaceDocument, revision: number): Promise<StorageResult<WorkspaceMeta>> {
    this.workspace = {
      ...doc,
      sandbox: structuredClone(doc.sandbox),
    };
    this.meta = { revision, updatedAt: doc.updatedAt };
    return storageOk(this.meta);
  }

  async listHistory(limit?: number): Promise<QueryHistoryEntry[]> {
    const sorted = [...this.history].sort((a, b) => b.executedAt - a.executedAt);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  async appendHistory(entry: QueryHistoryEntry): Promise<StorageResult<void>> {
    this.history.push(structuredClone(entry));
    return storageOk(undefined);
  }

  async replaceHistory(entries: QueryHistoryEntry[]): Promise<StorageResult<void>> {
    this.history = entries.map((e) => structuredClone(e));
    return storageOk(undefined);
  }

  async clearHistory(): Promise<StorageResult<void>> {
    this.history = [];
    return storageOk(undefined);
  }

  async listSaves(): Promise<SavedItem[]> {
    return [...this.saves].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async putSave(item: SavedItem): Promise<StorageResult<void>> {
    const idx = this.saves.findIndex((s) => s.id === item.id);
    const copy = structuredClone(item);
    if (idx >= 0) this.saves[idx] = copy;
    else this.saves.push(copy);
    return storageOk(undefined);
  }

  async deleteSave(id: string): Promise<StorageResult<void>> {
    this.saves = this.saves.filter((s) => s.id !== id);
    return storageOk(undefined);
  }

  async replaceSaves(items: SavedItem[]): Promise<StorageResult<void>> {
    this.saves = items.map((i) => structuredClone(i));
    return storageOk(undefined);
  }

  async getExerciseProgress(exerciseId: string): Promise<ExerciseSessionState | null> {
    return this.exercises.get(exerciseId) ?? null;
  }

  async putExerciseProgress(
    exerciseId: string,
    state: ExerciseSessionState
  ): Promise<StorageResult<void>> {
    this.exercises.set(exerciseId, { ...state });
    return storageOk(undefined);
  }

  async replaceExerciseProgress(
    map: Record<string, ExerciseSessionState>
  ): Promise<StorageResult<void>> {
    this.exercises.clear();
    for (const [id, state] of Object.entries(map)) {
      this.exercises.set(id, { ...state });
    }
    return storageOk(undefined);
  }

  quizKey(exerciseId: string, direction: QuizDirection): string {
    return `${exerciseId}:${direction}`;
  }

  async getQuizProgress(
    exerciseId: string,
    direction: QuizDirection
  ): Promise<QuizProgressRecord | null> {
    return this.quizzes.get(this.quizKey(exerciseId, direction)) ?? null;
  }

  async putQuizProgress(record: QuizProgressRecord): Promise<StorageResult<void>> {
    this.quizzes.set(this.quizKey(record.exerciseId, record.direction), { ...record });
    return storageOk(undefined);
  }

  async replaceQuizProgress(records: QuizProgressRecord[]): Promise<StorageResult<void>> {
    this.quizzes.clear();
    for (const record of records) {
      this.quizzes.set(this.quizKey(record.exerciseId, record.direction), { ...record });
    }
    return storageOk(undefined);
  }

  async clearAll(): Promise<StorageResult<void>> {
    this.workspace = null;
    this.meta = { revision: 0, updatedAt: 0 };
    this.history = [];
    this.saves = [];
    this.exercises.clear();
    this.quizzes.clear();
    return storageOk(undefined);
  }
}
