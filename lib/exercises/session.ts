/** Session-only progress (tab lifetime). No cross-device persistence (see issue #19). */

export interface ExerciseSessionState {
  completedIndependently: boolean;
  solutionRevealed: boolean;
  hintsRevealed: number;
}

const STORAGE_PREFIX = 'rat:exercise:';

function key(exerciseId: string): string {
  return `${STORAGE_PREFIX}${exerciseId}`;
}

function readRaw(exerciseId: string): ExerciseSessionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key(exerciseId));
    if (!raw) return null;
    return JSON.parse(raw) as ExerciseSessionState;
  } catch {
    return null;
  }
}

function writeRaw(exerciseId: string, state: ExerciseSessionState): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key(exerciseId), JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

export function readExerciseSession(exerciseId: string): ExerciseSessionState {
  return (
    readRaw(exerciseId) ?? {
      completedIndependently: false,
      solutionRevealed: false,
      hintsRevealed: 0,
    }
  );
}

export function saveExerciseSession(exerciseId: string, state: ExerciseSessionState): void {
  writeRaw(exerciseId, state);
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
