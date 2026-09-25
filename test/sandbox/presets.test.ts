import { describe, expect, it } from 'vitest';
import {
  createSchemaSetFromPreset,
  getBundledPreset,
  isSchemaSetDirty,
  restorePresetRelations,
} from '@/lib/sandbox/presets';
import { sandboxReducer } from '@/lib/sandbox/reducer';
import { createInitialSandboxState } from '@/lib/sandbox/defaults';

describe('bundled presets', () => {
  it('loads university and store with relations', () => {
    const uni = createSchemaSetFromPreset('university');
    const store = createSchemaSetFromPreset('store');
    expect(uni.relations.length).toBeGreaterThanOrEqual(4);
    expect(store.relations.length).toBeGreaterThanOrEqual(4);
    expect(uni.presetId).toBe('university');
  });

  it('does not mutate bundled templates when editing copies', () => {
    const before = getBundledPreset('university').buildSchemaSet();
    const copy = createSchemaSetFromPreset('university');
    copy.relations[0].rows.push({ student_id: 99, name: 'Test', major_id: 10, gpa: 3.0 });
    const after = getBundledPreset('university').buildSchemaSet();
    expect(after.relations[0].rows.length).toBe(before.relations[0].rows.length);
  });

  it('reset restores preset data in reducer', () => {
    let state = createInitialSandboxState();
    state = sandboxReducer(state, { type: 'LOAD_PRESET', presetId: 'store' });
    const active = state.schemaSets.find((s) => s.id === state.activeSchemaSetId);
    expect(active?.presetId).toBe('store');
    const relId = active!.relations[0].id;
    state = sandboxReducer(state, { type: 'DELETE_ROW', relationId: relId, rowIndex: 0 });
    expect(
      state.schemaSets.find((s) => s.id === active!.id)!.relations[0].rows.length
    ).toBeLessThan(active!.relations[0].rows.length);
    state = sandboxReducer(state, { type: 'RESET_PRESET', schemaSetId: active!.id });
    const restored = restorePresetRelations('store');
    expect(
      state.schemaSets.find((s) => s.id === active!.id)!.relations[0].rows.length
    ).toBe(restored[0].rows.length);
  });

  it('detects dirty preset copies', () => {
    const copy = createSchemaSetFromPreset('university');
    expect(isSchemaSetDirty(copy, 'university')).toBe(false);
    copy.relations[0].rows = [];
    expect(isSchemaSetDirty(copy, 'university')).toBe(true);
  });
});
