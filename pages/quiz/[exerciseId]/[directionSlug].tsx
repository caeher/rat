import React from 'react';
import Link from 'next/link';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { ExerciseDatasetPreview } from '@/components/exercises/ExerciseDatasetPreview';
import { QuizPracticePanel } from '@/components/quiz/QuizPracticePanel';
import { ClientOnly } from '@/components/common/ClientOnly';
import { OPERATOR_CONTRACTS } from '@/lib/engine/contract';
import { difficultyLabel, getExercise, listExercises } from '@/lib/exercises';
import {
  QUIZ_DIRECTIONS,
  quizDirectionFromSlug,
  quizDirectionLabel,
  quizDirectionSlug,
  quizListPath,
  type QuizDirection,
} from '@/lib/quiz';
import { ArrowLeft } from 'lucide-react';

interface QuizDetailPageProps {
  exercise: NonNullable<ReturnType<typeof getExercise>>;
  direction: QuizDirection;
}

export default function QuizDetailPage({ exercise, direction }: QuizDetailPageProps) {
  return (
    <Layout
      title={`${exercise.title} — ${quizDirectionLabel(direction)} Quiz`}
      description={exercise.prompt}
    >
      <div className="space-y-8">
        <div className="space-y-4">
          <Link href={quizListPath()}>
            <Button variant="secondary" size="sm" className="gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              All quizzes
            </Button>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-[var(--color-ash)]">{exercise.id}</span>
            <Tag variant="default">{quizDirectionLabel(direction)}</Tag>
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <section className="space-y-4">
            <h2 className="text-[16px] font-normal text-[var(--color-text)]">Dataset & schema</h2>
            <p className="text-[13px] text-[var(--color-driftwood)] font-serif">
              Your answer is checked against this visible snapshot plus hidden counterexample
              variations when configured.
            </p>
            <ExerciseDatasetPreview exercise={exercise} />
          </section>

          <section>
            <ClientOnly
              fallback={
                <p className="text-[14px] text-[var(--color-ash)] font-serif">
                  Loading quiz workspace…
                </p>
              }
            >
              <QuizPracticePanel exercise={exercise} direction={direction} />
            </ClientOnly>
          </section>
        </div>
      </div>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = () => ({
  paths: listExercises().flatMap((exercise) =>
    QUIZ_DIRECTIONS.map((direction) => ({
      params: { exerciseId: exercise.id, directionSlug: quizDirectionSlug(direction) },
    }))
  ),
  fallback: false,
});

export const getStaticProps: GetStaticProps<QuizDetailPageProps> = ({ params }) => {
  const exerciseId = params?.exerciseId;
  const directionSlug = params?.directionSlug;
  if (typeof exerciseId !== 'string' || typeof directionSlug !== 'string') {
    return { notFound: true };
  }
  const direction = quizDirectionFromSlug(directionSlug);
  if (!direction) return { notFound: true };
  const exercise = getExercise(exerciseId);
  if (!exercise) return { notFound: true };
  return { props: { exercise, direction } };
};
