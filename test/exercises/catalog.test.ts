import { describe, expect, it } from 'vitest';
import { OPERATOR_CONTRACTS } from '@/lib/engine/contract';
import type { OperatorType } from '@/lib/engine/types';
import { EXERCISE_LIBRARY, listExercises } from '@/lib/exercises/catalog';
import { assertExerciseReferenceMatchesExpected } from '@/lib/exercises/grade';
import { EXERCISE_FORMAT_VERSION } from '@/lib/exercises/types';
import path from 'node:path';
import { validateExpression } from '@/lib/engine/validator';
import { evaluateRaAst } from '@/lib/evaluator/evaluate';
import { transpileRaAst } from '@/lib/sql';
import { compareAlgebraAndSql } from '@/lib/sql/runtime/compare';
import { executeSqlOnDatabase } from '@/lib/sql/runtime/execute';
import { initSqlEngine, resetSqlEngineCacheForTests } from '@/lib/sql/runtime/initSql';
import { buildSnapshotForExercise } from '@/lib/exercises/snapshot';
import type { Exercise } from '@/lib/exercises/types';

const ALL_OPERATORS: OperatorType[] = Object.keys(OPERATOR_CONTRACTS) as OperatorType[];

describe('exercise library', () => {
  it('has at least five exercises per difficulty', () => {
    for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
      const count = EXERCISE_LIBRARY.filter((ex) => ex.difficulty === level).length;
      expect(count).toBeGreaterThanOrEqual(5);
    }
  });

  it('uses the versioned exercise format', () => {
    for (const ex of listExercises()) {
      expect(ex.formatVersion).toBe(EXERCISE_FORMAT_VERSION);
      expect(ex.hints.length).toBeGreaterThanOrEqual(1);
      expect(ex.referenceExpression.length).toBeGreaterThan(0);
      expect(ex.explanation.length).toBeGreaterThan(0);
    }
  });

  it('covers every relational operator in the contract', () => {
    const covered = new Set<OperatorType>();
    for (const ex of EXERCISE_LIBRARY) {
      for (const op of ex.operators) covered.add(op);
    }
    for (const op of ALL_OPERATORS) {
      expect(covered.has(op), `missing exercise for ${op}`).toBe(true);
    }
  });

  it('verifies reference answers against expected tuples', () => {
    for (const ex of EXERCISE_LIBRARY) {
      assertExerciseReferenceMatchesExpected(ex);
    }
  });

  it('matches SQL semantics when transpilation is available', async () => {
    let checked = 0;
    for (const ex of EXERCISE_LIBRARY) {
      const snapshot = buildSnapshotForExercise(ex);
      const validation = validateExpression(ex.referenceExpression, snapshot.schemas);
      expect(validation.valid).toBe(true);
      const transpiled = transpileRaAst(validation.ast!, snapshot.schemas);
      if (!transpiled.success || !transpiled.sql) {
        continue;
      }
      const comparison = await runExerciseSqlParity(ex);
      expect(comparison.status).toBe('match');
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(10);
  }, 120_000);
});

async function runExerciseSqlParity(exercise: Exercise) {
  const snapshot = buildSnapshotForExercise(exercise);
  const validation = validateExpression(exercise.referenceExpression, snapshot.schemas);
  if (!validation.valid || !validation.ast) {
    throw new Error(validation.diagnostics.map((d) => d.message).join('; '));
  }

  const algebraOutcome = evaluateRaAst({
    ast: validation.ast,
    relations: snapshot.relations,
  });

  const transpiled = transpileRaAst(validation.ast, snapshot.schemas);
  if (!transpiled.success || !transpiled.sql) {
    throw new Error(
      transpiled.diagnostics.map((d) => d.message).join('; ') || 'transpilation failed'
    );
  }

  resetSqlEngineCacheForTests();
  const wasmPath = path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm');
  const SQL = await initSqlEngine(() => wasmPath);
  const db = new SQL.Database();

  try {
    const sqlOutcome = executeSqlOnDatabase({
      db,
      snapshot,
      sql: transpiled.sql,
      parameters: transpiled.parameters,
      expectedSchema: algebraOutcome.schema ?? { name: 'out', attributes: [] },
    });

    return compareAlgebraAndSql(algebraOutcome.relation, sqlOutcome.relation, {
      algebraReady: algebraOutcome.success && Boolean(algebraOutcome.relation),
      sqlReady: sqlOutcome.success,
      failureStage: !algebraOutcome.success ? 'algebra' : !sqlOutcome.success ? 'sql_runtime' : undefined,
      message: sqlOutcome.message,
    });
  } finally {
    db.close();
  }
}
