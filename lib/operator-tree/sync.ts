import type { EvaluationStep } from '@/lib/engine/types';

export function buildStepIndexByNodeId(steps: EvaluationStep[] | undefined): Map<string, number> {
  const map = new Map<string, number>();
  if (!steps) return map;
  for (const step of steps) {
    map.set(step.nodeId, step.stepIndex);
  }
  return map;
}

export function stepIndexForNodeId(
  nodeId: string,
  stepByNodeId: Map<string, number>
): number | undefined {
  const index = stepByNodeId.get(nodeId);
  return index === undefined ? undefined : index;
}

export function nodeIdForStepIndex(
  steps: EvaluationStep[] | undefined,
  stepIndex: number
): string | undefined {
  if (!steps?.length) return undefined;
  const clamped = Math.min(Math.max(0, stepIndex), steps.length - 1);
  return steps[clamped]?.nodeId;
}
