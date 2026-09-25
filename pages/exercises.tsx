import React, { useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ExerciseCard } from '@/components/exercises/ExerciseCard';
import { ExerciseFilterBar } from '@/components/exercises/ExerciseFilterBar';
import { Filter } from 'lucide-react';
import {
  filterExercises,
  listExercises,
  readExerciseSession,
  type ExerciseFilters,
} from '@/lib/exercises';
import { ClientOnly } from '@/components/common/ClientOnly';

const DEFAULT_FILTERS: ExerciseFilters = { difficulty: 'all', operator: 'all' };

export default function ExercisesPage() {
  const [filters, setFilters] = useState<ExerciseFilters>(DEFAULT_FILTERS);
  const allExercises = listExercises();

  const filtered = useMemo(
    () => filterExercises(allExercises, filters),
    [allExercises, filters]
  );

  return (
    <Layout
      title="RAT Exercises — Relational Algebra Practice Problems"
      description="Progressive practice problems with hints and semantic answer checking."
    >
      <div className="space-y-8">
        <div className="pb-4 border-b border-[var(--color-outline)]/60">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[12px] text-[var(--color-ember)] uppercase tracking-wider">
              Practice library v1
            </span>
          </div>
          <h1 className="text-[26px] font-normal tracking-[-0.012em] text-[var(--color-text)]">
            Relational Algebra Exercises
          </h1>
          <p className="text-[15px] text-[var(--color-driftwood)] font-serif mt-1 max-w-2xl leading-relaxed">
            Work from basic selection and projection through joins, set operations, and division.
            Each exercise ships with its own dataset snapshot, progressive hints, and a worked
            solution. Answers are graded by result semantics, not by matching expression text.
          </p>
        </div>

        <ExerciseFilterBar filters={filters} onChange={setFilters} />

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Filter className="w-8 h-8 text-[var(--color-ash)] opacity-60" />}
            title="No exercises match these filters"
            description="Try a broader difficulty or operator filter."
            action={
              <Button variant="secondary" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                Reset filters
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((exercise) => (
              <ClientOnly
                key={exercise.id}
                fallback={<ExerciseCard exercise={exercise} />}
              >
                <ExerciseCard
                  exercise={exercise}
                  completedIndependently={
                    readExerciseSession(exercise.id).completedIndependently
                  }
                />
              </ClientOnly>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
