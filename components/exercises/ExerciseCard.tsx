import Link from 'next/link';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import type { Exercise } from '@/lib/exercises/types';
import { difficultyLabel } from '@/lib/exercises';
import { exerciseDetailPath } from '@/lib/exercises/paths';
import { OPERATOR_CONTRACTS } from '@/lib/engine/contract';

export interface ExerciseCardProps {
  exercise: Exercise;
  completedIndependently?: boolean;
}

function difficultyVariant(
  difficulty: Exercise['difficulty']
): 'forest' | 'amber' | 'ember' {
  if (difficulty === 'beginner') return 'forest';
  if (difficulty === 'intermediate') return 'amber';
  return 'ember';
}

export function ExerciseCard({ exercise, completedIndependently }: ExerciseCardProps) {
  const primaryOperator = exercise.operators[0];
  const operatorLabel = primaryOperator
    ? OPERATOR_CONTRACTS[primaryOperator].name
    : 'Operators';

  return (
    <Card className="flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {completedIndependently ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--color-forest)]" aria-hidden />
            ) : (
              <Circle className="w-4 h-4 text-[var(--color-outline)]" aria-hidden />
            )}
            <span className="font-mono text-[11px] text-[var(--color-ash)]">{exercise.id}</span>
          </div>
          <Tag variant={difficultyVariant(exercise.difficulty)}>
            {difficultyLabel(exercise.difficulty)}
          </Tag>
        </div>

        <h3 className="text-[18px] font-normal text-[var(--color-text)] mb-2">{exercise.title}</h3>

        <p className="text-[14px] text-[var(--color-driftwood)] leading-relaxed mb-3 line-clamp-3">
          {exercise.prompt}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {exercise.operators.slice(0, 3).map((op) => (
            <Tag key={op} variant="default" className="text-[10px]">
              {OPERATOR_CONTRACTS[op].symbol}
            </Tag>
          ))}
          {exercise.operators.length > 3 && (
            <Tag variant="default" className="text-[10px]">+{exercise.operators.length - 3}</Tag>
          )}
        </div>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[var(--color-outline)]/40">
        <span className="text-[12px] font-mono text-[var(--color-ash)]">{operatorLabel}</span>
        <Link href={exerciseDetailPath(exercise.id)} className="w-full sm:w-auto">
          <Button variant="secondary" size="sm" className="w-full sm:w-auto justify-center gap-1.5">
            Open exercise
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
