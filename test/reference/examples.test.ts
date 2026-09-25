import { describe, expect, it } from 'vitest';
import { validateExpression } from '@/lib/engine/validator';
import { evaluateRaAst } from '@/lib/evaluator/evaluate';
import { areRelationsEqual } from '@/lib/engine/contract';
import type { RelationData } from '@/lib/engine/types';
import { buildSnapshotForExamplePreset } from '@/lib/reference/evaluateExample';
import { REFERENCE_EXECUTABLE_EXAMPLES } from '@/lib/reference/examples';

function evalExample(expression: string, snapshot: ReturnType<typeof buildSnapshotForExamplePreset>) {
  const validation = validateExpression(expression, snapshot.schemas);
  expect(validation.valid, validation.diagnostics.map((d) => d.message).join('; ')).toBe(true);
  expect(validation.ast).toBeDefined();
  return evaluateRaAst({ ast: validation.ast!, relations: snapshot.relations });
}

function relationFromResult(
  result: ReturnType<typeof evaluateRaAst>,
  expectedColumns: string[]
): RelationData | null {
  if (!result.success || !result.relation || !result.schema) return null;
  const tuples = result.relation.tuples.map((tuple) => {
    const row: Record<string, typeof tuple[string]> = {};
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

describe('reference executable examples', () => {
  for (const example of REFERENCE_EXECUTABLE_EXAMPLES) {
    it(`evaluates ${example.id} under documented semantics`, () => {
      const snapshot = buildSnapshotForExamplePreset(example.preset);
      const result = evalExample(example.expression, snapshot);
      expect(result.success, result.error ?? result.diagnostics[0]?.message).toBe(true);

      const actual = relationFromResult(result, example.expectedColumns);
      expect(actual).not.toBeNull();

      const expected: RelationData = {
        schema: actual!.schema,
        tuples: example.expectedTuples,
      };

      expect(areRelationsEqual(actual!, expected)).toBe(true);
    });
  }
});
