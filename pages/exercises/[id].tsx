import React from 'react';
import Link from 'next/link';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { ExerciseDatasetPreview } from '@/components/exercises/ExerciseDatasetPreview';
import { ExercisePracticePanel } from '@/components/exercises/ExercisePracticePanel';
import { ClientOnly } from '@/components/common/ClientOnly';
import { OPERATOR_CONTRACTS } from '@/lib/engine/contract';
import type { Exercise } from '@/lib/exercises/types';
import {
  difficultyLabel,
  exerciseListPath,
  getExercise,
  listExercises,
} from '@/lib/exercises';
import { ArrowLeft } from 'lucide-react';

interface ExerciseDetailPageProps {
  exercise: Exercise;
}

export default function ExerciseDetailPage({ exercise }: ExerciseDetailPageProps) {
  return (
    <Layout
      title={`${exercise.title} — RAT Exercise`}
      description={exercise.prompt}
    >
      <div className="space-y-8">
        <div className="space-y-4">
          <Link href={exerciseListPath()}>
            <Button variant="secondary" size="sm" className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              All exercises
            </Button>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-[var(--color-ash)]">{exercise.id}</span>
            <Tag
              variant={
                exercise.difficulty === 'beginner'
                  ? 'forest'
                  : exercise.difficulty === 'intermediate'
                    ? 'amber'
                    : 'ember'
              }
            >
              {difficultyLabel(exercise.difficulty)}
            </Tag>
            {exercise.operators.map((op) => (
              <Tag key={op} variant="default">
                {OPERATOR_CONTRACTS[op].symbol} {OPERATOR_CONTRACTS[op].name}
              </Tag>
            ))}
          </div>

          <h1 className="text-[26px] font-normal tracking-[-0.012em] text-[var(--color-text)]">
            {exercise.title}
          </h1>

          <p className="text-[15px] text-[var(--color-driftwood)] font-serif leading-relaxed max-w-3xl">
            {exercise.prompt}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <section className="space-y-4">
            <h2 className="text-[16px] font-normal text-[var(--color-text)]">Dataset snapshot</h2>
            <p className="text-[13px] text-[var(--color-driftwood)] font-serif">
              Practice loads this frozen data so your results stay comparable to the reference
              answer.
            </p>
            <ExerciseDatasetPreview exercise={exercise} />

            <div className="space-y-2 pt-2">
              <h3 className="text-[14px] font-normal text-[var(--color-text)]">Learning objectives</h3>
              <ul className="list-disc list-inside text-[14px] text-[var(--color-driftwood)] font-serif space-y-1">
                {exercise.learningObjectives.map((obj) => (
                  <li key={obj}>{obj}</li>
                ))}
              </ul>
            </div>

            {exercise.prerequisites.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[14px] font-normal text-[var(--color-text)]">Prerequisites</h3>
                <ul className="list-disc list-inside text-[14px] text-[var(--color-driftwood)] font-serif space-y-1">
                  {exercise.prerequisites.map((pre) => (
                    <li key={pre}>{pre}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section>
            <ClientOnly
              fallback={
                <p className="text-[14px] text-[var(--color-ash)] font-serif">
                  Loading practice workspace…
                </p>
              }
            >
              <ExercisePracticePanel exercise={exercise} />
            </ClientOnly>
          </section>
        </div>
      </div>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = () => ({
  paths: listExercises().map((ex) => ({ params: { id: ex.id } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<ExerciseDetailPageProps> = ({ params }) => {
  const id = params?.id;
  if (typeof id !== 'string') {
    return { notFound: true };
  }
  const exercise = getExercise(id);
  if (!exercise) {
    return { notFound: true };
  }
  return { props: { exercise } };
};
