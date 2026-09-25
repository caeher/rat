import type { ExerciseGradeResult } from '@/lib/exercises/types';

export const QUIZ_RESULT_FORMAT_VERSION = '1.0.0' as const;

export type QuizDirection = 'algebra_to_sql' | 'sql_to_algebra';

export interface QuizGradeResult extends ExerciseGradeResult {
  /** True when the visible dataset matched but a hidden counterexample did not. */
  counterexampleFailed?: boolean;
  /** Human-readable note about finite fixture checking (always set on graded attempts). */
  equivalenceDisclaimer: string;
}

export interface QuizProgressRecord {
  formatVersion: typeof QUIZ_RESULT_FORMAT_VERSION;
  exerciseId: string;
  direction: QuizDirection;
  attemptCount: number;
  lastStatus: 'correct' | 'incorrect' | 'invalid' | null;
  completedAt: number | null;
  hintsRevealed: number;
  solutionRevealed: boolean;
  lastCheckedAt: number | null;
}

export const QUIZ_EQUIVALENCE_DISCLAIMER =
  'Answers are checked by comparing result sets on this exercise dataset and curated hidden variations. Matching here is not proof of universal query equivalence.';
