import type { EvaluationStep } from '@/lib/engine/types';

export interface TraceNavigationState {
  stepIndex: number;
  totalSteps: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  atStart: boolean;
  atFinish: boolean;
}

export function createTraceNavigation(
  totalSteps: number,
  initialIndex: number = 0
): TraceNavigationState {
  const stepIndex = clampStepIndex(initialIndex, totalSteps);
  return buildNavigationState(stepIndex, totalSteps);
}

function clampStepIndex(index: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  return Math.min(Math.max(0, index), totalSteps - 1);
}

function buildNavigationState(stepIndex: number, totalSteps: number): TraceNavigationState {
  const lastIndex = Math.max(0, totalSteps - 1);
  return {
    stepIndex,
    totalSteps,
    canGoPrevious: totalSteps > 0 && stepIndex > 0,
    canGoNext: totalSteps > 0 && stepIndex < lastIndex,
    atStart: totalSteps === 0 || stepIndex === 0,
    atFinish: totalSteps === 0 || stepIndex === lastIndex,
  };
}

export function traceGoStart(totalSteps: number): TraceNavigationState {
  return createTraceNavigation(totalSteps, 0);
}

export function traceGoFinish(totalSteps: number): TraceNavigationState {
  return createTraceNavigation(totalSteps, totalSteps > 0 ? totalSteps - 1 : 0);
}

export function traceGoPrevious(state: TraceNavigationState): TraceNavigationState {
  return createTraceNavigation(state.totalSteps, state.stepIndex - 1);
}

export function traceGoNext(state: TraceNavigationState): TraceNavigationState {
  return createTraceNavigation(state.totalSteps, state.stepIndex + 1);
}

export function activeTraceStep(
  steps: EvaluationStep[] | undefined,
  stepIndex: number
): EvaluationStep | undefined {
  if (!steps?.length) return undefined;
  return steps[clampStepIndex(stepIndex, steps.length)];
}
