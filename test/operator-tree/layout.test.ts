import { describe, expect, it } from 'vitest';
import { validateExpression } from '@/lib/engine/validator';
import { universityPreset } from '@/lib/sandbox/presets/university';
import { createSandboxSnapshot } from '@/lib/sandbox/snapshot';
import type { SandboxState } from '@/lib/sandbox/types';
import {
  buildStepIndexByNodeId,
  flattenOperatorTreeRows,
  layoutOperatorTree,
  stepIndexForNodeId,
} from '@/lib/operator-tree';
import { evaluateRaAst } from '@/lib/evaluator/evaluate';

function universitySchemas() {
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

describe('operator tree layout', () => {
  it('assigns unique positions for join and repeated relation references', () => {
    const snapshot = universitySchemas();
    const expression = 'Students ⋈ ( Students ⋈ Majors )';
    const validation = validateExpression(expression, snapshot.schemas);
    expect(validation.valid).toBe(true);
    const layout = layoutOperatorTree(validation.ast!);
    const relationNodes = layout.nodes.filter((n) => n.ast.type === 'relation');
    expect(relationNodes.length).toBe(3);
    const ids = new Set(layout.nodes.map((n) => n.id));
    expect(ids.size).toBe(layout.nodes.length);
    const relationNames = relationNodes.map((n) => (n.ast as { relationName: string }).relationName);
    expect(relationNames.filter((n) => n === 'Students').length).toBe(2);
  });

  it('maps trace steps to stable node ids', () => {
    const snapshot = universitySchemas();
    const expression = 'π student_id ( Students ⋈ Majors )';
    const validation = validateExpression(expression, snapshot.schemas);
    const result = evaluateRaAst({
      ast: validation.ast!,
      relations: snapshot.relations,
      options: { captureTrace: true },
    });
    expect(result.steps?.length).toBeGreaterThan(0);
    const map = buildStepIndexByNodeId(result.steps);
    const rows = flattenOperatorTreeRows(validation.ast!);
    for (const step of result.steps!) {
      expect(map.get(step.nodeId)).toBe(step.stepIndex);
      expect(rows.some((r) => r.nodeId === step.nodeId)).toBe(true);
    }
    const joinRow = rows.find((r) => r.ast.type === 'natural_join');
    expect(joinRow).toBeDefined();
    const idx = stepIndexForNodeId(joinRow!.nodeId, map);
    expect(idx).toBeGreaterThanOrEqual(0);
  });
});
