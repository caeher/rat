import { areRelationsEqual } from '@/lib/engine/contract';
import type { RelationData, TupleValue } from '@/lib/engine/types';
import type { Exercise } from '@/lib/exercises/types';
import { buildSnapshotForExercise } from '@/lib/exercises/snapshot';
import { executeSqlOnDatabase, type SqlJsDatabase } from '@/lib/sql/runtime/execute';
import type { SandboxSnapshot } from '@/lib/sandbox/types';
import type { SqlExecutionOutcome } from '@/lib/sql/runtime/types';
import {
  formatRelationDiff,
  runCounterexampleChecks,
  wrapAsQuizResult,
} from './grade-algebra';
import { buildExpectedSchema, resolveReferenceSql } from './reference';
import { validateLearnerSql } from './sql-subset';
import type { QuizGradeResult } from './types';

function relationFromSqlOutcome(
  outcome: SqlExecutionOutcome,
  expectedColumns: string[]
): RelationData | null {
  if (!outcome.success || !outcome.relation) return null;
  const tuples = outcome.relation.tuples.map((tuple) => {
    const row: Record<string, TupleValue> = {};
    for (const col of expectedColumns) row[col] = tuple[col] ?? null;
    return row;
  });
  return {
    schema: outcome.relation.schema,
    tuples,
  };
}

function createFreshDatabase(db: SqlJsDatabase): SqlJsDatabase {
  return new (db.constructor as new () => SqlJsDatabase)();
}

function executeReferenceSql(
  db: SqlJsDatabase,
  snapshot: SandboxSnapshot,
  exercise: Exercise
): RelationData | null {
  const resolved = resolveReferenceSql(exercise, snapshot);
  if (!resolved) return null;
  const database = createFreshDatabase(db);
  try {
    const outcome = executeSqlOnDatabase({
      db: database,
      snapshot,
      sql: resolved.sql,
      parameters: resolved.parameters,
      expectedSchema: buildExpectedSchema(exercise, snapshot),
    });
    return relationFromSqlOutcome(outcome, exercise.expectedColumns);
  } finally {
    database.close();
  }
}

function executeLearnerSql(
  db: SqlJsDatabase,
  snapshot: SandboxSnapshot,
  exercise: Exercise,
  sql: string
): { relation: RelationData | null; error: QuizGradeResult | null } {
  const database = createFreshDatabase(db);
  const expectedSchema = buildExpectedSchema(exercise, snapshot);
  try {
    const outcome = executeSqlOnDatabase({
      db: database,
      snapshot,
      sql,
      parameters: [],
      expectedSchema,
    });

    if (!outcome.success) {
      return {
        relation: null,
        error: wrapAsQuizResult({
          status: 'invalid',
          message:
            outcome.message ??
            outcome.diagnostics[0]?.message ??
            'SQL execution failed. Check syntax and table/column names.',
        }),
      };
    }

    const relation = relationFromSqlOutcome(outcome, exercise.expectedColumns);
    if (!relation) {
      return {
        relation: null,
        error: wrapAsQuizResult({
          status: 'invalid',
          message: 'Could not read a result relation from your SQL query.',
        }),
      };
    }

    return { relation, error: null };
  } finally {
    database.close();
  }
}

export function gradeSqlQuizAttemptOnDatabase(
  rawSql: string,
  exercise: Exercise,
  db: SqlJsDatabase
): QuizGradeResult {
  const subset = validateLearnerSql(rawSql);
  if (!subset.ok || !subset.normalizedSql) {
    return wrapAsQuizResult({
      status: 'invalid',
      message: subset.message ?? 'Invalid SQL for the quiz subset.',
    });
  }

  const visibleSnapshot = buildSnapshotForExercise(exercise);
  if (!resolveReferenceSql(exercise, visibleSnapshot)) {
    return wrapAsQuizResult({
      status: 'invalid',
      message: 'This exercise reference SQL is unavailable. Try another exercise.',
    });
  }

  const userVisible = executeLearnerSql(db, visibleSnapshot, exercise, subset.normalizedSql);
  if (userVisible.error) return userVisible.error;

  const expected: RelationData = {
    schema: userVisible.relation!.schema,
    tuples: exercise.expectedTuples,
  };

  if (!areRelationsEqual(userVisible.relation!, expected)) {
    return wrapAsQuizResult(
      formatRelationDiff(
        exercise,
        userVisible.relation!,
        expected,
        'Your SQL result differs from the expected answer on this dataset.'
      )
    );
  }

  const counter = runCounterexampleChecks(
    exercise,
    (snapshot) => {
      const attempt = executeLearnerSql(db, snapshot, exercise, subset.normalizedSql!);
      if (attempt.error) return null;
      return attempt.relation;
    },
    (snapshot) => executeReferenceSql(db, snapshot, exercise)
  );

  if (counter) return counter;

  return wrapAsQuizResult({
    status: 'correct',
    message:
      'Your SQL result matches the expected answer on this dataset and hidden counterexamples. Equivalent SELECT queries are accepted; matching here is not proof of universal equivalence.',
    rowCountYours: userVisible.relation!.tuples.length,
    rowCountExpected: expected.tuples.length,
  });
}
