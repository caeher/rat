import type { OperatorType, TupleValue } from '@/lib/engine/types';
import type { BundledPresetId } from '@/lib/sandbox/presets/types';

export type ExercisePresetId = BundledPresetId | 'lesson';
import type { SandboxAttributeType } from '@/lib/sandbox/constants';
import type { Tuple } from '@/lib/engine/types';

export const EXERCISE_FORMAT_VERSION = '1.0.0' as const;

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface ExerciseRelationTemplate {
  name: string;
  attributes: Array<{ name: string; type: SandboxAttributeType; nullable: boolean }>;
  rows: Tuple[];
}

export type ExerciseDataset =
  | { kind: 'preset'; presetId: ExercisePresetId }
  | {
      kind: 'embedded';
      schemaSetName: string;
      relations: ExerciseRelationTemplate[];
    };

export interface ExerciseHint {
  order: number;
  text: string;
}

export interface Exercise {
  formatVersion: typeof EXERCISE_FORMAT_VERSION;
  id: string;
  title: string;
  difficulty: ExerciseDifficulty;
  learningObjectives: string[];
  /** Human-readable prerequisites (exercise ids or concepts). */
  prerequisites: string[];
  operators: OperatorType[];
  dataset: ExerciseDataset;
  prompt: string;
  referenceExpression: string;
  expectedColumns: string[];
  expectedTuples: Record<string, TupleValue>[];
  hints: ExerciseHint[];
  explanation: string;
}

export type ExerciseGradeStatus = 'correct' | 'incorrect' | 'invalid';

export interface ExerciseGradeResult {
  status: ExerciseGradeStatus;
  message: string;
  /** Present when incorrect but evaluable. */
  onlyInYourResult?: Record<string, TupleValue>[];
  onlyInExpected?: Record<string, TupleValue>[];
  rowCountYours?: number;
  rowCountExpected?: number;
}
