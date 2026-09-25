/**
 * Browser RA evaluator resource limits (see docs/EVALUATION_LIMITS.md).
 */
export const EVALUATION_LIMITS = {
  /** Maximum tuples in the final query result. */
  maxOutputRows: 10_000,
  /** Maximum tuples produced by any single operator step. */
  maxIntermediateRows: 25_000,
  /** Nested-loop pairings / row comparisons budget per evaluation. */
  maxRowOperations: 2_000_000,
  /** Wall-clock budget inside the worker (ms). */
  maxExecutionMs: 15_000,
} as const;

export type EvaluationLimitKey = keyof typeof EVALUATION_LIMITS;
