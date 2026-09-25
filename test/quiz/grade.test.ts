import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getExercise } from '@/lib/exercises/catalog';
import { gradeAlgebraQuizAttempt } from '@/lib/quiz/grade-algebra';
import { gradeSqlQuizAttemptOnDatabase } from '@/lib/quiz/grade-sql';
import { validateLearnerSql } from '@/lib/quiz/sql-subset';
import { initSqlEngine, resetSqlEngineCacheForTests } from '@/lib/sql/runtime/initSql';
import { buildSnapshotForExercise } from '@/lib/exercises/snapshot';
import { validateExpression } from '@/lib/engine/validator';
import { transpileRaAst } from '@/lib/sql';
import { toExecutableSql } from '@/lib/sql/executable';

describe('quiz grading', () => {
  it('accepts equivalent algebra on visible data', () => {
    const exercise = getExercise('ex-begin-projection');
    expect(exercise).toBeDefined();
    const result = gradeAlgebraQuizAttempt('pi dept_name ( Departments )', exercise!);
    expect(result.status).toBe('correct');
  });

  it('rejects misleading algebra that passes visible data but fails counterexample', () => {
    const exercise = getExercise('ex-begin-selection');
    expect(exercise).toBeDefined();
    const misleading = 'σ gpa > 3.7 ( Students )';
    const result = gradeAlgebraQuizAttempt(misleading, exercise!);
    expect(result.status).toBe('incorrect');
    expect(result.counterexampleFailed).toBe(true);
  });

  it('rejects incorrect algebra with tuple feedback', () => {
    const exercise = getExercise('ex-begin-projection');
    const result = gradeAlgebraQuizAttempt('π dept_id ( Departments )', exercise!);
    expect(result.status).toBe('incorrect');
    expect(result.rowCountYours).toBeDefined();
  });

  it('rejects mutating SQL without executing destructive statements', async () => {
    const exercise = getExercise('ex-begin-projection');
    expect(exercise).toBeDefined();
    const subset = validateLearnerSql('UPDATE Departments SET dept_name = "x"');
    expect(subset.ok).toBe(false);
    expect(subset.reason).toBe('mutating');
  });

  it('accepts alternative SQL formulations by result set', async () => {
    const exercise = getExercise('ex-begin-projection');
    expect(exercise).toBeDefined();
    resetSqlEngineCacheForTests();
    const wasmPath = path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm');
    const SQL = await initSqlEngine(() => wasmPath);
    const db = new SQL.Database();
    try {
      const alt = 'SELECT DISTINCT dept_name FROM Departments ORDER BY dept_name';
      const result = gradeSqlQuizAttemptOnDatabase(alt, exercise!, db);
      expect(result.status).toBe('correct');
    } finally {
      db.close();
    }
  });

  it('rejects SQL that matches visible data but fails counterexample', async () => {
    const exercise = getExercise('ex-begin-selection');
    expect(exercise).toBeDefined();
    resetSqlEngineCacheForTests();
    const wasmPath = path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm');
    const SQL = await initSqlEngine(() => wasmPath);
    const db = new SQL.Database();
    try {
      const misleading = 'SELECT * FROM Students WHERE gpa > 3.7';
      const result = gradeSqlQuizAttemptOnDatabase(misleading, exercise!, db);
      expect(result.status).toBe('incorrect');
      expect(result.counterexampleFailed).toBe(true);
    } finally {
      db.close();
    }
  });
});

describe('reference SQL transpile for quizzes', () => {
  it('does not require reverse SQL-to-algebra translation', () => {
    const exercise = getExercise('ex-begin-selection');
    expect(exercise).toBeDefined();
    const snapshot = buildSnapshotForExercise(exercise!);
    const validation = validateExpression(exercise!.referenceExpression, snapshot.schemas);
    expect(validation.valid).toBe(true);
    const transpiled = transpileRaAst(validation.ast!, snapshot.schemas);
    expect(transpiled.success).toBe(true);
    expect(toExecutableSql(transpiled.sql!, transpiled.parameters).length).toBeGreaterThan(10);
  });
});
