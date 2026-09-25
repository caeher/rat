import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import type { Exercise } from '@/lib/exercises/types';
import { difficultyLabel } from '@/lib/exercises';
import { OPERATOR_CONTRACTS } from '@/lib/engine/contract';
import type { QuizDirection } from '@/lib/quiz/types';
import { quizDetailPath, quizDirectionLabel } from '@/lib/quiz';

export interface QuizCardProps {
  exercise: Exercise;
  direction: QuizDirection;
  completed?: boolean;
}

function difficultyVariant(
  difficulty: Exercise['difficulty']
): 'forest' | 'amber' | 'ember' {
  if (difficulty === 'beginner') return 'forest';
  if (difficulty === 'intermediate') return 'amber';
  return 'ember';
}

export function QuizCard({ exercise, direction, completed }: QuizCardProps) {
  const primaryOperator = exercise.operators[0];
  const operatorLabel = primaryOperator
    ? OPERATOR_CONTRACTS[primaryOperator].name
    : 'Operators';

  return (
    <Card className="flex flex-col h-full gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Tag variant={difficultyVariant(exercise.difficulty)}>{difficultyLabel(exercise.difficulty)}</Tag>
        <Tag variant="default">{quizDirectionLabel(direction)}</Tag>
        <Tag variant="default">{operatorLabel}</Tag>
        {completed && (
          <Tag variant="forest" className="gap-1">
            <CheckCircle2 className="w-3 h-3" aria-hidden />
            Completed
          </Tag>
        )}
      </div>

      <div className="space-y-2 flex-1">
        <h3 className="text-[17px] font-normal text-[var(--color-text)] leading-snug">
          {exercise.title}
        </h3>
        <p className="text-[14px] text-[var(--color-driftwood)] font-serif leading-relaxed line-clamp-3">
          {exercise.prompt}
        </p>
      </div>

      <Link href={quizDetailPath(exercise.id, direction)} className="mt-auto">
        <Button variant="secondary" size="sm" className="w-full gap-1.5 justify-center">
          Start quiz
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </Link>
    </Card>
  );
}
