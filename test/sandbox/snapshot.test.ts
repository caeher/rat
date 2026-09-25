import { describe, expect, it } from 'vitest';
import { createInitialSandboxState } from '@/lib/sandbox/defaults';
import { createSandboxSnapshot } from '@/lib/sandbox/snapshot';

describe('sandbox snapshot', () => {
  it('produces frozen versioned snapshot for engine', () => {
    const state = createInitialSandboxState();
    const snapshot = createSandboxSnapshot(state);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.version).toBe(state.dataVersion);
    expect(snapshot?.schemas.Employees).toBeDefined();
    expect(snapshot?.relations.Employees.tuples.length).toBeGreaterThan(0);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(snapshot?.schemas.Employees.name).toBe('Employees');
  });
});
