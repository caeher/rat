import { describe, expect, it } from 'vitest';
import { parseSql } from '@/lib/sql/parse';
import { buildRaExpressionFromSqlAst } from '@/lib/sql/reverse/compile';
import { translateSqlToAlgebra } from '@/lib/sql/sql-to-ra';
import { createSandboxSnapshot } from '@/lib/sandbox/snapshot';
import { universityPreset } from '@/lib/sandbox/presets/university';
import type { SandboxState } from '@/lib/sandbox/types';

function universitySchemas() {
  const schemaSet = universityPreset.buildSchemaSet();
  const state: SandboxState = {
    schemaSets: [{ ...schemaSet, id: 'uni' }],
    activeSchemaSetId: 'uni',
    dataVersion: 1,
  };
  const snapshot = createSandboxSnapshot(state);
  if (!snapshot) throw new Error('missing snapshot');
  return snapshot.schemas;
}

describe('SQL parse (supported subset)', () => {
  it('parses DISTINCT select with WHERE', () => {
    const { ast, diagnostics } = parseSql(
      'SELECT DISTINCT student_id FROM Students WHERE gpa > 3.5'
    );
    expect(diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(ast?.type).toBe('select');
  });

  it('parses transpiled join SQL shape', () => {
    const sql =
      'SELECT DISTINCT student_id, major_name FROM (SELECT DISTINCT * FROM (SELECT DISTINCT * FROM Students AS r1) AS q2 NATURAL JOIN (SELECT DISTINCT * FROM Majors AS r3) AS q4) AS q5';
    const { ast, diagnostics } = parseSql(sql);
    expect(diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(ast).not.toBeNull();
    const schemas = universitySchemas();
    const { expression, diagnostics: buildDiags } = buildRaExpressionFromSqlAst(
      ast!,
      schemas,
      sql
    );
    if (buildDiags.some((d) => d.severity === 'error')) {
      throw new Error(buildDiags.map((d) => d.message).join('; '));
    }
    expect(expression.length).toBeGreaterThan(5);
  });

  it('parses set operations without ALL', () => {
    const { ast, diagnostics } = parseSql(
      '(SELECT DISTINCT name FROM Students) UNION (SELECT DISTINCT name FROM Professors)'
    );
    expect(diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    expect(ast?.type).toBe('set');
  });
});

describe('translateSqlToAlgebra', () => {
  const schemas = universitySchemas();

  it('translates selection and projection', () => {
    const result = translateSqlToAlgebra(
      'SELECT DISTINCT student_id FROM Students WHERE gpa > 3.5',
      schemas
    );
    expect(result.success, result.diagnostics.map((d) => d.message).join('; ')).toBe(true);
    expect(result.expression).toMatch(/σ/);
    expect(result.expression).toMatch(/π/);
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
  });

  it('translates natural join pattern', () => {
    const result = translateSqlToAlgebra(
      'SELECT DISTINCT * FROM Students NATURAL JOIN Majors',
      schemas
    );
    expect(result.success).toBe(true);
    expect(result.expression).toMatch(/⋈/);
  });

  it('rejects bag semantics (missing DISTINCT)', () => {
    const result = translateSqlToAlgebra('SELECT student_id FROM Students', schemas);
    expect(result.success).toBe(false);
    expect(result.diagnostics.some((d) => d.message.includes('DISTINCT'))).toBe(true);
  });

  it('rejects UNION ALL', () => {
    const result = translateSqlToAlgebra(
      '(SELECT DISTINCT name FROM Students) UNION ALL (SELECT DISTINCT name FROM Professors)',
      schemas
    );
    expect(result.success).toBe(false);
    expect(result.diagnostics[0]?.message).toMatch(/UNION ALL/i);
  });

  it('rejects ORDER BY', () => {
    const result = translateSqlToAlgebra(
      'SELECT DISTINCT dept_name FROM Departments ORDER BY dept_name',
      schemas
    );
    expect(result.success).toBe(false);
    expect(result.diagnostics.some((d) => d.message.includes('ORDER BY'))).toBe(true);
  });

  it('rejects aggregations', () => {
    const result = translateSqlToAlgebra(
      'SELECT DISTINCT COUNT(*) FROM Students',
      schemas
    );
    expect(result.success).toBe(false);
  });
});
