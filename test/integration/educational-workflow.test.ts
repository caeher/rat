import { describe, expect, it } from 'vitest';
import { parseCsvText } from '@/lib/sandbox/csv/parseCsv';
import { validateCsvImport, buildDefaultMappings } from '@/lib/sandbox/csv/validateImport';
import { inferColumnTypes } from '@/lib/sandbox/csv/inferTypes';
import { universityPreset } from '@/lib/sandbox/presets/university';
import { createSandboxSnapshot } from '@/lib/sandbox/snapshot';
import type { SandboxState } from '@/lib/sandbox/types';
import { validateExpression } from '@/lib/engine/validator';
import { evaluateRaAst } from '@/lib/evaluator/evaluate';
import { transpileRaAst } from '@/lib/sql';
import { runAlgebraSqlParity } from '../sql/runtime/helpers';
import { buildStepIndexByNodeId, stepIndexForNodeId } from '@/lib/operator-tree/sync';
import { serializeRelationToCsv } from '@/lib/sandbox/csv/exportCsv';
import { gradeAlgebraQuizAttempt } from '@/lib/quiz/grade-algebra';
import { getExercise } from '@/lib/exercises/catalog';
import {
  createSharePayload,
  validateSharePayload,
  cloneSandboxStateWithFreshIds,
} from '@/lib/share';
import {
  createDefaultWorkspaceDocument,
  loadWorkspaceDocument,
  saveWorkspaceDocument,
  usePersistenceBackendForTests,
} from '@/lib/persistence/client';
import { MemoryPersistenceBackend } from '@/lib/persistence/memory-backend';
import { sandboxReducer } from '@/lib/sandbox/reducer';
import { createInitialSandboxState } from '@/lib/sandbox/defaults';

describe('educational workflow integration', () => {
  it('runs a full learner session through core APIs', async () => {
    usePersistenceBackendForTests(new MemoryPersistenceBackend());

    let sandbox = createInitialSandboxState();
    sandbox = sandboxReducer(sandbox, { type: 'LOAD_PRESET', presetId: 'university' });
    expect(sandbox.schemaSets.some((set) => set.presetId === 'university')).toBe(true);

    const csv = parseCsvText('tag,score\nA,10\nB,20');
    const guesses = inferColumnTypes(csv.rows, csv.headers.length);
    const mappings = buildDefaultMappings(csv.headers, guesses);
    mappings[1].type = 'number';
    const imported = validateCsvImport(csv.headers, csv.rows, mappings, 'Tags');
    expect(imported.ok).toBe(true);

    const preset = universityPreset.buildSchemaSet();
    const state: SandboxState = {
      schemaSets: [{ ...preset, id: 'uni' }],
      activeSchemaSetId: 'uni',
      dataVersion: 1,
    };
    const snapshot = createSandboxSnapshot(state);
    expect(snapshot).toBeTruthy();

    const expression = 'π student_id, name ( σ student_id < 3 ( Students ) )';
    const validation = validateExpression(expression, snapshot!.schemas);
    expect(validation.valid, validation.diagnostics.map((d) => d.message).join('; ')).toBe(true);

    const evaluated = evaluateRaAst({
      ast: validation.ast!,
      relations: snapshot!.relations,
      options: { captureTrace: true },
    });
    expect(evaluated.success).toBe(true);
    expect(evaluated.relation?.tuples.length).toBeGreaterThan(0);

    const stepMap = buildStepIndexByNodeId(evaluated.steps);
    const firstStepNode = evaluated.steps?.[0]?.nodeId;
    if (firstStepNode) {
      expect(stepIndexForNodeId(firstStepNode, stepMap)).toBe(0);
    }

    const transpiled = transpileRaAst(validation.ast!, snapshot!.schemas);
    expect(transpiled.success).toBe(true);

    const parity = await runAlgebraSqlParity(expression);
    expect(parity.status).toBe('match');

    const csvOut = serializeRelationToCsv(evaluated.relation!.schema, evaluated.relation!.tuples);
    expect(csvOut.csv).toContain('student_id');

    const exercise = getExercise('ex-begin-projection');
    expect(gradeAlgebraQuizAttempt('π dept_name ( Departments )', exercise!).status).toBe('correct');

    const doc = createDefaultWorkspaceDocument();
    doc.expression = expression;
    doc.sandbox = sandbox;
    const saved = await saveWorkspaceDocument(doc);
    expect(saved.ok).toBe(true);
    const reloaded = await loadWorkspaceDocument();
    expect(reloaded.document.expression).toBe(expression);

    const payload = createSharePayload(expression, cloneSandboxStateWithFreshIds(sandbox));
    const roundTrip = validateSharePayload(structuredClone(payload));
    expect(roundTrip.expression).toBe(expression);
  });
});
