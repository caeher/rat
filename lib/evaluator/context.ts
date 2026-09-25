import type { EvaluationOptions, SourceRange } from '@/lib/engine/types';
import { EVALUATION_LIMITS } from './limits';
import { EvaluationAbortedError, EvaluationRuntimeError } from './runtimeError';
import type { PendingTraceCapture } from './trace';

export interface ResolvedLimits {
  maxOutputRows: number;
  maxIntermediateRows: number;
  maxRowOperations: number;
  maxExecutionMs: number;
}

export interface EvaluationContextState {
  limits: ResolvedLimits;
  rowOperations: number;
  startedAt: number;
  cancelled: boolean;
  nullEqualityInSetOps: boolean;
  captureTrace: boolean;
  tracePreviewRows: number;
  pendingTrace?: PendingTraceCapture;
}

export function createEvaluationContext(
  options?: EvaluationOptions,
  overrides?: Partial<ResolvedLimits>
): EvaluationContextState {
  const maxOutputRows =
    options?.maxOutputRows ?? options?.maxTuples ?? EVALUATION_LIMITS.maxOutputRows;
  return {
    limits: {
      maxOutputRows,
      maxIntermediateRows:
        options?.maxIntermediateRows ?? EVALUATION_LIMITS.maxIntermediateRows,
      maxRowOperations:
        options?.maxRowOperations ?? EVALUATION_LIMITS.maxRowOperations,
      maxExecutionMs: options?.maxExecutionMs ?? EVALUATION_LIMITS.maxExecutionMs,
      ...overrides,
    },
    rowOperations: 0,
    startedAt: Date.now(),
    cancelled: false,
    nullEqualityInSetOps: options?.nullEqualityInSetOps ?? true,
    captureTrace: options?.captureTrace ?? false,
    tracePreviewRows:
      options?.maxTracePreviewRows ?? EVALUATION_LIMITS.maxTracePreviewRows,
  };
}

export function markCancelled(ctx: EvaluationContextState): void {
  ctx.cancelled = true;
}

export function checkAbort(
  ctx: EvaluationContextState,
  nodeId: string,
  range: SourceRange
): void {
  if (ctx.cancelled) {
    throw new EvaluationAbortedError(nodeId, range);
  }
  const elapsed = Date.now() - ctx.startedAt;
  if (elapsed > ctx.limits.maxExecutionMs) {
    throw new EvaluationRuntimeError(
      `Evaluation exceeded the ${ctx.limits.maxExecutionMs} ms time limit. Simplify the expression or reduce relation sizes.`,
      {
        code: 'E_RUNTIME_LIMIT',
        nodeId,
        range,
        limitKey: 'maxExecutionMs',
      }
    );
  }
}

export function recordRowOperations(
  ctx: EvaluationContextState,
  count: number,
  nodeId: string,
  range: SourceRange,
  operatorLabel: string
): void {
  ctx.rowOperations += count;
  checkAbort(ctx, nodeId, range);
  if (ctx.rowOperations > ctx.limits.maxRowOperations) {
    throw new EvaluationRuntimeError(
      `Evaluation exceeded the row-operation budget while computing ${operatorLabel}. Try filtering earlier, avoiding large Cartesian products, or narrowing joins.`,
      {
        code: 'E_RUNTIME_LIMIT',
        nodeId,
        range,
        limitKey: 'maxRowOperations',
      }
    );
  }
}

export function assertIntermediateSize(
  ctx: EvaluationContextState,
  size: number,
  nodeId: string,
  range: SourceRange,
  operatorLabel: string
): void {
  checkAbort(ctx, nodeId, range);
  if (size > ctx.limits.maxIntermediateRows) {
    throw new EvaluationRuntimeError(
      `${operatorLabel} would materialize ${size.toLocaleString()} rows (limit ${ctx.limits.maxIntermediateRows.toLocaleString()}). Add selections, use joins instead of cross products, or reduce data.`,
      {
        code: 'E_RUNTIME_LIMIT',
        nodeId,
        range,
        limitKey: 'maxIntermediateRows',
      }
    );
  }
}

export function assertOutputSize(
  ctx: EvaluationContextState,
  size: number,
  nodeId: string,
  range: SourceRange
): void {
  checkAbort(ctx, nodeId, range);
  if (size > ctx.limits.maxOutputRows) {
    throw new EvaluationRuntimeError(
      `Result would contain ${size.toLocaleString()} tuples (limit ${ctx.limits.maxOutputRows.toLocaleString()}). Narrow the query — truncated results are never shown as complete answers.`,
      {
        code: 'E_RUNTIME_LIMIT',
        nodeId,
        range,
        limitKey: 'maxOutputRows',
      }
    );
  }
}
