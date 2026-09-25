import type { Attribute, RelationData, RelationSchema, Tuple, TupleValue } from '@/lib/engine/types';
import type { SandboxAttributeType } from './constants';

export interface SandboxAttribute extends Attribute {
  type: SandboxAttributeType;
  nullable: boolean;
}

export interface SandboxRelation {
  id: string;
  name: string;
  attributes: SandboxAttribute[];
  rows: Tuple[];
}

import type { BundledPresetId } from './presets/types';

export interface SandboxSchemaSet {
  id: string;
  name: string;
  relations: SandboxRelation[];
  /** When loaded from a bundled educational preset. */
  presetId?: BundledPresetId;
}

export interface SandboxState {
  schemaSets: SandboxSchemaSet[];
  activeSchemaSetId: string;
  /** Monotonic version bumped on any committed schema/data change (invalidates query results). */
  dataVersion: number;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface SandboxSnapshot {
  version: number;
  schemaSetId: string;
  schemaSetName: string;
  /** Immutable deep copy of relation data keyed by relation name. */
  relations: Record<string, RelationData>;
  /** Immutable schema map for the engine validator/analyzer. */
  schemas: Record<string, RelationSchema>;
  createdAt: number;
}

export type CellDisplayKind = 'null' | 'empty_string' | 'zero' | 'value';

export interface ParsedCellResult {
  ok: true;
  value: TupleValue;
}

export interface ParsedCellError {
  ok: false;
  message: string;
}

export type ParseCellOutcome = ParsedCellResult | ParsedCellError;

export interface DestructiveEffect {
  kind: 'drop_rows' | 'clear_cells' | 'remove_relation';
  relationName: string;
  attributeName?: string;
  affectedRowCount: number;
  detail: string;
}

export interface DestructivePreview {
  effects: DestructiveEffect[];
  requiresConfirmation: boolean;
}
