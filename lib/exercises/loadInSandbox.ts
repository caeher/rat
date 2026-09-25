import type { SandboxAction } from '@/lib/sandbox/reducer';
import type { Exercise } from './types';
import { buildSchemaSetFromDataset } from './snapshot';
import { withBasePath } from '@/lib/paths';

export function applyExerciseToSandbox(
  dispatch: (action: SandboxAction) => void,
  exercise: Exercise
): void {
  const schemaSet = buildSchemaSetFromDataset(exercise.dataset, exercise.id);
  dispatch({ type: 'LOAD_EXERCISE_DATASET', schemaSet });
}

export function sandboxExerciseQuery(exerciseId: string): string {
  return withBasePath(`/sandbox?exercise=${encodeURIComponent(exerciseId)}`);
}
