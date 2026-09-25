import { describe, expect, it } from 'vitest';
import { validateExpression } from '@/lib/engine/validator';
import { transpileRaAst, transpileExpression, toExecutableSql } from '@/lib/sql';
import { createSandboxSnapshot } from '@/lib/sandbox/snapshot';
import { universityPreset } from '@/lib/sandbox/presets/university';
import type { RelationData } from '@/lib/engine/types';
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
  return { schemas: snapshot.schemas, relations: snapshot.relations };
}

function transpile(expr: string, schemas: Record<string, unknown>) {
  const validation = validateExpression(expr, schemas as never);
  expect(validation.valid, validation.diagnostics.map((d) => d.message).join('; ')).toBe(true);
  return transpileRaAst(validation.ast!, schemas as never);
}

describe('SQL transpilation (SQLite 3.39+)', () => {
  const { schemas } = universitySchemas();

  it('generates selection and projection with DISTINCT', () => {
    const result = transpile('π student_id, major_name ( Students ⋈ Majors )', schemas);
    expect(result.success).toBe(true);
    expect(result.sql).toMatch(/SELECT DISTINCT/i);
    expect(result.sql).toMatch(/NATURAL JOIN/i);
  });

  it('binds predicate literals as parameters', () => {
    const result = transpile('σ student_id > 2 ( Students )', schemas);
    expect(result.success).toBe(true);
    expect(result.sql).toMatch(/WHERE/i);
    expect(result.sql).toContain('?');
    expect(result.parameters.length).toBeGreaterThan(0);
    const executable = toExecutableSql(result.sql!, result.parameters);
    expect(executable).toContain('2');
    expect(executable).not.toContain('?');
  });

  it('escapes string literals in executable copy', () => {
    const result = transpile('σ name = "O\'Reilly" ( Students )', schemas);
    const executable = toExecutableSql(result.sql!, result.parameters);
    expect(executable).toContain("O''Reilly");
  });

  it('maps set operators to UNION / INTERSECT / EXCEPT', () => {
    const union = transpile('( π name ( Students ) ) ∪ ( π name ( Professors ) )', schemas);
    expect(union.sql).toMatch(/UNION/i);

    const intersect = transpile(
      'π student_id ( σ course_id = 101 ( Enrolled ) ) ∩ π student_id ( σ course_id = 102 ( Enrolled ) )',
      schemas
    );
    expect(intersect.sql).toMatch(/INTERSECT/i);

    const diff = transpile(
      'π student_id ( Enrolled ) − π student_id ( σ course_id = 999 ( Enrolled ) )',
      schemas
    );
    expect(diff.sql).toMatch(/EXCEPT/i);
  });

  it('uses outer join variants', () => {
    const left = transpile('Students ⟕ Majors', schemas);
    expect(left.sql).toMatch(/LEFT OUTER JOIN/i);

    const full = transpile('Students ⟗ Majors', schemas);
    expect(full.sql).toMatch(/FULL OUTER JOIN/i);
  });

  it('rewrites division with NOT EXISTS', () => {
    const result = transpile('Enrolled ÷ π course_id ( Courses )', schemas);
    expect(result.success).toBe(true);
    expect(result.sql).toMatch(/NOT EXISTS/i);
    expect(result.mappings.some((m) => m.label === '÷')).toBe(true);
  });

  it('handles empty divisor as projection on quotient', () => {
    const emptyDivisor: RelationData = {
      schema: { name: 'Empty', attributes: [] },
      tuples: [],
    };
    const extendedSchemas = { ...schemas, Empty: emptyDivisor.schema };
    const result = transpile('π student_id ( Enrolled ) ÷ Empty', extendedSchemas);
    expect(result.success).toBe(true);
    expect(result.sql).not.toMatch(/NOT EXISTS/i);
    expect(result.sql).toMatch(/student_id/i);
  });

  it('supports attribute rename', () => {
    const result = transpile('π employee_name ( ρ[name -> employee_name](Students) )', schemas);
    expect(result.success).toBe(true);
    expect(result.sql).toMatch(/AS employee_name/i);
  });

  it('returns errors for incompatible division instead of approximate SQL', () => {
    const validation = validateExpression('Enrolled ÷ Majors', schemas);
    expect(validation.valid).toBe(false);
    const result = validation.ast
      ? transpileRaAst(validation.ast, schemas)
      : transpileExpression('Enrolled ÷ Majors', schemas);
    expect(result.success).toBe(false);
    expect(result.diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });

  it('includes AST-to-SQL mappings for operators', () => {
    const result = transpile('σ major_id IS NULL ( Students )', schemas);
    expect(result.mappings.length).toBeGreaterThan(0);
    expect(result.mappings.some((m) => m.operator === 'selection')).toBe(true);
  });
});
