/** Exercise progress persisted in the browser (IndexedDB via lib/persistence). */

import {
  hydrateExerciseSession,
  persistExerciseSession,
  readCachedExerciseSession,
} from '@/lib/persistence/client';

export interface ExerciseSessionState {
  completedIndependently: boolean;
  solutionRevealed: boolean;
  hintsRevealed: number;
}

export function readExerciseSession(exerciseId: string): ExerciseSessionState {
  return readCachedExerciseSession(exerciseId);
}

export async function ensureExerciseSessionHydrated(
  exerciseId: string
): Promise<ExerciseSessionState> {
  return hydrateExerciseSession(exerciseId);
}

export function saveExerciseSession(exerciseId: string, state: ExerciseSessionState): void {
  void persistExerciseSession(exerciseId, state);
}

export function markSolutionRevealed(exerciseId: string): ExerciseSessionState {
  const prev = readExerciseSession(exerciseId);
  const next = { ...prev, solutionRevealed: true };
  saveExerciseSession(exerciseId, next);
  return next;
}

export function markCompletedIndependently(exerciseId: string): ExerciseSessionState {
  const prev = readExerciseSession(exerciseId);
  const next = { ...prev, completedIndependently: true };
  saveExerciseSession(exerciseId, next);
  return next;
}

export function revealNextHint(exerciseId: string, maxHints: number): ExerciseSessionState {
  const prev = readExerciseSession(exerciseId);
  const next = {
    ...prev,
    hintsRevealed: Math.min(maxHints, prev.hintsRevealed + 1),
  };
  saveExerciseSession(exerciseId, next);
  return next;
}
