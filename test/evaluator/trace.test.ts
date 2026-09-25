import { describe, expect, it } from 'vitest';
import { validateExpression } from '@/lib/engine/validator';
import { evaluateRaAst } from '@/lib/evaluator/evaluate';
import { createSandboxSnapshot } from '@/lib/sandbox/snapshot';
import { universityPreset } from '@/lib/sandbox/presets/university';
import type { SandboxState } from '@/lib/sandbox/types';
import {
  activeTraceStep,
  createTraceNavigation,
  traceGoPrevious,
  traceGoNext,
} from '@/lib/evaluator/traceNavigation';
import { EVALUATION_LIMITS } from '@/lib/evaluator/limits';

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

describe('evaluation trace', () => {
  const snapshot = universitySnapshot();

  it('records postorder steps for nested selection, projection, and join', () => {
    const expression =
      'π student_id, major_name ( σ major_id IS NOT NULL ( Students ⋈ Majors ) )';
    const validation = validateExpression(expression, snapshot.schemas);
    expect(validation.valid).toBe(true);
    const result = evaluateRaAst({
      ast: validation.ast!,
      relations: snapshot.relations,
      options: { captureTrace: true },
    });
    expect(result.success).toBe(true);
    expect(result.steps?.length).toBeGreaterThanOrEqual(4);
    const operators = result.steps!.map((s) => s.operator);
    expect(operators).toContain('relation');
    expect(operators).toContain('natural_join');
    expect(operators).toContain('selection');
    expect(operators).toContain('projection');
    const joinIndex = operators.indexOf('natural_join');
    const selectionIndex = operators.indexOf('selection');
    const projectionIndex = operators.indexOf('projection');
    expect(joinIndex).toBeLessThan(selectionIndex);
    expect(selectionIndex).toBeLessThan(projectionIndex);
  });

  it('final trace step matches normal evaluation output', () => {
    const expression = 'π name ( Students )';
    const validation = validateExpression(expression, snapshot.schemas);
    const withoutTrace = evaluateRaAst({
      ast: validation.ast!,
      relations: snapshot.relations,
    });
    const withTrace = evaluateRaAst({
      ast: validation.ast!,
      relations: snapshot.relations,
      options: { captureTrace: true },
    });
    const lastStep = withTrace.steps?.[withTrace.steps!.length - 1];
    expect(lastStep?.outputTupleCount).toBe(withoutTrace.relation?.tuples.length);
    expect(lastStep?.outputRelation.tuples).toEqual(withoutTrace.relation?.tuples);
  });

  it('navigation backward restores prior step output', () => {
    const expression = 'π name ( σ student_id > 2 ( Students ) )';
    const validation = validateExpression(expression, snapshot.schemas);
    const result = evaluateRaAst({
      ast: validation.ast!,
      relations: snapshot.relations,
      options: { captureTrace: true },
    });
    const steps = result.steps!;
    let nav = createTraceNavigation(steps.length, steps.length - 1);
    const finalStep = activeTraceStep(steps, nav.stepIndex);
    nav = traceGoPrevious(nav);
    const priorStep = activeTraceStep(steps, nav.stepIndex);
    expect(finalStep?.outputTupleCount).toBe(priorStep?.outputTupleCount);
    expect(finalStep?.outputSchema.attributes.length).toBeLessThan(
      priorStep?.outputSchema.attributes.length ?? 0
    );
    nav = traceGoNext(nav);
    expect(activeTraceStep(steps, nav.stepIndex)?.outputRelation.tuples).toEqual(
      finalStep?.outputRelation.tuples
    );
  });

  it('marks preview limited when intermediate exceeds trace preview cap', () => {
    const wide: typeof snapshot.relations = {
      Wide: {
        schema: { name: 'Wide', attributes: [{ name: 'id', type: 'number' }] },
        tuples: Array.from({ length: EVALUATION_LIMITS.maxTracePreviewRows + 5 }, (_, i) => ({
          id: i,
        })),
      },
    };
    const schemas = { Wide: wide.Wide.schema };
    const validation = validateExpression('Wide', schemas);
    const result = evaluateRaAst({
      ast: validation.ast!,
      relations: wide,
      options: { captureTrace: true, maxTracePreviewRows: 10 },
    });
    const relationStep = result.steps?.find((s) => s.operator === 'relation');
    expect(relationStep?.outputPreviewLimited).toBe(true);
    expect(relationStep?.outputRelation.tuples.length).toBe(10);
    expect(relationStep?.outputTupleCount).toBe(EVALUATION_LIMITS.maxTracePreviewRows + 5);
  });

  it('returns partial trace and failed node on runtime error', () => {
    const validation = validateExpression('Students ⨯ Students', snapshot.schemas);
    const result = evaluateRaAst({
      ast: validation.ast!,
      relations: snapshot.relations,
      options: { captureTrace: true, maxIntermediateRows: 5 },
    });
    expect(result.success).toBe(false);
    expect(result.steps?.length).toBeGreaterThan(0);
    expect(result.nodeId).toBeDefined();
  });
});
