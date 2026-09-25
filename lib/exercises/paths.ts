import { OPERATOR_CONTRACTS } from '@/lib/engine/contract';
import type { OperatorType } from '@/lib/engine/types';
import { withBasePath } from '@/lib/paths';

export function exerciseListPath(): string {
  return withBasePath('/exercises');
}

export function exerciseDetailPath(exerciseId: string): string {
  return withBasePath(`/exercises/${encodeURIComponent(exerciseId)}`);
}

export function exerciseSandboxPath(exerciseId: string): string {
  return withBasePath(`/sandbox?exercise=${encodeURIComponent(exerciseId)}`);
}

export function operatorFilterLabel(operator: OperatorType): string {
  return OPERATOR_CONTRACTS[operator].name;
}
