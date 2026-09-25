import { areRelationsEqual } from '@/lib/engine/contract';
import { validateExpression } from '@/lib/engine/validator';
import { evaluateRaAst } from '@/lib/evaluator/evaluate';
import type { RelationData, TupleValue } from '@/lib/engine/types';
import { diffRelationSets } from '@/lib/sql/runtime/compare';
import type { Exercise, ExerciseGradeResult } from './types';
import { buildSnapshotForExercise } from './snapshot';

function relationFromEvaluation(
  result: ReturnType<typeof evaluateRaAst>,
  expectedColumns: string[]
): RelationData | null {
  if (!result.success || !result.relation || !result.schema) return null;

  const tuples = result.relation.tuples.map((tuple) => {
    const row: Record<string, TupleValue> = {};
    for (const col of expectedColumns) {
      row[col] = tuple[col] ?? null;
    }
    return row;
  });

  return {
    schema: {
      name: result.schema.name,
      attributes: expectedColumns.map((name) => {
        const attr = result.schema!.attributes.find((a) => a.name === name);
        return attr ?? { name, type: 'null' as const };
      }),
    },
    tuples,
  };
}

export function evaluateReference(
  exercise: Exercise,
  snapshot: ReturnType<typeof buildSnapshotForExercise>
): RelationData | null {
  const validation = validateExpression(exercise.referenceExpression, snapshot.schemas);
  if (!validation.valid || !validation.ast) return null;
  const result = evaluateRaAst({ ast: validation.ast, relations: snapshot.relations });
  return relationFromEvaluation(result, exercise.expectedColumns);
}

export function gradeExerciseAttempt(expression: string, exercise: Exercise): ExerciseGradeResult {
  const trimmed = expression.trim();
  if (!trimmed) {
    return {
      status: 'invalid',
      message: 'Enter a relational algebra expression before checking your answer.',
    };
  }

  const snapshot = buildSnapshotForExercise(exercise);
  const validation = validateExpression(trimmed, snapshot.schemas);
  if (!validation.valid || !validation.ast) {
    const first = validation.diagnostics.find((d) => d.severity === 'error');
    return {
      status: 'invalid',
      message:
        first?.message ??
        'Your expression could not be parsed or validated against this exercise schema.',
    };
  }

  const evalResult = evaluateRaAst({ ast: validation.ast, relations: snapshot.relations });
  if (!evalResult.success) {
    return {
      status: 'invalid',
      message:
        evalResult.error ??
        evalResult.diagnostics[0]?.message ??
        'Evaluation failed at runtime. Check operator compatibility and attribute names.',
    };
  }

  const actual = relationFromEvaluation(evalResult, exercise.expectedColumns);
  if (!actual) {
    return {
      status: 'invalid',
      message: 'Could not build a result relation from your expression.',
    };
  }

  const expected: RelationData = {
    schema: actual.schema,
    tuples: exercise.expectedTuples,
  };

  if (areRelationsEqual(actual, expected)) {
    return {
      status: 'correct',
      message:
        'Your result matches the expected answer on this dataset. Equivalent expressions are accepted; matching one instance does not prove universal equivalence.',
      rowCountYours: actual.tuples.length,
      rowCountExpected: expected.tuples.length,
    };
  }

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

  let message = 'Your result differs from the expected answer on this dataset.';
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

/** Dev/test helper: ensure catalog reference answers match expected tuples. */
export function assertExerciseReferenceMatchesExpected(exercise: Exercise): void {
  const snapshot = buildSnapshotForExercise(exercise);
  const fromRef = evaluateReference(exercise, snapshot);
  if (!fromRef) {
    throw new Error(`Reference expression invalid for ${exercise.id}`);
  }
  const expected: RelationData = {
    schema: fromRef.schema,
    tuples: exercise.expectedTuples,
  };
  if (!areRelationsEqual(fromRef, expected)) {
    throw new Error(`Expected tuples mismatch reference evaluation for ${exercise.id}`);
  }
}
