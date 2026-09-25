import type { QuizDirection } from './types';
import { withBasePath } from '@/lib/paths';

export const QUIZ_DIRECTIONS: QuizDirection[] = ['algebra_to_sql', 'sql_to_algebra'];

export function quizDirectionLabel(direction: QuizDirection): string {
  return direction === 'algebra_to_sql' ? 'Algebra → SQL' : 'SQL → Algebra';
}

export function quizDirectionSlug(direction: QuizDirection): string {
  return direction === 'algebra_to_sql' ? 'algebra-to-sql' : 'sql-to-algebra';
}

export function quizDirectionFromSlug(slug: string): QuizDirection | null {
  if (slug === 'algebra-to-sql') return 'algebra_to_sql';
  if (slug === 'sql-to-algebra') return 'sql_to_algebra';
  return null;
}

export function quizListPath(): string {
  return withBasePath('/quiz');
}

export function quizDetailPath(exerciseId: string, direction: QuizDirection): string {
  return withBasePath(`/quiz/${exerciseId}/${quizDirectionSlug(direction)}`);
}
