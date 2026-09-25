import type { SandboxSchemaSet } from '../types';

export type BundledPresetId = 'university' | 'store';

export interface StarterQuestion {
  title: string;
  expressionHint: string;
  concept: string;
}

export interface PresetGuide {
  summary: string;
  relationships: string[];
  starterQuestions: StarterQuestion[];
}

export interface BundledPreset {
  id: BundledPresetId;
  displayName: string;
  guide: PresetGuide;
  /** Immutable template; never mutated at runtime. */
  buildSchemaSet: () => Omit<SandboxSchemaSet, 'id'> & { presetId: BundledPresetId };
}
