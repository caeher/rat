import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryPersistenceBackend } from '@/lib/persistence/memory-backend';
import {
  appendQueryHistory,
  buildHistoryEntry,
  buildExpressionSave,
  createDefaultWorkspaceDocument,
  importWorkspaceBundle,
  loadWorkspaceDocument,
  saveWorkspaceDocument,
  usePersistenceBackendForTests,
} from '@/lib/persistence/client';
import { createInitialSandboxState } from '@/lib/sandbox/defaults';

describe('persistence client', () => {
  beforeEach(() => {
    usePersistenceBackendForTests(new MemoryPersistenceBackend());
  });

  it('round-trips workspace document', async () => {
    const doc = createDefaultWorkspaceDocument();
    doc.expression = 'σ true ( Employees )';
    const saved = await saveWorkspaceDocument(doc);
    expect(saved.ok).toBe(true);
    const loaded = await loadWorkspaceDocument();
    expect(loaded.fromStorage).toBe(true);
    expect(loaded.document.expression).toBe(doc.expression);
  });

  it('imports valid bundle atomically', async () => {
    const workspace = createDefaultWorkspaceDocument();
    workspace.sandbox = createInitialSandboxState();
    const bundle = {
      exportVersion: 1 as const,
      exportedAt: Date.now(),
      workspace,
      history: [],
      saves: [],
      exerciseProgress: {},
      quizProgress: [],
    };
    const result = await importWorkspaceBundle(JSON.stringify(bundle));
    expect(result.ok).toBe(true);
    const loaded = await loadWorkspaceDocument();
    expect(loaded.document.sandbox.schemaSets.length).toBe(1);
  });

  it('stores history with schema snapshot', async () => {
    const memory = new MemoryPersistenceBackend();
    usePersistenceBackendForTests(memory);
    const doc = createDefaultWorkspaceDocument();
    await saveWorkspaceDocument(doc);
    const schemaSet = doc.sandbox.schemaSets[0];
    const entry = buildHistoryEntry({
      expression: 'π name ( Employees )',
      schemaSet,
      dataVersion: 1,
      status: 'success',
    });
    await appendQueryHistory(entry);
    const history = await memory.listHistory();
    expect(history[0]?.schemaSetSnapshot.relations.length).toBeGreaterThan(0);
  });

  it('records schema fingerprint on expression-only saves', () => {
    const doc = createDefaultWorkspaceDocument();
    const item = buildExpressionSave({
      name: 'Test',
      expression: 'π name ( Employees )',
      schemaSet: doc.sandbox.schemaSets[0],
    });
    expect(item.kind).toBe('expression');
    expect(item.schemaFingerprint).toBeTruthy();
  });
});
