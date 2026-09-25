import React, { useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { QuizCard } from '@/components/quiz/QuizCard';
import { QuizFilterBar } from '@/components/quiz/QuizFilterBar';
import { ClientOnly } from '@/components/common/ClientOnly';
import { Filter } from 'lucide-react';
import { filterExercises, listExercises, type ExerciseFilters } from '@/lib/exercises';
import {
  QUIZ_DIRECTIONS,
  quizDirectionLabel,
  readQuizProgress,
  type QuizDirection,
} from '@/lib/quiz';

const DEFAULT_FILTERS: ExerciseFilters = { difficulty: 'all', operator: 'all' };

export default function QuizIndexPage() {
  const [exerciseFilters, setExerciseFilters] = useState<ExerciseFilters>(DEFAULT_FILTERS);
  const [directionFilter, setDirectionFilter] = useState<QuizDirection | 'all'>('all');

  const exercises = useMemo(
    () => filterExercises(listExercises(), exerciseFilters),
    [exerciseFilters]
  );

  const quizEntries = useMemo(() => {
    const directions =
      directionFilter === 'all' ? QUIZ_DIRECTIONS : ([directionFilter] as QuizDirection[]);
    return exercises.flatMap((exercise) =>
      directions.map((direction) => ({ exercise, direction }))
    );
  }, [exercises, directionFilter]);

  return (
    <Layout
      title="RAT Quizzes — SQL ↔ Relational Algebra"
      description="Bidirectional translation quizzes with semantic checking and hidden counterexamples."
    >
      <div className="space-y-8">
        <div className="pb-4 border-b border-[var(--color-outline)]/60">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[12px] text-[var(--color-ember)] uppercase tracking-wider">
              Quiz mode
            </span>
          </div>
          <h1 className="text-[26px] font-normal tracking-[-0.012em] text-[var(--color-text)]">
            SQL ↔ Algebra Quizzes
          </h1>
          <p className="text-[15px] text-[var(--color-driftwood)] font-serif mt-1 max-w-2xl leading-relaxed">
            Practice both directions: write SQL for a relational-algebra-style prompt, or write
            algebra for a fixed SELECT query. Answers are graded by comparing result sets (never by
            text matching), including curated hidden datasets when available.
          </p>
        </div>

        <QuizFilterBar
          exerciseFilters={exerciseFilters}
          direction={directionFilter}
          onExerciseFiltersChange={setExerciseFilters}
          onDirectionChange={setDirectionFilter}
        />

        {quizEntries.length === 0 ? (
          <EmptyState
            icon={<Filter className="w-8 h-8 text-[var(--color-ash)] opacity-60" />}
            title="No quizzes match these filters"
            description="Broaden the direction, difficulty, or operator filters."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setExerciseFilters(DEFAULT_FILTERS);
                  setDirectionFilter('all');
                }}
              >
                Reset filters
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quizEntries.map(({ exercise, direction }) => (
              <ClientOnly
                key={`${exercise.id}:${direction}`}
                fallback={<QuizCard exercise={exercise} direction={direction} />}
              >
                <QuizCard
                  exercise={exercise}
                  direction={direction}
                  completed={Boolean(readQuizProgress(exercise.id, direction).completedAt)}
                />
              </ClientOnly>
            ))}
          </div>
        )}

        <p className="text-[13px] text-[var(--color-ash)] font-serif max-w-3xl">
          Each card opens one direction ({quizDirectionLabel('algebra_to_sql')} or{' '}
          {quizDirectionLabel('sql_to_algebra')}) for the same underlying exercise dataset.
        </p>
      </div>
    </Layout>
  );
}
