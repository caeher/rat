import { areRelationsEqual } from '@/lib/engine/contract';
import { validateExpression } from '@/lib/engine/validator';
import { evaluateRaAst } from '@/lib/evaluator/evaluate';
import type { RelationData, TupleValue } from '@/lib/engine/types';
import type { Exercise, ExerciseGradeResult } from '@/lib/exercises/types';
import {
  evaluateReference,
  gradeExerciseAttempt,
} from '@/lib/exercises/grade';
import { buildSnapshotForDataset, buildSnapshotForExercise } from '@/lib/exercises/snapshot';
import { diffRelationSets } from '@/lib/sql/runtime/compare';
import { QUIZ_EQUIVALENCE_DISCLAIMER, type QuizGradeResult } from './types';

export function relationFromUserExpression(
  expression: string,
  snapshot: ReturnType<typeof buildSnapshotForExercise>,
  expectedColumns: string[]
): { relation: RelationData | null; error: ExerciseGradeResult | null } {
  const trimmed = expression.trim();
  const validation = validateExpression(trimmed, snapshot.schemas);
  if (!validation.valid || !validation.ast) {
    const first = validation.diagnostics.find((d) => d.severity === 'error');
    return {
      relation: null,
      error: {
        status: 'invalid',
        message:
          first?.message ??
          'Your expression could not be parsed or validated against this exercise schema.',
      },
    };
  }

  const evalResult = evaluateRaAst({ ast: validation.ast, relations: snapshot.relations });
  if (!evalResult.success) {
    return {
      relation: null,
      error: {
        status: 'invalid',
        message:
          evalResult.error ??
          evalResult.diagnostics[0]?.message ??
          'Evaluation failed at runtime. Check operator compatibility and attribute names.',
      },
    };
  }

  if (!evalResult.relation || !evalResult.schema) {
    return {
      relation: null,
      error: {
        status: 'invalid',
        message: 'Could not build a result relation from your expression.',
      },
    };
  }

  const tuples = evalResult.relation.tuples.map((tuple) => {
    const row: Record<string, TupleValue> = {};
    for (const col of expectedColumns) row[col] = tuple[col] ?? null;
    return row;
  });

  return {
    relation: {
      schema: {
        name: evalResult.schema.name,
        attributes: expectedColumns.map((name) => {
          const attr = evalResult.schema!.attributes.find((a) => a.name === name);
          return attr ?? { name, type: 'null' as const };
        }),
      },
      tuples,
    },
    error: null,
  };
}

export function runCounterexampleChecks(
  exercise: Exercise,
  evaluateUser: (
    snapshot: ReturnType<typeof buildSnapshotForExercise>
  ) => RelationData | null,
  evaluateReferenceOnSnapshot: (
    snapshot: ReturnType<typeof buildSnapshotForExercise>
  ) => RelationData | null = (snapshot) => evaluateReference(exercise, snapshot)
): QuizGradeResult | null {
  for (const fixture of exercise.counterexamples ?? []) {
    const snapshot = buildSnapshotForDataset(fixture.dataset, `${exercise.id}:${fixture.id}`);
    const reference = evaluateReferenceOnSnapshot(snapshot);
    const actual = evaluateUser(snapshot);
    if (!reference || !actual) {
      return {
        status: 'invalid',
        message:
          'Your answer could not be evaluated on a hidden counterexample dataset. Check syntax and schema compatibility.',
        counterexampleFailed: true,
        equivalenceDisclaimer: QUIZ_EQUIVALENCE_DISCLAIMER,
      };
    }
    if (!areRelationsEqual(actual, reference)) {
      return {
        status: 'incorrect',
        message: fixture.failureMessage,
        counterexampleFailed: true,
        equivalenceDisclaimer: QUIZ_EQUIVALENCE_DISCLAIMER,
      };
    }
  }
  return null;
}

export function wrapAsQuizResult(base: ExerciseGradeResult, extra?: Partial<QuizGradeResult>): QuizGradeResult {
  return {
    ...base,
    equivalenceDisclaimer: QUIZ_EQUIVALENCE_DISCLAIMER,
    ...extra,
  };
}

export function formatRelationDiff(
  exercise: Exercise,
  actual: RelationData,
  expected: RelationData,
  prefix: string
): ExerciseGradeResult {
  const diff = diffRelationSets(actual, expected);
  const formatRow = (row: Record<string, TupleValue>) =>
    exercise.expectedColumns.map((c) => `${c}=${String(row[c] ?? 'NULL')}`).join(', ');

  const onlyYours = diff.onlyInLeft.slice(0, 3).map((t) => {
    const row: Record<string, TupleValue> = {};
    for (const col of exercise.expectedColumns) row[col] = t[col] ?? null;
    return row;
  });
  const onlyExpected = diff.onlyInRight.slice(0, 3).map((t) => {
    const row: Record<string, TupleValue> = {};
    for (const col of exercise.expectedColumns) row[col] = t[col] ?? null;
    return row;
  });

  let message = prefix;
  if (onlyYours.length > 0) {
    message += ` Extra tuple(s) in your result: ${onlyYours.map(formatRow).join('; ')}.`;
  }
  if (onlyExpected.length > 0) {
    message += ` Missing expected tuple(s): ${onlyExpected.map(formatRow).join('; ')}.`;
  }
  if (diff.onlyInLeft.length === 0 && diff.onlyInRight.length === 0) {
    message += ' Row counts or column types may differ — compare schemas and duplicate elimination.';
  }

  return {
    status: 'incorrect',
    message,
    onlyInYourResult: onlyYours,
    onlyInExpected: onlyExpected,
    rowCountYours: actual.tuples.length,
    rowCountExpected: expected.tuples.length,
  };
}

export function gradeAlgebraQuizAttempt(expression: string, exercise: Exercise): QuizGradeResult {
  const visible = gradeExerciseAttempt(expression, exercise);
  if (visible.status !== 'correct') {
    return wrapAsQuizResult(visible);
  }

  const counter = runCounterexampleChecks(exercise, (snapshot) => {
    const { relation, error } = relationFromUserExpression(
      expression,
      snapshot,
      exercise.expectedColumns
    );
    if (error) return null;
    return relation;
  });

  if (counter) return counter;
  return wrapAsQuizResult(visible);
}
