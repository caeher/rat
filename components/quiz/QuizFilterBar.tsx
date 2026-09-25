import React from 'react';
import { clsx } from 'clsx';
import type { ExerciseFilters } from '@/lib/exercises/search';
import { listOperatorTypesInLibrary, operatorFilterLabel } from '@/lib/exercises';
import type { QuizDirection } from '@/lib/quiz/types';
import { QUIZ_DIRECTIONS, quizDirectionLabel } from '@/lib/quiz';

export interface QuizFilterBarProps {
  exerciseFilters: ExerciseFilters;
  direction: QuizDirection | 'all';
  onExerciseFiltersChange: (filters: ExerciseFilters) => void;
  onDirectionChange: (direction: QuizDirection | 'all') => void;
}

export function QuizFilterBar({
  exerciseFilters,
  direction,
  onExerciseFiltersChange,
  onDirectionChange,
}: QuizFilterBarProps) {
  const operators = listOperatorTypesInLibrary();

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
      <div className="space-y-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ash)]">
          Quiz direction
        </span>
        <div className="flex flex-wrap gap-2">
          {(['all', ...QUIZ_DIRECTIONS] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onDirectionChange(value === 'all' ? 'all' : value)}
              className={clsx(
                'px-3 py-1.5 rounded-[4px] text-[13px] border transition-colors cursor-pointer',
                direction === value
                  ? 'bg-[var(--color-card)] border-[var(--color-outline)] text-[var(--color-text)] shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
                  : 'border-transparent text-[var(--color-driftwood)] hover:bg-[var(--color-card)]/60'
              )}
            >
              {value === 'all' ? 'Both directions' : quizDirectionLabel(value)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 flex-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ash)]">
          Difficulty
        </span>
        <div className="flex flex-wrap gap-2">
          {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onExerciseFiltersChange({ ...exerciseFilters, difficulty: level })}
              className={clsx(
                'px-3 py-1.5 rounded-[4px] text-[13px] border transition-colors capitalize cursor-pointer',
                exerciseFilters.difficulty === level
                  ? 'bg-[var(--color-card)] border-[var(--color-outline)] text-[var(--color-text)]'
                  : 'border-transparent text-[var(--color-driftwood)] hover:bg-[var(--color-card)]/60'
              )}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 flex-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ash)]">
          Operator focus
        </span>
        <select
          value={exerciseFilters.operator}
          onChange={(e) =>
            onExerciseFiltersChange({
              ...exerciseFilters,
              operator: e.target.value as ExerciseFilters['operator'],
            })
          }
          className="w-full max-w-xs text-[13px] rounded-[4px] border border-[var(--color-outline)]/70 bg-[var(--color-card)] px-3 py-2 text-[var(--color-text)]"
        >
          <option value="all">All operators</option>
          {operators.map((op) => (
            <option key={op} value={op}>
              {operatorFilterLabel(op)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
