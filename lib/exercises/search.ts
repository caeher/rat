import type { OperatorType } from '@/lib/engine/types';
import type { Exercise, ExerciseDifficulty } from './types';
import { EXERCISE_LIBRARY } from './catalog';

export interface ExerciseFilters {
  difficulty: ExerciseDifficulty | 'all';
  operator: OperatorType | 'all';
}

const DIFFICULTY_LABELS: Record<ExerciseDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function difficultyLabel(level: ExerciseDifficulty): string {
  return DIFFICULTY_LABELS[level];
}

export function listOperatorTypesInLibrary(): OperatorType[] {
  const set = new Set<OperatorType>();
  for (const ex of EXERCISE_LIBRARY) {
    for (const op of ex.operators) set.add(op);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function filterExercises(
  exercises: Exercise[],
  filters: ExerciseFilters
): Exercise[] {
  return exercises.filter((ex) => {
    if (filters.difficulty !== 'all' && ex.difficulty !== filters.difficulty) {
      return false;
    }
    if (filters.operator !== 'all' && !ex.operators.includes(filters.operator)) {
      return false;
    }
    return true;
  });
}
