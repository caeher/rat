import { createSampleSchemaSet, createId } from '@/lib/sandbox/defaults';
import { createSchemaSetFromPreset } from '@/lib/sandbox/presets';
import { createSandboxSnapshot } from '@/lib/sandbox/snapshot';
import type { ReferenceExamplePreset } from './types';

export function buildSnapshotForExamplePreset(preset: ReferenceExamplePreset) {
  if (preset === 'lesson') {
    const schemaSet = createSampleSchemaSet();
    schemaSet.id = createId();
    const state = {
      schemaSets: [schemaSet],
      activeSchemaSetId: schemaSet.id,
      dataVersion: 1,
    };
    const snapshot = createSandboxSnapshot(state);
    if (!snapshot) throw new Error('lesson snapshot missing');
    return snapshot;
  }

  const schemaSet = createSchemaSetFromPreset(preset);
  const state = {
    schemaSets: [schemaSet],
    activeSchemaSetId: schemaSet.id,
    dataVersion: 1,
  };
  const snapshot = createSandboxSnapshot(state);
  if (!snapshot) throw new Error(`${preset} snapshot missing`);
  return snapshot;
}
