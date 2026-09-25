import { OPERATOR_CONTRACTS } from '@/lib/engine/contract';
import type { OperatorType } from '@/lib/engine/types';
import {
  difficultyLabel,
  listOperatorTypesInLibrary,
  type ExerciseFilters,
} from '@/lib/exercises';
import type { ExerciseDifficulty } from '@/lib/exercises/types';

const DIFFICULTIES: Array<ExerciseDifficulty | 'all'> = [
  'all',
  'beginner',
  'intermediate',
  'advanced',
];

export interface ExerciseFilterBarProps {
  filters: ExerciseFilters;
  onChange: (filters: ExerciseFilters) => void;
}

export function ExerciseFilterBar({ filters, onChange }: ExerciseFilterBarProps) {
  const operators = listOperatorTypesInLibrary();

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] font-mono text-[var(--color-ash)] uppercase tracking-wider mb-2">
          Difficulty
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Difficulty filters">
          {DIFFICULTIES.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onChange({ ...filters, difficulty: level })}
              className={filterButtonClass(filters.difficulty === level)}
            >
              {level === 'all' ? 'All levels' : difficultyLabel(level)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-mono text-[var(--color-ash)] uppercase tracking-wider mb-2">
          Operator focus
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Operator filters">
          <button
            type="button"
            onClick={() => onChange({ ...filters, operator: 'all' })}
            className={filterButtonClass(filters.operator === 'all')}
          >
            All operators
          </button>
          {operators.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => onChange({ ...filters, operator: op })}
              className={filterButtonClass(filters.operator === op)}
              title={OPERATOR_CONTRACTS[op].name}
            >
              {OPERATOR_CONTRACTS[op].symbol} {shortOperatorName(op)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function filterButtonClass(active: boolean): string {
  return `px-3 py-1.5 rounded-[4px] text-[13px] font-mono transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] cursor-pointer ${
    active
      ? 'bg-[var(--color-ink)] text-[var(--color-canvas)] font-medium'
      : 'bg-[var(--color-card)] text-[var(--color-text)] hover:bg-[var(--color-elevated)] border border-[var(--color-outline)]/60'
  }`;
}

function shortOperatorName(op: OperatorType): string {
  const name = OPERATOR_CONTRACTS[op].name;
  const first = name.split(' ')[0];
  return first.length > 12 ? `${first.slice(0, 10)}…` : first;
}
