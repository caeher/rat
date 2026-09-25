import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Eye, Lightbulb, Play, RotateCcw } from 'lucide-react';
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
import { buildSnapshotForExercise } from '@/lib/exercises/snapshot';
import { enrichDiagnosticsWithReference } from '@/lib/reference';
import { resolveAssetPath } from '@/lib/paths';
import { initSqlEngine } from '@/lib/sql/runtime/initSql';
import {
  QUIZ_EQUIVALENCE_DISCLAIMER,
  gradeAlgebraQuizAttempt,
  gradeSqlQuizAttemptOnDatabase,
  quizDirectionLabel,
  ensureQuizProgressHydrated,
  readQuizProgress,
  recordQuizAttempt,
  resetQuizProgress,
  revealQuizHint,
  revealQuizSolution,
  resolveReferenceSql,
  type QuizDirection,
  type QuizGradeResult,
} from '@/lib/quiz';

export interface QuizPracticePanelProps {
  exercise: Exercise;
  direction: QuizDirection;
}

export function QuizPracticePanel({ exercise, direction }: QuizPracticePanelProps) {
  const [algebraAnswer, setAlgebraAnswer] = useState('');
  const [sqlAnswer, setSqlAnswer] = useState('');
  const [progress, setProgress] = useState(() => readQuizProgress(exercise.id, direction));
  const [grade, setGrade] = useState<QuizGradeResult | null>(null);
  const [checking, setChecking] = useState(false);
  const editorRef = useRef<RelationalAlgebraEditorHandle>(null);

  const snapshot = useMemo(() => buildSnapshotForExercise(exercise), [exercise]);
  const engineSchemas = useMemo(() => ({ ...snapshot.schemas }), [snapshot]);
  const validation = useDebouncedValidation(algebraAnswer, engineSchemas, snapshot.version);
  const validationDiagnostics = useMemo(
    () => enrichDiagnosticsWithReference(validation.diagnostics),
    [validation.diagnostics]
  );

  const promptSql = useMemo(
    () => resolveReferenceSql(exercise, snapshot)?.executableSql ?? null,
    [exercise, snapshot]
  );

  useEffect(() => {
    void ensureQuizProgressHydrated(exercise.id, direction).then(setProgress);
    setGrade(null);
    setAlgebraAnswer('');
    setSqlAnswer('');
  }, [exercise.id, direction]);

  const hintsToShow = exercise.hints
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, progress.hintsRevealed);

  const gradeTone =
    grade?.status === 'correct' ? 'success' : grade?.status === 'incorrect' ? 'error' : 'neutral';

  const handleCheck = useCallback(async () => {
    setChecking(true);
    try {
      let result: QuizGradeResult;
      if (direction === 'sql_to_algebra') {
        result = gradeAlgebraQuizAttempt(algebraAnswer, exercise);
      } else {
        const SQL = await initSqlEngine(() => resolveAssetPath('/sql-wasm/sql-wasm.wasm'));
        const db = new SQL.Database();
        try {
          result = gradeSqlQuizAttemptOnDatabase(sqlAnswer, exercise, db);
        } finally {
          db.close();
        }
      }
      setGrade(result);
      const next = recordQuizAttempt(exercise.id, direction, result.status);
      setProgress(next);
    } finally {
      setChecking(false);
    }
  }, [algebraAnswer, sqlAnswer, direction, exercise]);

  const handleRevealHint = () => {
    const next = revealQuizHint(exercise.id, direction, exercise.hints.length);
    setProgress(next);
  };

  const handleRevealSolution = () => {
    const next = revealQuizSolution(exercise.id, direction);
    setProgress(next);
    if (direction === 'sql_to_algebra') {
      setAlgebraAnswer(exercise.referenceExpression);
    } else if (promptSql) {
      setSqlAnswer(promptSql.replace(/;\s*$/, ''));
    }
    setGrade({
      status: 'invalid',
      message:
        'Reference answer loaded for study. This attempt is marked as assisted — solve without revealing to record independent completion.',
      equivalenceDisclaimer: QUIZ_EQUIVALENCE_DISCLAIMER,
    });
    editorRef.current?.focus();
  };

  const handleRetry = () => {
    setGrade(null);
    if (direction === 'sql_to_algebra') {
      setAlgebraAnswer('');
      editorRef.current?.focus();
    } else {
      setSqlAnswer('');
    }
  };

  const handleResetProgress = () => {
    const next = resetQuizProgress(exercise.id, direction);
    setProgress(next);
    handleRetry();
  };

  const answerEmpty =
    direction === 'sql_to_algebra' ? algebraAnswer.trim().length === 0 : sqlAnswer.trim().length === 0;

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <h2 className="text-[16px] font-normal text-[var(--color-text)]">
            {quizDirectionLabel(direction)}
          </h2>
          <div className="flex flex-wrap gap-2">
            {progress.completedAt && !progress.solutionRevealed && (
              <Tag variant="forest" className="gap-1">
                <CheckCircle2 className="w-3 h-3" aria-hidden />
                Completed
              </Tag>
            )}
            {progress.solutionRevealed && (
              <Tag variant="amber">Reference viewed</Tag>
            )}
            {progress.attemptCount > 0 && (
              <Tag variant="default">{progress.attemptCount} attempt(s)</Tag>
            )}
          </div>
        </div>

        {direction === 'algebra_to_sql' ? (
          <p className="text-[14px] text-[var(--color-driftwood)] font-serif leading-relaxed">
            {exercise.prompt}
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-[13px] text-[var(--color-ash)] font-mono uppercase tracking-wider">
              Target SQL
            </p>
            {promptSql ? (
              <pre className="text-[13px] font-mono bg-[var(--color-canvas)] border border-[var(--color-outline)]/60 rounded-[4px] p-3 overflow-x-auto text-[var(--color-text)]">
                {promptSql}
              </pre>
            ) : (
              <p className="text-[13px] text-[var(--color-crimson)]">
                Reference SQL is unavailable for this exercise.
              </p>
            )}
            <p className="text-[14px] text-[var(--color-driftwood)] font-serif leading-relaxed">
              Write relational algebra that produces the same result as this query on the dataset
              shown alongside this panel.
            </p>
          </div>
        )}

        <p className="text-[13px] text-[var(--color-driftwood)] font-serif leading-relaxed border-l-2 border-[var(--color-amber)]/50 pl-3">
          {QUIZ_EQUIVALENCE_DISCLAIMER}
        </p>

        {direction === 'sql_to_algebra' ? (
          <>
            <RelationalAlgebraEditor
              ref={editorRef}
              value={algebraAnswer}
              onChange={setAlgebraAnswer}
              validation={validation}
              schemas={engineSchemas}
              id="quiz-algebra-editor"
              aria-label="Relational algebra answer"
              placeholder="Write relational algebra that matches the SQL query"
            />
            {validationDiagnostics.length > 0 && (
              <ExpressionDiagnosticList diagnostics={validationDiagnostics} />
            )}
          </>
        ) : (
          <div className="space-y-2">
            <label htmlFor="quiz-sql-editor" className="font-mono text-[11px] text-[var(--color-ash)]">
              SQL answer (read-only subset: single SELECT)
            </label>
            <textarea
              id="quiz-sql-editor"
              value={sqlAnswer}
              onChange={(e) => setSqlAnswer(e.target.value)}
              rows={8}
              spellCheck={false}
              className="w-full font-mono text-[13px] leading-relaxed rounded-[4px] border border-[var(--color-outline)]/70 bg-[var(--color-canvas)] px-3 py-2 text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]"
              placeholder="SELECT … FROM …"
            />
          </div>
        )}

        {grade && (
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
            {grade.message}
            {grade.counterexampleFailed && (
              <span className="block mt-2 text-[12px] text-[var(--color-ember)]">
                Hidden counterexample check failed — your query is not equivalent on all curated
                fixtures.
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5"
            onClick={() => void handleCheck()}
            disabled={answerEmpty || checking}
          >
            <Play className="w-3.5 h-3.5" />
            {checking ? 'Checking…' : 'Check answer'}
          </Button>
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={handleRetry}>
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </Button>
          <Button variant="secondary" size="sm" onClick={handleResetProgress}>
            Reset progress
          </Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-normal text-[var(--color-text)] flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-[var(--color-amber)]" aria-hidden />
            Progressive hints
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRevealHint}
            disabled={progress.hintsRevealed >= exercise.hints.length}
          >
            {progress.hintsRevealed >= exercise.hints.length
              ? 'All hints revealed'
              : `Reveal hint ${progress.hintsRevealed + 1}`}
          </Button>
        </div>
        {hintsToShow.length === 0 ? (
          <p className="text-[13px] text-[var(--color-ash)] font-serif">
            Reveal hints one at a time before opening the reference answer.
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
          <h2 className="text-[16px] font-normal text-[var(--color-text)]">Explained reference</h2>
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={handleRevealSolution}>
            <Eye className="w-3.5 h-3.5" />
            Show reference
          </Button>
        </div>
        {progress.solutionRevealed ? (
          <div className="space-y-3">
            {direction === 'sql_to_algebra' ? (
              <pre className="text-[13px] font-mono bg-[var(--color-canvas)] border border-[var(--color-outline)]/60 rounded-[4px] p-3 overflow-x-auto">
                {exercise.referenceExpression}
              </pre>
            ) : (
              <pre className="text-[13px] font-mono bg-[var(--color-canvas)] border border-[var(--color-outline)]/60 rounded-[4px] p-3 overflow-x-auto">
                {promptSql ?? '-- unavailable'}
              </pre>
            )}
            <p className="text-[14px] text-[var(--color-driftwood)] font-serif leading-relaxed">
              {exercise.explanation}
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-[var(--color-ash)] font-serif">
            The reference pairs algebra and SQL for this exercise. Viewing it marks progress as
            assisted.
          </p>
        )}
      </Card>
    </div>
  );
}
