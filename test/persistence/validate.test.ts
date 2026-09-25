import { describe, expect, it } from 'vitest';
import { WORKSPACE_DOCUMENT_VERSION, WORKSPACE_EXPORT_VERSION } from '@/lib/persistence/constants';
import { createDefaultWorkspaceDocument } from '@/lib/persistence/client';
import { parseImportJson, validateWorkspaceExport } from '@/lib/persistence/validate';
import { StorageError } from '@/lib/persistence/errors';

describe('persistence validate', () => {
  it('accepts a minimal valid export bundle', () => {
    const workspace = createDefaultWorkspaceDocument();
    const bundle = {
      exportVersion: WORKSPACE_EXPORT_VERSION,
      exportedAt: Date.now(),
      workspace,
      history: [],
      saves: [],
      exerciseProgress: {},
      quizProgress: [],
    };
    expect(validateWorkspaceExport(bundle).workspace.version).toBe(WORKSPACE_DOCUMENT_VERSION);
  });

  it('rejects malformed JSON imports', () => {
    expect(() => parseImportJson('{not json')).toThrow(StorageError);
  });

  it('rejects exports with wrong version without mutating storage', () => {
    const workspace = createDefaultWorkspaceDocument();
    expect(() =>
      validateWorkspaceExport({
        exportVersion: 99,
        exportedAt: Date.now(),
        workspace,
        history: [],
        saves: [],
        exerciseProgress: {},
        quizProgress: [],
      })
    ).toThrow(/version/i);
  });
});
