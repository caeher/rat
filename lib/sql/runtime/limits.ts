/**
 * Browser SQLite verification limits (aligned with docs/EVALUATION_LIMITS.md).
 */
export const SQL_RUNTIME_LIMITS = {
  maxOutputRows: 10_000,
  maxExecutionMs: 15_000,
} as const;

export type SqlRuntimeLimits = typeof SQL_RUNTIME_LIMITS;
