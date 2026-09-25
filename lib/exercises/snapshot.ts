import { createId, createSampleSchemaSet } from '@/lib/sandbox/defaults';
import { createSchemaSetFromPreset } from '@/lib/sandbox/presets';
import { relationFromTemplate } from '@/lib/sandbox/presets/clone';
import { createSandboxSnapshot } from '@/lib/sandbox/snapshot';
import type { SandboxSchemaSet } from '@/lib/sandbox/types';
import type { Exercise, ExerciseDataset } from './types';

export function buildSchemaSetFromDataset(
  dataset: ExerciseDataset,
  exerciseId: string
): SandboxSchemaSet {
  if (dataset.kind === 'preset') {
    if (dataset.presetId === 'lesson') {
      const lesson = createSampleSchemaSet();
      lesson.id = createId();
      return { ...lesson, exerciseId };
    }
    const set = createSchemaSetFromPreset(dataset.presetId);
    return { ...set, exerciseId };
  }

  return {
    id: createId(),
    name: dataset.schemaSetName,
    relations: dataset.relations.map((rel) => relationFromTemplate(rel)),
    exerciseId,
  };
}

export function buildSnapshotForExercise(exercise: Exercise) {
  const schemaSet = buildSchemaSetFromDataset(exercise.dataset, exercise.id);
  const state = {
    schemaSets: [schemaSet],
    activeSchemaSetId: schemaSet.id,
    dataVersion: 1,
  };
  const snapshot = createSandboxSnapshot(state);
  if (!snapshot) throw new Error(`snapshot missing for exercise ${exercise.id}`);
  return snapshot;
}
