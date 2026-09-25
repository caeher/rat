import { describe, expect, it } from 'vitest';
import { validateExpression } from '@/lib/engine/validator';
import { evaluateRaAst } from '@/lib/evaluator/evaluate';
import { createSandboxSnapshot } from '@/lib/sandbox/snapshot';
import { universityPreset } from '@/lib/sandbox/presets/university';
import type { SandboxState } from '@/lib/sandbox/types';
import {
  buildStepIndexByNodeId,
  nodeIdForStepIndex,
  stepIndexForNodeId,
} from '@/lib/operator-tree/sync';

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

describe('operator tree step sync', () => {
  it('maps trace steps to stable node ids for UI sync', () => {
    const snapshot = universitySnapshot();
    const expression = 'π name ( σ student_id < 3 ( Students ) )';
    const validation = validateExpression(expression, snapshot.schemas);
    const result = evaluateRaAst({
      ast: validation.ast!,
      relations: snapshot.relations,
      options: { captureTrace: true },
    });
    expect(result.steps?.length).toBeGreaterThan(0);
    const map = buildStepIndexByNodeId(result.steps);
    for (const step of result.steps!) {
      expect(stepIndexForNodeId(step.nodeId, map)).toBe(step.stepIndex);
    }
    expect(nodeIdForStepIndex(result.steps, 0)).toBe(result.steps![0].nodeId);
    expect(nodeIdForStepIndex(result.steps, result.steps!.length - 1)).toBe(
      result.steps![result.steps!.length - 1].nodeId
    );
  });
});
