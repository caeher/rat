import { describe, expect, it } from 'vitest';
import { runAlgebraSqlParity, runSqlWithCustomQuery } from './helpers';

const OPERATOR_FIXTURES: { operator: string; expression: string }[] = [
  { operator: 'selection', expression: 'σ major_id IS NULL ( Students )' },
  { operator: 'projection', expression: 'π student_id, name ( Students )' },
  { operator: 'rename_attributes', expression: 'π employee_name ( ρ[name -> employee_name](Students) )' },
  { operator: 'rename_relation', expression: 'π name ( ρ S ( Students ) )' },
  {
    operator: 'cartesian_product',
    expression:
      'π student_id, title ( ρ[major_id -> s_major](Students) ⨯ ρ[major_id -> c_major](Courses) )',
  },
  { operator: 'natural_join', expression: 'π student_id, major_name ( Students ⋈ Majors )' },
  {
    operator: 'theta_join',
    expression:
      'π student_id, title ( ρ[major_id -> s_major](Students) ⋈[Students.student_id = Courses.course_id] Courses )',
  },
  { operator: 'left_join', expression: 'π student_id, major_name ( Students ⟕ Majors )' },
  { operator: 'right_join', expression: 'π student_id, major_name ( Students ⟖ Majors )' },
  { operator: 'full_join', expression: 'π student_id, major_name ( Students ⟗ Majors )' },
  { operator: 'union', expression: '( π name ( Students ) ) ∪ ( π name ( Professors ) )' },
  {
    operator: 'intersection',
    expression:
      'π student_id ( σ course_id = 101 ( Enrolled ) ) ∩ π student_id ( σ course_id = 102 ( Enrolled ) )',
  },
  {
    operator: 'difference',
    expression: 'π student_id ( Enrolled ) − π student_id ( σ course_id = 999 ( Enrolled ) )',
  },
  { operator: 'division', expression: 'Enrolled ÷ π course_id ( Courses )' },
];

describe('algebra ↔ SQLite parity', () => {
  for (const fixture of OPERATOR_FIXTURES) {
    it(`agrees for ${fixture.operator}`, async () => {
      const comparison = await runAlgebraSqlParity(fixture.expression);
      expect(comparison.algebraReady, comparison.message).toBe(true);
      expect(comparison.sqlReady, comparison.message).toBe(true);
      expect(comparison.status).toBe('match');
    });
  }

  it('reports a useful mismatch when SQL returns an extra tuple', async () => {
    const expression = 'π student_id, name ( σ student_id < 3 ( Students ) )';
    const comparison = await runAlgebraSqlParity(expression);
    expect(comparison.status).toBe('match');

    const snapshot = await import('./helpers').then((m) => m.buildUniversitySnapshot());
    const { validateExpression } = await import('@/lib/engine/validator');
    const { transpileRaAst } = await import('@/lib/sql');
    const validation = validateExpression(expression, snapshot.schemas);
    const transpiled = transpileRaAst(validation.ast!, snapshot.schemas);
    const base = transpiled.sql!.trim().replace(/;$/u, '');
    const incorrectSql = `${base} UNION SELECT 99 AS student_id, 'Extra Row' AS name`;

    const mismatch = await runSqlWithCustomQuery(expression, incorrectSql);
    expect(mismatch.status).toBe('mismatch');
    expect(mismatch.sqlRowCount).toBeGreaterThan(mismatch.algebraRowCount);
    expect(mismatch.diff?.onlyInRight.length).toBeGreaterThan(0);
  });
});
