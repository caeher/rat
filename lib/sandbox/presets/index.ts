import { createId } from '../defaults';
import type { SandboxRelation, SandboxSchemaSet } from '../types';
import { storePreset } from './store';
import type { BundledPreset, BundledPresetId, PresetGuide } from './types';
import { universityPreset } from './university';
import { deepCloneRelations } from './clone';

const PRESETS: Record<BundledPresetId, BundledPreset> = {
  university: universityPreset,
  store: storePreset,
};

export const BUNDLED_PRESET_IDS = Object.keys(PRESETS) as BundledPresetId[];

export function getBundledPreset(id: BundledPresetId): BundledPreset {
  return PRESETS[id];
}

export function getPresetGuide(id: BundledPresetId): PresetGuide {
  return PRESETS[id].guide;
}

/** Fresh editable copy for the sandbox (new ids, bundled data unchanged). */
export function createSchemaSetFromPreset(presetId: BundledPresetId): SandboxSchemaSet {
  const preset = PRESETS[presetId];
  const template = preset.buildSchemaSet();
  return {
    id: createId(),
    name: template.name,
    presetId,
    relations: deepCloneRelations(template.relations),
  };
}

/** Restore relations from bundled preset without touching the bundled template. */
export function restorePresetRelations(presetId: BundledPresetId): SandboxRelation[] {
  const template = PRESETS[presetId].buildSchemaSet();
  return deepCloneRelations(template.relations);
}

export function listBundledPresets(): Array<{ id: BundledPresetId; displayName: string }> {
  return BUNDLED_PRESET_IDS.map((id) => ({
    id,
    displayName: PRESETS[id].displayName,
  }));
}

export function isSchemaSetDirty(set: SandboxSchemaSet, presetId: BundledPresetId): boolean {
  if (set.presetId !== presetId) return true;
  const fresh = createSchemaSetFromPreset(presetId);
  return JSON.stringify(normalizeForCompare(set)) !== JSON.stringify(normalizeForCompare(fresh));
}

function normalizeForCompare(set: SandboxSchemaSet): unknown {
  return {
    name: set.name,
    relations: set.relations.map((r) => ({
      name: r.name,
      attributes: r.attributes,
      rows: r.rows,
    })),
  };
}
