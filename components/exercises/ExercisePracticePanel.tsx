import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpen, CheckCircle2, Eye, Lightbulb, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import {
  RelationalAlgebraEditor,
  type RelationalAlgebraEditorHandle,
} from '@/components/sandbox/RelationalAlgebraEditor';
import { ExpressionDiagnosticList } from '@/components/sandbox/ExpressionDiagnosticList';
import { useDebouncedValidation } from '@/lib/editor/useDebouncedValidation';
import type { Exercise } from '@/lib/exercises/types';
import {
  gradeExerciseAttempt,
  exerciseSandboxPath,
  markCompletedIndependently,
  markSolutionRevealed,
  ensureExerciseSessionHydrated,
  readExerciseSession,
  revealNextHint,
  saveExerciseSession,
} from '@/lib/exercises';
import { buildSnapshotForExercise } from '@/lib/exercises/snapshot';
import { enrichDiagnosticsWithReference } from '@/lib/reference';

export interface ExercisePracticePanelProps {
  exercise: Exercise;
}

export function ExercisePracticePanel({ exercise }: ExercisePracticePanelProps) {
  const [expression, setExpression] = useState('');
  const [session, setSession] = useState(() => readExerciseSession(exercise.id));
  const [gradeMessage, setGradeMessage] = useState<string | null>(null);
  const [gradeTone, setGradeTone] = useState<'success' | 'error' | 'neutral'>('neutral');
  const editorRef = useRef<RelationalAlgebraEditorHandle>(null);

  const snapshot = useMemo(() => buildSnapshotForExercise(exercise), [exercise]);
  const engineSchemas = useMemo(() => ({ ...snapshot.schemas }), [snapshot]);
  const validation = useDebouncedValidation(expression, engineSchemas, snapshot.version);

  const validationDiagnostics = useMemo(
    () => enrichDiagnosticsWithReference(validation.diagnostics),
    [validation.diagnostics]
  );

  useEffect(() => {
    void ensureExerciseSessionHydrated(exercise.id).then(setSession);
  }, [exercise.id]);

  const hintsToShow = exercise.hints
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, session.hintsRevealed);

  const handleRevealHint = () => {
    const next = revealNextHint(exercise.id, exercise.hints.length);
    setSession(next);
  };

  const handleCheck = useCallback(() => {
    const result = gradeExerciseAttempt(expression, exercise);
    setGradeMessage(result.message);
    if (result.status === 'correct') {
      setGradeTone('success');
      if (!session.solutionRevealed) {
        const next = markCompletedIndependently(exercise.id);
        setSession(next);
      }
    } else if (result.status === 'invalid') {
      setGradeTone('neutral');
    } else {
      setGradeTone('error');
    }
  }, [expression, exercise, session.solutionRevealed]);

  const handleRevealSolution = () => {
    const next = markSolutionRevealed(exercise.id);
    setSession(next);
    setExpression(exercise.referenceExpression);
    setGradeMessage(
      'Solution loaded for study. This attempt is marked as assisted — try a fresh expression on your own to earn independent completion.'
    );
    setGradeTone('neutral');
    editorRef.current?.focus();
  };

  const handleClearAttempt = () => {
    setExpression('');
    setGradeMessage(null);
    setGradeTone('neutral');
    const next = readExerciseSession(exercise.id);
    saveExerciseSession(exercise.id, {
      ...next,
      completedIndependently: false,
    });
    setSession(readExerciseSession(exercise.id));
    editorRef.current?.focus();
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <h2 className="text-[16px] font-normal text-[var(--color-text)]">Your attempt</h2>
          <div className="flex flex-wrap gap-2">
            {session.completedIndependently && (
              <Tag variant="forest" className="gap-1">
                <CheckCircle2 className="w-3 h-3" aria-hidden />
                Completed independently
              </Tag>
            )}
            {session.solutionRevealed && !session.completedIndependently && (
              <Tag variant="amber">Solution viewed</Tag>
            )}
          </div>
        </div>

        <p className="text-[13px] text-[var(--color-driftwood)] font-serif leading-relaxed">
          Answers are checked by comparing result sets on this exercise&apos;s dataset — not by
          matching your expression text. Equivalent algebra can pass; matching here is not proof of
          universal equivalence.
        </p>

        <RelationalAlgebraEditor
          ref={editorRef}
          value={expression}
          onChange={setExpression}
          validation={validation}
          schemas={engineSchemas}
          id="exercise-expression-editor"
          aria-label="Exercise answer editor"
          placeholder="Write your relational algebra expression here"
        />

        {validationDiagnostics.length > 0 && (
          <ExpressionDiagnosticList diagnostics={validationDiagnostics} />
        )}

        {gradeMessage && (
          <div
            role="status"
            className={`text-[13px] leading-relaxed rounded-[4px] border px-3 py-2 font-serif ${
              gradeTone === 'success'
                ? 'border-[var(--color-forest)]/40 text-[var(--color-forest)] bg-[var(--color-card)]'
                : gradeTone === 'error'
                  ? 'border-[var(--color-crimson)]/40 text-[var(--color-crimson)] bg-[var(--color-card)]'
                  : 'border-[var(--color-outline)]/60 text-[var(--color-driftwood)] bg-[var(--color-canvas)]'
            }`}
          >
            {gradeMessage}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5"
            onClick={handleCheck}
            disabled={expression.trim().length === 0}
          >
            <Play className="w-3.5 h-3.5" />
            Check answer
          </Button>
          <Button variant="secondary" size="sm" onClick={handleClearAttempt}>
            Clear attempt
          </Button>
          <Link href={exerciseSandboxPath(exercise.id)}>
            <Button variant="secondary" size="sm" className="gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Open in sandbox
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-normal text-[var(--color-text)] flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-[var(--color-amber)]" aria-hidden />
            Hints
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRevealHint}
            disabled={session.hintsRevealed >= exercise.hints.length}
          >
            {session.hintsRevealed >= exercise.hints.length
              ? 'All hints revealed'
              : `Reveal hint ${session.hintsRevealed + 1}`}
          </Button>
        </div>
        {hintsToShow.length === 0 ? (
          <p className="text-[13px] text-[var(--color-ash)] font-serif">
            Stuck? Reveal hints one at a time before viewing the full solution.
          </p>
        ) : (
          <ol className="list-decimal list-inside space-y-2 text-[14px] text-[var(--color-driftwood)] font-serif">
            {hintsToShow.map((hint) => (
              <li key={hint.order}>{hint.text}</li>
            ))}
          </ol>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[16px] font-normal text-[var(--color-text)]">Worked solution</h2>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={handleRevealSolution}
          >
            <Eye className="w-3.5 h-3.5" />
            Show solution
          </Button>
        </div>
        {session.solutionRevealed ? (
          <div className="space-y-3">
            <pre className="text-[13px] font-mono bg-[var(--color-canvas)] border border-[var(--color-outline)]/60 rounded-[4px] p-3 overflow-x-auto text-[var(--color-text)]">
              {exercise.referenceExpression}
            </pre>
            <p className="text-[14px] text-[var(--color-driftwood)] font-serif leading-relaxed">
              {exercise.explanation}
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-[var(--color-ash)] font-serif">
            Viewing the solution marks this practice as assisted. Complete the exercise with a
            correct check before revealing the answer to earn independent completion.
          </p>
        )}
      </Card>
    </div>
  );
}
