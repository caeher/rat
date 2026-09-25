import { useEffect, useRef, useState } from 'react';
import { validateExpression } from '@/lib/engine/validator';
import type { RelationSchema, ValidationResult } from '@/lib/engine/types';

const DEFAULT_DEBOUNCE_MS = 280;

export interface DebouncedValidationState extends ValidationResult {
  /** True while waiting for debounced validation after typing. */
  isValidating: boolean;
}

/**
 * Debounces expression validation while re-running immediately when the schema snapshot changes.
 * Drops stale async results so rapid edits never show outdated diagnostics.
 */
export function useDebouncedValidation(
  expression: string,
  schemas: Record<string, RelationSchema>,
  schemaVersion: number,
  debounceMs: number = DEFAULT_DEBOUNCE_MS
): DebouncedValidationState {
  const [state, setState] = useState<DebouncedValidationState>(() => ({
    ...validateExpression(expression, schemas),
    isValidating: false,
  }));

  const generationRef = useRef(0);
  const prevSchemaVersionRef = useRef(schemaVersion);

  useEffect(() => {
    const generation = ++generationRef.current;
    const schemaJustChanged = prevSchemaVersionRef.current !== schemaVersion;
    prevSchemaVersionRef.current = schemaVersion;

    setState((prev) => ({ ...prev, isValidating: true }));

    const delay = schemaJustChanged ? 0 : debounceMs;
    const timer = window.setTimeout(() => {
      if (generation !== generationRef.current) return;
      const result = validateExpression(expression, schemas);
      if (generation !== generationRef.current) return;
      setState({ ...result, isValidating: false });
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [expression, schemas, schemaVersion, debounceMs]);

  return state;
}
