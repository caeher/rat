import { describe, expect, it } from 'vitest';
import { validateExpression } from '@/lib/engine/validator';
import { evaluateRaAst } from '@/lib/evaluator/evaluate';
import type { RelationData, RelationSchema } from '@/lib/engine/types';
import { areRelationsEqual, tupleToKey } from '@/lib/engine/contract';
import { createSandboxSnapshot } from '@/lib/sandbox/snapshot';
import { universityPreset } from '@/lib/sandbox/presets/university';
import type { SandboxState } from '@/lib/sandbox/types';

function buildUniversitySnapshot() {
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

function evalExpr(
  expression: string,
  relations: Record<string, RelationData>,
  schemas: Record<string, RelationSchema>
) {
  const validation = validateExpression(expression, schemas);
  expect(validation.valid, validation.diagnostics.map((d) => d.message).join('; ')).toBe(true);
  expect(validation.ast).toBeDefined();
  return evaluateRaAst({ ast: validation.ast!, relations });
}

describe('RA browser evaluator', () => {
  const snapshot = buildUniversitySnapshot();

  it('evaluates selection with NULL filter (3VL)', () => {
    const result = evalExpr(
      'π student_id, name ( σ major_id IS NULL ( Students ) )',
      snapshot.relations,
      snapshot.schemas
    );
    expect(result.success).toBe(true);
    expect(result.relation?.tuples).toEqual([{ student_id: 4, name: 'Nikola Tesla' }]);
  });

  it('eliminates duplicates in projection', () => {
    const result = evalExpr('π name ( Students )', snapshot.relations, snapshot.schemas);
    expect(result.success).toBe(true);
    expect(result.relation?.tuples.length).toBe(5);
  });

  it('natural join on major_id', () => {
    const result = evalExpr(
      'π student_id, major_name ( Students ⋈ Majors )',
      snapshot.relations,
      snapshot.schemas
    );
    expect(result.success).toBe(true);
    const names = result.relation?.tuples.map((t) => t.major_name).sort();
    expect(names).toEqual(['Computer Science', 'Computer Science', 'Mathematics', 'Physics']);
  });

  it('left outer join preserves unmatched left tuples', () => {
    const result = evalExpr(
      'π student_id, major_name ( Students ⟕ Majors )',
      snapshot.relations,
      snapshot.schemas
    );
    expect(result.success).toBe(true);
    const tesla = result.relation?.tuples.find((t) => t.student_id === 4);
    expect(tesla?.major_name).toBeNull();
  });

  it('union combines distinct tuples with union-compatible schemas', () => {
    const result = evalExpr(
      '( π name ( Students ) ) ∪ ( π name ( Professors ) )',
      snapshot.relations,
      snapshot.schemas
    );
    expect(result.success).toBe(true);
    expect(result.relation?.tuples.length).toBeGreaterThan(5);
  });

  it('intersection obeys set semantics', () => {
    const result = evalExpr(
      'π student_id ( σ course_id = 101 ( Enrolled ) ) ∩ π student_id ( σ course_id = 102 ( Enrolled ) )',
      snapshot.relations,
      snapshot.schemas
    );
    expect(result.success).toBe(true);
    expect(result.relation?.tuples).toEqual([{ student_id: 1 }, { student_id: 2 }]);
  });

  it('difference removes matching tuples', () => {
    const result = evalExpr(
      'π student_id ( Enrolled ) − π student_id ( σ course_id = 999 ( Enrolled ) )',
      snapshot.relations,
      snapshot.schemas
    );
    expect(result.success).toBe(true);
    expect(result.relation?.tuples.some((t) => t.student_id === 4)).toBe(false);
  });

  it('relational division with empty divisor yields π_X(R)', () => {
    const emptyDivisor: RelationData = {
      schema: { name: 'Empty', attributes: [] },
      tuples: [],
    };
    const relations = { ...snapshot.relations, Empty: emptyDivisor };
    const schemas = { ...snapshot.schemas, Empty: emptyDivisor.schema };
    const result = evalExpr('π student_id ( Enrolled ) ÷ Empty', relations, schemas);
    expect(result.success).toBe(true);
    const projected = evalExpr('π student_id ( Enrolled )', relations, schemas);
    expect(areRelationsEqual(result.relation!, projected.relation!)).toBe(true);
  });

  it('rejects explosive Cartesian products with E_RUNTIME_LIMIT', () => {
    const wideA: RelationData = {
      schema: {
        name: 'WideA',
        attributes: [{ name: 'id', type: 'number' }],
      },
      tuples: Array.from({ length: 200 }, (_, i) => ({ id: i })),
    };
    const wideB: RelationData = {
      schema: {
        name: 'WideB',
        attributes: [{ name: 'id', type: 'number' }],
      },
      tuples: Array.from({ length: 200 }, (_, i) => ({ id: i + 1000 })),
    };
    const relations = { WideA: wideA, WideB: wideB };
    const schemas = { WideA: wideA.schema, WideB: wideB.schema };
    const validation = validateExpression('WideA ⨯ WideB', schemas);
    const result = evaluateRaAst({
      ast: validation.ast!,
      relations,
      options: { maxIntermediateRows: 1000 },
    });
    expect(result.success).toBe(false);
    expect(result.diagnostics[0]?.code).toBe('E_RUNTIME_LIMIT');
  });

  it('attribute rename preserves values', () => {
    const result = evalExpr(
      'π employee_name ( ρ[name -> employee_name](Students) )',
      snapshot.relations,
      snapshot.schemas
    );
    expect(result.success).toBe(true);
    expect(result.relation?.tuples[0]?.employee_name).toBe('Ada Lovelace');
  });

  it('handles empty dividend in division', () => {
    const result = evalExpr(
      'Enrolled ÷ π course_id ( Courses )',
      snapshot.relations,
      snapshot.schemas
    );
    expect(result.success).toBe(true);
    expect(result.relation?.tuples).toEqual([]);
  });
});

describe('duplicate elimination semantics', () => {
  it('treats NULL as equal for set membership', () => {
    const rel: RelationData = {
      schema: {
        name: 'R',
        attributes: [{ name: 'a', type: 'number' }, { name: 'b', type: 'null', nullable: true }],
      },
      tuples: [
        { a: 1, b: null },
        { a: 1, b: null },
      ],
    };
    const validation = validateExpression('R', { R: rel.schema });
    const result = evaluateRaAst({ ast: validation.ast!, relations: { R: rel } });
    expect(result.relation?.tuples.length).toBe(1);
    expect(tupleToKey(result.relation!.tuples[0], result.relation!.schema)).toContain('NULL');
  });
});
