import type { ExerciseSessionState } from '@/lib/exercises/session';
import type { QuizDirection, QuizProgressRecord } from '@/lib/quiz/types';
import { PERSISTENCE_DB_NAME, PERSISTENCE_SCHEMA_VERSION } from './constants';
import { mapDomException, storageFail, storageOk, StorageError, type StorageResult } from './errors';
import type {
  QueryHistoryEntry,
  SavedItem,
  StorageHealth,
  WorkspaceDocument,
  WorkspaceMeta,
} from './types';

type StoreName =
  | 'meta'
  | 'workspace'
  | 'history'
  | 'saves'
  | 'exerciseProgress'
  | 'quizProgress';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new StorageError('unavailable', 'IndexedDB is not available.', false));
      return;
    }
    const request = indexedDB.open(PERSISTENCE_DB_NAME, PERSISTENCE_SCHEMA_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('workspace')) {
        db.createObjectStore('workspace', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('history')) {
        const store = db.createObjectStore('history', { keyPath: 'id' });
        store.createIndex('executedAt', 'executedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('saves')) {
        const store = db.createObjectStore('saves', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('exerciseProgress')) {
        db.createObjectStore('exerciseProgress', { keyPath: 'exerciseId' });
      }
      if (!db.objectStoreNames.contains('quizProgress')) {
        db.createObjectStore('quizProgress', { keyPath: 'id' });
      }
      const tx = request.transaction;
      if (tx) {
        const meta = tx.objectStore('meta');
        meta.put({
          key: 'schema',
          schemaVersion: PERSISTENCE_SCHEMA_VERSION,
          migratedAt: Date.now(),
        });
      }
    };
  });
}

function runTransaction<T>(
  db: IDBDatabase,
  storeNames: StoreName | StoreName[],
  mode: IDBTransactionMode,
  fn: (stores: Record<StoreName, IDBObjectStore>) => T
): Promise<T> {
  return new Promise((resolve, reject) => {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const tx = db.transaction(names, mode);
    const stores = {} as Record<StoreName, IDBObjectStore>;
    for (const name of names) {
      stores[name] = tx.objectStore(name);
    }
    let result: T;
    try {
      result = fn(stores);
    } catch (err) {
      try {
        tx.abort();
      } catch {
        // ignore
      }
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export class IndexedDbPersistenceBackend {
  readonly kind = 'indexeddb' as const;
  private db: IDBDatabase | null = null;

  async init(): Promise<StorageHealth> {
    try {
      this.db = await openDatabase();
      return { backend: 'indexeddb', readable: true, writable: true };
    } catch (err) {
      const mapped = mapDomException(err);
      return {
        backend: 'unavailable',
        readable: false,
        writable: false,
        message: mapped.message,
      };
    }
  }

  private requireDb(): IDBDatabase {
    if (!this.db) {
      throw new StorageError('unavailable', 'Storage has not been initialized.');
    }
    return this.db;
  }

  async getWorkspaceMeta(): Promise<WorkspaceMeta> {
    const db = this.requireDb();
    return await new Promise<WorkspaceMeta>((resolve, reject) => {
      const tx = db.transaction('workspace', 'readonly');
      const request = tx.objectStore('workspace').get('current');
      request.onsuccess = () => {
        const row = request.result as { revision: number; updatedAt: number } | undefined;
        resolve(row ? { revision: row.revision, updatedAt: row.updatedAt } : { revision: 0, updatedAt: 0 });
      };
      request.onerror = () => reject(request.error ?? new Error('Failed to read workspace meta'));
      tx.onerror = () => reject(tx.error ?? new Error('Failed to read workspace meta'));
    });
  }

  async getWorkspace(): Promise<WorkspaceDocument | null> {
    const db = this.requireDb();
    return await new Promise<WorkspaceDocument | null>((resolve, reject) => {
      const tx = db.transaction('workspace', 'readonly');
      const request = tx.objectStore('workspace').get('current');
      request.onsuccess = () => {
        const row = request.result as { document?: WorkspaceDocument } | undefined;
        resolve(row?.document ?? null);
      };
      request.onerror = () => reject(request.error ?? new Error('Failed to read workspace'));
      tx.onerror = () => reject(tx.error ?? new Error('Failed to read workspace'));
    });
  }

  async putWorkspace(doc: WorkspaceDocument, revision: number): Promise<StorageResult<WorkspaceMeta>> {
    try {
      const db = this.requireDb();
      const meta: WorkspaceMeta = { revision, updatedAt: doc.updatedAt };
      await runTransaction(db, 'workspace', 'readwrite', (stores) => {
        stores.workspace.put({ key: 'current', document: doc, ...meta });
      });
      return storageOk(meta);
    } catch (err) {
      return storageFail(mapDomException(err));
    }
  }

  async listHistory(limit?: number): Promise<QueryHistoryEntry[]> {
    const db = this.requireDb();
    return await new Promise<QueryHistoryEntry[]>((resolve, reject) => {
      const tx = db.transaction('history', 'readonly');
      const index = tx.objectStore('history').index('executedAt');
      const request = index.openCursor(null, 'prev');
      const results: QueryHistoryEntry[] = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        results.push(cursor.value as QueryHistoryEntry);
        if (limit && results.length >= limit) return;
        cursor.continue();
      };
      tx.oncomplete = () => resolve(results);
      tx.onerror = () => reject(tx.error ?? new Error('Failed to read history'));
      request.onerror = () => reject(request.error ?? new Error('Failed to read history'));
    });
  }

  async appendHistory(entry: QueryHistoryEntry): Promise<StorageResult<void>> {
    try {
      const db = this.requireDb();
      await runTransaction(db, 'history', 'readwrite', (stores) => {
        stores.history.put(entry);
      });
      return storageOk(undefined);
    } catch (err) {
      return storageFail(mapDomException(err));
    }
  }

  async replaceHistory(entries: QueryHistoryEntry[]): Promise<StorageResult<void>> {
    try {
      const db = this.requireDb();
      await runTransaction(db, 'history', 'readwrite', (stores) => {
        stores.history.clear();
        for (const entry of entries) {
          stores.history.put(entry);
        }
      });
      return storageOk(undefined);
    } catch (err) {
      return storageFail(mapDomException(err));
    }
  }

  async clearHistory(): Promise<StorageResult<void>> {
    try {
      const db = this.requireDb();
      await runTransaction(db, 'history', 'readwrite', (stores) => {
        stores.history.clear();
      });
      return storageOk(undefined);
    } catch (err) {
      return storageFail(mapDomException(err));
    }
  }

  async listSaves(): Promise<SavedItem[]> {
    const db = this.requireDb();
    return await new Promise<SavedItem[]>((resolve, reject) => {
      const tx = db.transaction('saves', 'readonly');
      const index = tx.objectStore('saves').index('updatedAt');
      const request = index.openCursor(null, 'prev');
      const results: SavedItem[] = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        results.push(cursor.value as SavedItem);
        cursor.continue();
      };
      tx.oncomplete = () => resolve(results);
      tx.onerror = () => reject(tx.error ?? new Error('Failed to read saves'));
      request.onerror = () => reject(request.error ?? new Error('Failed to read saves'));
    });
  }

  async putSave(item: SavedItem): Promise<StorageResult<void>> {
    try {
      const db = this.requireDb();
      await runTransaction(db, 'saves', 'readwrite', (stores) => {
        stores.saves.put(item);
      });
      return storageOk(undefined);
    } catch (err) {
      return storageFail(mapDomException(err));
    }
  }

  async deleteSave(id: string): Promise<StorageResult<void>> {
    try {
      const db = this.requireDb();
      await runTransaction(db, 'saves', 'readwrite', (stores) => {
        stores.saves.delete(id);
      });
      return storageOk(undefined);
    } catch (err) {
      return storageFail(mapDomException(err));
    }
  }

  async replaceSaves(items: SavedItem[]): Promise<StorageResult<void>> {
    try {
      const db = this.requireDb();
      await runTransaction(db, 'saves', 'readwrite', (stores) => {
        stores.saves.clear();
        for (const item of items) {
          stores.saves.put(item);
        }
      });
      return storageOk(undefined);
    } catch (err) {
      return storageFail(mapDomException(err));
    }
  }

  async getExerciseProgress(exerciseId: string): Promise<ExerciseSessionState | null> {
    const db = this.requireDb();
    return await new Promise<ExerciseSessionState | null>((resolve, reject) => {
      const tx = db.transaction('exerciseProgress', 'readonly');
      const request = tx.objectStore('exerciseProgress').get(exerciseId);
      request.onsuccess = () => {
        const row = request.result as { state: ExerciseSessionState } | undefined;
        resolve(row?.state ?? null);
      };
      request.onerror = () => reject(request.error ?? new Error('Failed to read exercise progress'));
      tx.onerror = () => reject(tx.error ?? new Error('Failed to read exercise progress'));
    });
  }

  async putExerciseProgress(
    exerciseId: string,
    state: ExerciseSessionState
  ): Promise<StorageResult<void>> {
    try {
      const db = this.requireDb();
      await runTransaction(db, 'exerciseProgress', 'readwrite', (stores) => {
        stores.exerciseProgress.put({ exerciseId, state });
      });
      return storageOk(undefined);
    } catch (err) {
      return storageFail(mapDomException(err));
    }
  }

  async replaceExerciseProgress(
    map: Record<string, ExerciseSessionState>
  ): Promise<StorageResult<void>> {
    try {
      const db = this.requireDb();
      await runTransaction(db, 'exerciseProgress', 'readwrite', (stores) => {
        stores.exerciseProgress.clear();
        for (const [exerciseId, state] of Object.entries(map)) {
          stores.exerciseProgress.put({ exerciseId, state });
        }
      });
      return storageOk(undefined);
    } catch (err) {
      return storageFail(mapDomException(err));
    }
  }

  quizRowId(exerciseId: string, direction: QuizDirection): string {
    return `${exerciseId}:${direction}`;
  }

  async getQuizProgress(
    exerciseId: string,
    direction: QuizDirection
  ): Promise<QuizProgressRecord | null> {
    const db = this.requireDb();
    const id = this.quizRowId(exerciseId, direction);
    return await new Promise<QuizProgressRecord | null>((resolve, reject) => {
      const tx = db.transaction('quizProgress', 'readonly');
      const request = tx.objectStore('quizProgress').get(id);
      request.onsuccess = () => {
        const row = request.result as { record: QuizProgressRecord } | undefined;
        resolve(row?.record ?? null);
      };
      request.onerror = () => reject(request.error ?? new Error('Failed to read quiz progress'));
      tx.onerror = () => reject(tx.error ?? new Error('Failed to read quiz progress'));
    });
  }

  async putQuizProgress(record: QuizProgressRecord): Promise<StorageResult<void>> {
    try {
      const db = this.requireDb();
      const id = this.quizRowId(record.exerciseId, record.direction);
      await runTransaction(db, 'quizProgress', 'readwrite', (stores) => {
        stores.quizProgress.put({ id, record });
      });
      return storageOk(undefined);
    } catch (err) {
      return storageFail(mapDomException(err));
    }
  }

  async replaceQuizProgress(records: QuizProgressRecord[]): Promise<StorageResult<void>> {
    try {
      const db = this.requireDb();
      await runTransaction(db, 'quizProgress', 'readwrite', (stores) => {
        stores.quizProgress.clear();
        for (const record of records) {
          stores.quizProgress.put({
            id: this.quizRowId(record.exerciseId, record.direction),
            record,
          });
        }
      });
      return storageOk(undefined);
    } catch (err) {
      return storageFail(mapDomException(err));
    }
  }

  async clearAll(): Promise<StorageResult<void>> {
    try {
      const db = this.requireDb();
      const storeNames: StoreName[] = [
        'workspace',
        'history',
        'saves',
        'exerciseProgress',
        'quizProgress',
      ];
      await runTransaction(db, storeNames, 'readwrite', (s) => {
        for (const name of storeNames) {
          s[name].clear();
        }
      });
      return storageOk(undefined);
    } catch (err) {
      return storageFail(mapDomException(err));
    }
  }
}
