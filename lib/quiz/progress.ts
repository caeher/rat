import type { QuizDirection, QuizProgressRecord } from './types';
import { QUIZ_RESULT_FORMAT_VERSION } from './types';
import {
  hydrateQuizProgress,
  persistQuizProgressRecord,
  readCachedQuizProgress,
} from '@/lib/persistence/client';

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
  return readCachedQuizProgress(exerciseId, direction);
}

export async function ensureQuizProgressHydrated(
  exerciseId: string,
  direction: QuizDirection
): Promise<QuizProgressRecord> {
  return hydrateQuizProgress(exerciseId, direction);
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
  void persistQuizProgressRecord(next);
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
  void persistQuizProgressRecord(next);
  return next;
}

export function revealQuizSolution(
  exerciseId: string,
  direction: QuizDirection
): QuizProgressRecord {
  const prev = readQuizProgress(exerciseId, direction);
  const next = { ...prev, solutionRevealed: true };
  void persistQuizProgressRecord(next);
  return next;
}

export function resetQuizProgress(
  exerciseId: string,
  direction: QuizDirection
): QuizProgressRecord {
  const next = defaultQuizProgress(exerciseId, direction);
  void persistQuizProgressRecord(next);
  return next;
}
