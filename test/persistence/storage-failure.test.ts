import { describe, expect, it } from 'vitest';
import { mapDomException, StorageError } from '@/lib/persistence/errors';
import { MemoryPersistenceBackend } from '@/lib/persistence/memory-backend';
import {
  loadWorkspaceDocument,
  saveWorkspaceDocument,
  usePersistenceBackendForTests,
} from '@/lib/persistence/client';
import { createDefaultWorkspaceDocument } from '@/lib/persistence/client';

describe('storage failure handling', () => {
  it('maps QuotaExceededError to recoverable storage error', () => {
    const err = new DOMException('quota', 'QuotaExceededError');
    const mapped = mapDomException(err);
    expect(mapped.code).toBe('quota_exceeded');
    expect(mapped.recoverable).toBe(true);
  });

  it('surfaces write failures from backend', async () => {
    const backend = new MemoryPersistenceBackend();
    backend.putWorkspace = async () => ({
      ok: false,
      error: new StorageError('unavailable', 'Simulated failure'),
    });
    usePersistenceBackendForTests(backend);
    const doc = createDefaultWorkspaceDocument();
    const saved = await saveWorkspaceDocument(doc);
    expect(saved.ok).toBe(false);
    expect(saved.error?.code).toBe('unavailable');
  });

  it('loads defaults when storage is empty', async () => {
    usePersistenceBackendForTests(new MemoryPersistenceBackend());
    const loaded = await loadWorkspaceDocument();
    expect(loaded.fromStorage).toBe(false);
    expect(loaded.document.sandbox.schemaSets.length).toBeGreaterThan(0);
  });
});
