import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedValidation } from '@/lib/editor/useDebouncedValidation';
import type { RelationSchema } from '@/lib/engine/types';

const schemas: Record<string, RelationSchema> = {
  Employees: {
    name: 'Employees',
    attributes: [{ name: 'name', type: 'string' }],
  },
};

describe('useDebouncedValidation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces expression updates', () => {
    const { result, rerender } = renderHook(
      ({ expr, version }) => useDebouncedValidation(expr, schemas, version),
      { initialProps: { expr: 'Employees', version: 1 } }
    );

    act(() => {
      vi.runAllTimers();
    });
    expect(result.current.isValidating).toBe(false);
    expect(result.current.valid).toBe(true);

    rerender({ expr: 'π name ( Employees )', version: 1 });
    expect(result.current.isValidating).toBe(true);

    act(() => {
      vi.advanceTimersByTime(280);
    });
    expect(result.current.isValidating).toBe(false);
    expect(result.current.valid).toBe(true);
  });

  it('validates immediately when schema version changes', () => {
    const { result, rerender } = renderHook(
      ({ expr, version }) => useDebouncedValidation(expr, schemas, version),
      { initialProps: { expr: 'π unknown ( Employees )', version: 1 } }
    );

    act(() => {
      vi.runAllTimers();
    });

    rerender({ expr: 'π unknown ( Employees )', version: 2 });
    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.isValidating).toBe(false);
    expect(
      result.current.diagnostics.some((d) => d.code === 'E_UNRESOLVED_ATTRIBUTE')
    ).toBe(true);
  });
});
