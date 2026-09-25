import { describe, expect, it } from 'vitest';
import { createInitialSandboxState } from '@/lib/sandbox/defaults';
import { sandboxReducer } from '@/lib/sandbox/reducer';

describe('sandbox reducer', () => {
  it('creates schema sets and bumps data version', () => {
    const state = createInitialSandboxState();
    const next = sandboxReducer(state, { type: 'CREATE_SCHEMA_SET', name: 'Lab2' });
    expect(next.schemaSets.length).toBe(2);
    expect(next.dataVersion).toBe(state.dataVersion + 1);
  });

  it('adds rows up to limit enforcement', () => {
    const state = createInitialSandboxState();
    const relId = state.schemaSets[0].relations[0].id;
    const next = sandboxReducer(state, { type: 'ADD_ROW', relationId: relId });
    const rel = next.schemaSets[0].relations.find((r) => r.id === relId);
    expect(rel?.rows.length).toBeGreaterThan(state.schemaSets[0].relations[0].rows.length);
  });
});
