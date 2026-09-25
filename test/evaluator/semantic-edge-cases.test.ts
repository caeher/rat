import { describe, expect, it } from 'vitest';
import { validateExpression } from '@/lib/engine/validator';
import { evaluateRaAst } from '@/lib/evaluator/evaluate';
import type { RelationData } from '@/lib/engine/types';
import { createSandboxSnapshot } from '@/lib/sandbox/snapshot';
import { universityPreset } from '@/lib/sandbox/presets/university';
import type { SandboxState } from '@/lib/sandbox/types';

function universitySnapshot() {
  const schemaSet = universityPreset.buildSchemaSet();
  const state: SandboxState = {
    schemaSets: [{ ...schemaSet, id: 'uni' }],
    activeSchemaSetId: 'uni',
    dataVersion: 1,
  };
  const snapshot = createSandboxSnapshot(state);
  if (!snapshot) throw new Error('snapshot missing');
  return snapshot;
}

describe('semantic edge cases', () => {
  const snapshot = universitySnapshot();

  it('rejects union of incompatible attribute types at analysis time', () => {
    const validation = validateExpression(
      '( π student_id ( Students ) ) ∪ ( π name ( Students ) )',
      snapshot.schemas
    );
    expect(validation.valid).toBe(false);
    expect(
      validation.diagnostics.some((d) => d.code === 'E_UNION_INCOMPATIBLE_TYPE')
    ).toBe(true);
  });

  it('evaluates nested natural join inside selection and projection', () => {
    const expression =
      'π student_id, major_name ( σ major_id IS NOT NULL ( Students ⋈ Majors ) )';
    const validation = validateExpression(expression, snapshot.schemas);
    expect(validation.valid, validation.diagnostics.map((d) => d.message).join('; ')).toBe(true);
    const result = evaluateRaAst({ ast: validation.ast!, relations: snapshot.relations });
    expect(result.success).toBe(true);
    expect(result.relation?.tuples.length).toBeGreaterThan(0);
  });

  it('returns empty relation for selection on empty operand', () => {
    const empty: RelationData = {
      schema: {
        name: 'EmptyStudents',
        attributes: [{ name: 'student_id', type: 'number' }],
      },
      tuples: [],
    };
    const relations = { ...snapshot.relations, EmptyStudents: empty };
    const schemas = { ...snapshot.schemas, EmptyStudents: empty.schema };
    const validation = validateExpression('σ student_id > 0 ( EmptyStudents )', schemas);
    const result = evaluateRaAst({ ast: validation.ast!, relations });
    expect(result.success).toBe(true);
    expect(result.relation?.tuples).toEqual([]);
  });

  it('handles division when divisor is empty (projects dividend keys)', () => {
    const emptyCourses: RelationData = {
      schema: { name: 'NoCourses', attributes: [{ name: 'course_id', type: 'number' }] },
      tuples: [],
    };
    const relations = { ...snapshot.relations, NoCourses: emptyCourses };
    const schemas = { ...snapshot.schemas, NoCourses: emptyCourses.schema };
    const validation = validateExpression('Enrolled ÷ NoCourses', schemas);
    const result = evaluateRaAst({ ast: validation.ast!, relations });
    expect(result.success).toBe(true);
    expect(result.relation?.tuples.length).toBeGreaterThan(0);
  });

  it('preserves duplicate-free projection over nested join', () => {
    const expression = 'π major_name ( Students ⋈ Majors )';
    const validation = validateExpression(expression, snapshot.schemas);
    const result = evaluateRaAst({ ast: validation.ast!, relations: snapshot.relations });
    expect(result.success).toBe(true);
    const names = result.relation?.tuples.map((t) => t.major_name);
    expect(new Set(names).size).toBe(names?.length);
  });
});
