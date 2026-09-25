import { describe, expect, it } from 'vitest';
import { cancelActiveEvaluation, createEvaluationContext, markCancelled } from '@/lib/evaluator/evaluate';
import { checkAbort } from '@/lib/evaluator/context';
import { EvaluationAbortedError } from '@/lib/evaluator/runtimeError';

describe('evaluation cancellation', () => {
  it('cancelActiveEvaluation is safe when no evaluation is running', () => {
    expect(() => cancelActiveEvaluation()).not.toThrow();
  });

  it('checkAbort throws when context is marked cancelled', () => {
    const ctx = createEvaluationContext();
    markCancelled(ctx);
    const range = {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 },
    };
    expect(() => checkAbort(ctx, 'node-1', range)).toThrow(EvaluationAbortedError);
  });
});
