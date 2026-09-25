import type { QuizDirection, QuizProgressRecord } from './types';
import { QUIZ_RESULT_FORMAT_VERSION } from './types';

const STORAGE_PREFIX = 'rat:quiz:';

function storageKey(exerciseId: string, direction: QuizDirection): string {
  return `${STORAGE_PREFIX}${QUIZ_RESULT_FORMAT_VERSION}:${exerciseId}:${direction}`;
}

function readRaw(exerciseId: string, direction: QuizDirection): QuizProgressRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(exerciseId, direction));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuizProgressRecord;
    if (parsed.formatVersion !== QUIZ_RESULT_FORMAT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeRaw(record: QuizProgressRecord): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(record.exerciseId, record.direction), JSON.stringify(record));
  } catch {
    // ignore quota / private mode
  }
}

export function defaultQuizProgress(
  exerciseId: string,
  direction: QuizDirection
): QuizProgressRecord {
  return {
    formatVersion: QUIZ_RESULT_FORMAT_VERSION,
    exerciseId,
    direction,
    attemptCount: 0,
    lastStatus: null,
    completedAt: null,
    hintsRevealed: 0,
    solutionRevealed: false,
    lastCheckedAt: null,
  };
}

export function readQuizProgress(exerciseId: string, direction: QuizDirection): QuizProgressRecord {
  return readRaw(exerciseId, direction) ?? defaultQuizProgress(exerciseId, direction);
}

export function recordQuizAttempt(
  exerciseId: string,
  direction: QuizDirection,
  status: 'correct' | 'incorrect' | 'invalid'
): QuizProgressRecord {
  const prev = readQuizProgress(exerciseId, direction);
  const next: QuizProgressRecord = {
    ...prev,
    attemptCount: prev.attemptCount + 1,
    lastStatus: status,
    lastCheckedAt: Date.now(),
    completedAt:
      status === 'correct' && !prev.solutionRevealed ? Date.now() : prev.completedAt,
  };
  writeRaw(next);
  return next;
}

export function revealQuizHint(
  exerciseId: string,
  direction: QuizDirection,
  maxHints: number
): QuizProgressRecord {
  const prev = readQuizProgress(exerciseId, direction);
  const next = {
    ...prev,
    hintsRevealed: Math.min(maxHints, prev.hintsRevealed + 1),
  };
  writeRaw(next);
  return next;
}

export function revealQuizSolution(
  exerciseId: string,
  direction: QuizDirection
): QuizProgressRecord {
  const prev = readQuizProgress(exerciseId, direction);
  const next = { ...prev, solutionRevealed: true };
  writeRaw(next);
  return next;
}

export function resetQuizProgress(
  exerciseId: string,
  direction: QuizDirection
): QuizProgressRecord {
  const next = defaultQuizProgress(exerciseId, direction);
  writeRaw(next);
  return next;
}
