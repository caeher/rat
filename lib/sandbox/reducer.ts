import { SANDBOX_LIMITS } from './constants';
import { createEmptyRelation, createId, createSampleSchemaSet } from './defaults';
import { findDuplicateNames, validateIdentifier } from './identifiers';
import {
  applyAttributeTypeChange,
  previewChangeAttributeType,
  previewDeleteRelation,
  previewRemoveAttribute,
} from './destructive';
import type {
  FieldError,
  SandboxRelation,
  SandboxSchemaSet,
  SandboxState,
} from './types';
import type { SandboxAttributeType } from './constants';
import type { Tuple } from '@/lib/engine/types';
import { createSchemaSetFromPreset, restorePresetRelations } from './presets';
import type { BundledPresetId } from './presets/types';

export type SandboxAction =
  | { type: 'SET_ACTIVE_SCHEMA_SET'; id: string }
  | { type: 'CREATE_SCHEMA_SET'; name?: string }
  | { type: 'RENAME_SCHEMA_SET'; id: string; name: string }
  | { type: 'DUPLICATE_SCHEMA_SET'; id: string }
  | { type: 'DELETE_SCHEMA_SET'; id: string }
  | { type: 'CREATE_RELATION'; name?: string }
  | { type: 'RENAME_RELATION'; relationId: string; name: string }
  | { type: 'DUPLICATE_RELATION'; relationId: string }
  | { type: 'DELETE_RELATION'; relationId: string }
  | { type: 'ADD_ATTRIBUTE'; relationId: string; name?: string }
  | { type: 'UPDATE_ATTRIBUTE'; relationId: string; attributeName: string; patch: Partial<{ name: string; type: SandboxAttributeType; nullable: boolean }> }
  | { type: 'CONFIRM_UPDATE_ATTRIBUTE'; relationId: string; attributeName: string; patch: { name: string; type: SandboxAttributeType; nullable: boolean } }
  | { type: 'REMOVE_ATTRIBUTE'; relationId: string; attributeName: string }
  | { type: 'CONFIRM_REMOVE_ATTRIBUTE'; relationId: string; attributeName: string }
  | { type: 'ADD_ROW'; relationId: string }
  | { type: 'UPDATE_ROW'; relationId: string; rowIndex: number; row: Tuple }
  | { type: 'DELETE_ROW'; relationId: string; rowIndex: number }
  | { type: 'LOAD_PRESET'; presetId: import('./presets/types').BundledPresetId }
  | { type: 'LOAD_LESSON_SCHEMA' }
  | { type: 'LOAD_EXERCISE_DATASET'; schemaSet: SandboxSchemaSet }
  | { type: 'RESET_PRESET'; schemaSetId: string }
  | {
      type: 'IMPORT_CSV';
      mode: 'new_relation' | 'replace_relation';
      relationId?: string;
      relationName: string;
      attributes: SandboxRelation['attributes'];
      rows: Tuple[];
    }
  | { type: 'REPLACE_SANDBOX_STATE'; state: SandboxState }
  | { type: 'RESTORE_SCHEMA_SET_SNAPSHOT'; schemaSet: SandboxSchemaSet }
  | { type: 'IMPORT_SHARED_SANDBOX'; mode: 'merge' | 'replace'; state: SandboxState };

function bumpVersion(state: SandboxState): SandboxState {
  return { ...state, dataVersion: state.dataVersion + 1 };
}

function getActiveSet(state: SandboxState): SandboxSchemaSet | undefined {
  return state.schemaSets.find((s) => s.id === state.activeSchemaSetId);
}

function updateActiveSet(
  state: SandboxState,
  updater: (set: SandboxSchemaSet) => SandboxSchemaSet
): SandboxState {
  const active = getActiveSet(state);
  if (!active) return state;
  const nextSet = updater(active);
  return bumpVersion({
    ...state,
    schemaSets: state.schemaSets.map((s) => (s.id === active.id ? nextSet : s)),
  });
}

function updateRelation(
  set: SandboxSchemaSet,
  relationId: string,
  updater: (rel: SandboxRelation) => SandboxRelation
): SandboxSchemaSet {
  return {
    ...set,
    relations: set.relations.map((r) => (r.id === relationId ? updater(r) : r)),
  };
}

function uniqueRelationName(set: SandboxSchemaSet, base: string): string {
  const names = new Set(set.relations.map((r) => r.name));
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
}

function uniqueSchemaSetName(state: SandboxState, base: string): string {
  const names = new Set(state.schemaSets.map((s) => s.name));
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base} (${i})`)) i += 1;
  return `${base} (${i})`;
}

export function validateSchemaSetName(name: string, state: SandboxState, excludeId?: string): FieldError | null {
  const idCheck = validateIdentifier(name, 'schema_set', SANDBOX_LIMITS.maxSchemaSetNameLength);
  if (!idCheck.valid) return { field: 'name', message: idCheck.message ?? 'Invalid name.' };
  const duplicate = state.schemaSets.some(
    (s) => s.id !== excludeId && s.name === name.trim()
  );
  if (duplicate) return { field: 'name', message: 'A schema with this name already exists.' };
  return null;
}

export function validateRelationName(
  name: string,
  set: SandboxSchemaSet,
  excludeRelationId?: string
): FieldError | null {
  const idCheck = validateIdentifier(name, 'relation', SANDBOX_LIMITS.maxRelationNameLength);
  if (!idCheck.valid) return { field: 'name', message: idCheck.message ?? 'Invalid name.' };
  const names = set.relations.filter((r) => r.id !== excludeRelationId).map((r) => r.name);
  if (findDuplicateNames(names, name)) {
    return { field: 'name', message: 'A relation with this name already exists in the schema.' };
  }
  return null;
}

export function validateAttributeName(
  name: string,
  relation: SandboxRelation,
  excludeName?: string
): FieldError | null {
  const idCheck = validateIdentifier(name, 'attribute', SANDBOX_LIMITS.maxAttributeNameLength);
  if (!idCheck.valid) return { field: 'name', message: idCheck.message ?? 'Invalid name.' };
  const names = relation.attributes.filter((a) => a.name !== excludeName).map((a) => a.name);
  if (findDuplicateNames(names, name)) {
    return { field: 'name', message: 'Duplicate attribute name in this relation.' };
  }
  return null;
}

export function sandboxReducer(state: SandboxState, action: SandboxAction): SandboxState {
  switch (action.type) {
    case 'SET_ACTIVE_SCHEMA_SET':
      if (!state.schemaSets.some((s) => s.id === action.id)) return state;
      return { ...state, activeSchemaSetId: action.id };

    case 'CREATE_SCHEMA_SET': {
      if (state.schemaSets.length >= SANDBOX_LIMITS.maxSchemaSets) return state;
      const baseName = action.name?.trim() || 'Custom Schema';
      const name = uniqueSchemaSetName(state, baseName);
      const id = createId();
      const newSet: SandboxSchemaSet = {
        id,
        name,
        relations: [createEmptyRelation('Relation1')],
      };
      return bumpVersion({
        ...state,
        schemaSets: [...state.schemaSets, newSet],
        activeSchemaSetId: id,
      });
    }

    case 'RENAME_SCHEMA_SET': {
      const err = validateSchemaSetName(action.name, state, action.id);
      if (err) return state;
      return bumpVersion({
        ...state,
        schemaSets: state.schemaSets.map((s) =>
          s.id === action.id ? { ...s, name: action.name.trim() } : s
        ),
      });
    }

    case 'DUPLICATE_SCHEMA_SET': {
      if (state.schemaSets.length >= SANDBOX_LIMITS.maxSchemaSets) return state;
      const source = state.schemaSets.find((s) => s.id === action.id);
      if (!source) return state;
      const id = createId();
      const copy: SandboxSchemaSet = {
        id,
        name: uniqueSchemaSetName(state, `${source.name} Copy`),
        relations: source.relations.map((r) => ({
          ...r,
          id: createId(),
          attributes: r.attributes.map((a) => ({ ...a })),
          rows: r.rows.map((row) => ({ ...row })),
        })),
      };
      return bumpVersion({
        ...state,
        schemaSets: [...state.schemaSets, copy],
        activeSchemaSetId: id,
      });
    }

    case 'DELETE_SCHEMA_SET': {
      if (state.schemaSets.length <= 1) return state;
      const nextSets = state.schemaSets.filter((s) => s.id !== action.id);
      const activeId =
        state.activeSchemaSetId === action.id ? nextSets[0].id : state.activeSchemaSetId;
      return bumpVersion({ ...state, schemaSets: nextSets, activeSchemaSetId: activeId });
    }

    case 'CREATE_RELATION':
      return updateActiveSet(state, (set) => {
        if (set.relations.length >= SANDBOX_LIMITS.maxRelationsPerSet) return set;
        const name = uniqueRelationName(set, action.name?.trim() || 'NewRelation');
        return {
          ...set,
          relations: [...set.relations, createEmptyRelation(name)],
        };
      });

    case 'RENAME_RELATION':
      return updateActiveSet(state, (set) => {
        const err = validateRelationName(action.name, set, action.relationId);
        if (err) return set;
        return updateRelation(set, action.relationId, (r) => ({
          ...r,
          name: action.name.trim(),
        }));
      });

    case 'DUPLICATE_RELATION':
      return updateActiveSet(state, (set) => {
        if (set.relations.length >= SANDBOX_LIMITS.maxRelationsPerSet) return set;
        const source = set.relations.find((r) => r.id === action.relationId);
        if (!source) return set;
        const name = uniqueRelationName(set, `${source.name}_copy`);
        const copy: SandboxRelation = {
          ...source,
          id: createId(),
          name,
          attributes: source.attributes.map((a) => ({ ...a })),
          rows: source.rows.map((row) => ({ ...row })),
        };
        return { ...set, relations: [...set.relations, copy] };
      });

    case 'DELETE_RELATION':
      return updateActiveSet(state, (set) => {
        if (set.relations.length <= 1) return set;
        return {
          ...set,
          relations: set.relations.filter((r) => r.id !== action.relationId),
        };
      });

    case 'ADD_ATTRIBUTE':
      return updateActiveSet(state, (set) =>
        updateRelation(set, action.relationId, (rel) => {
          if (rel.attributes.length >= SANDBOX_LIMITS.maxAttributesPerRelation) return rel;
          const base = action.name?.trim() || 'attr';
          let name = base;
          let i = 1;
          while (rel.attributes.some((a) => a.name === name)) {
            name = `${base}_${i}`;
            i += 1;
          }
          return {
            ...rel,
            attributes: [...rel.attributes, { name, type: 'string', nullable: true }],
            rows: rel.rows.map((row) => ({ ...row, [name]: null })),
          };
        })
      );

    case 'UPDATE_ATTRIBUTE':
      // Non-destructive patches only (name) go through reducer; type/nullable need confirmation via CONFIRM_
      return state;

    case 'CONFIRM_UPDATE_ATTRIBUTE':
      return updateActiveSet(state, (set) =>
        updateRelation(set, action.relationId, (rel) => {
          const err = validateAttributeName(action.patch.name, rel, action.attributeName);
          if (err) return rel;

          let next = rel;
          if (action.patch.name !== action.attributeName) {
            next = {
              ...next,
              attributes: next.attributes.map((a) =>
                a.name === action.attributeName ? { ...a, name: action.patch.name } : a
              ),
              rows: next.rows.map((row) => {
                if (!(action.attributeName in row)) return row;
                const { [action.attributeName]: val, ...rest } = row;
                return { ...rest, [action.patch.name]: val };
              }),
            };
          }

          const targetName = action.patch.name;
          return applyAttributeTypeChange(
            next,
            targetName,
            action.patch.type,
            action.patch.nullable
          );
        })
      );

    case 'REMOVE_ATTRIBUTE':
      return state;

    case 'CONFIRM_REMOVE_ATTRIBUTE':
      return updateActiveSet(state, (set) =>
        updateRelation(set, action.relationId, (rel) => {
          const preview = previewRemoveAttribute(rel, action.attributeName);
          if (!preview.requiresConfirmation && rel.attributes.length <= 1) return rel;
          if (rel.attributes.length <= 1) return rel;
          return {
            ...rel,
            attributes: rel.attributes.filter((a) => a.name !== action.attributeName),
            rows: rel.rows.map((row) => {
              const next = { ...row };
              delete next[action.attributeName];
              return next;
            }),
          };
        })
      );

    case 'ADD_ROW':
      return updateActiveSet(state, (set) =>
        updateRelation(set, action.relationId, (rel) => {
          if (rel.rows.length >= SANDBOX_LIMITS.maxRowsPerRelation) return rel;
          const emptyRow: Tuple = {};
          for (const attr of rel.attributes) {
            emptyRow[attr.name] = attr.nullable ? null : attr.type === 'string' ? '' : attr.type === 'number' ? 0 : attr.type === 'boolean' ? false : '';
          }
          return { ...rel, rows: [...rel.rows, emptyRow] };
        })
      );

    case 'UPDATE_ROW':
      return updateActiveSet(state, (set) =>
        updateRelation(set, action.relationId, (rel) => {
          if (action.rowIndex < 0 || action.rowIndex >= rel.rows.length) return rel;
          const rows = [...rel.rows];
          rows[action.rowIndex] = action.row;
          return { ...rel, rows };
        })
      );

    case 'DELETE_ROW':
      return updateActiveSet(state, (set) =>
        updateRelation(set, action.relationId, (rel) => ({
          ...rel,
          rows: rel.rows.filter((_, i) => i !== action.rowIndex),
        }))
      );

    case 'LOAD_PRESET': {
      if (state.schemaSets.length >= SANDBOX_LIMITS.maxSchemaSets) return state;
      const loaded = createSchemaSetFromPreset(action.presetId);
      return bumpVersion({
        ...state,
        schemaSets: [...state.schemaSets, loaded],
        activeSchemaSetId: loaded.id,
      });
    }

    case 'LOAD_EXERCISE_DATASET': {
      if (state.schemaSets.length >= SANDBOX_LIMITS.maxSchemaSets) return state;
      const loaded = action.schemaSet;
      const existing = state.schemaSets.find((s) => s.exerciseId === loaded.exerciseId);
      if (existing) {
        return bumpVersion({
          ...state,
          activeSchemaSetId: existing.id,
        });
      }
      return bumpVersion({
        ...state,
        schemaSets: [...state.schemaSets, loaded],
        activeSchemaSetId: loaded.id,
      });
    }

    case 'LOAD_LESSON_SCHEMA': {
      const existing = state.schemaSets.find(
        (set) => set.name === 'Lesson Schema' && set.relations.some((r) => r.name === 'Employees')
      );
      if (existing) {
        return bumpVersion({
          ...state,
          activeSchemaSetId: existing.id,
        });
      }
      if (state.schemaSets.length >= SANDBOX_LIMITS.maxSchemaSets) return state;
      const lesson = createSampleSchemaSet();
      lesson.id = createId();
      return bumpVersion({
        ...state,
        schemaSets: [...state.schemaSets, lesson],
        activeSchemaSetId: lesson.id,
      });
    }

    case 'RESET_PRESET': {
      const target = state.schemaSets.find((s) => s.id === action.schemaSetId);
      if (!target?.presetId) return state;
      const relations = restorePresetRelations(target.presetId as BundledPresetId);
      return bumpVersion({
        ...state,
        schemaSets: state.schemaSets.map((s) =>
          s.id === action.schemaSetId ? { ...s, relations } : s
        ),
      });
    }

    case 'REPLACE_SANDBOX_STATE':
      return structuredClone(action.state);

    case 'IMPORT_SHARED_SANDBOX': {
      const imported = structuredClone(action.state);
      if (action.mode === 'replace') {
        return imported;
      }
      const room = SANDBOX_LIMITS.maxSchemaSets - state.schemaSets.length;
      if (room <= 0) return state;
      const toAdd = imported.schemaSets.slice(0, room);
      const activeInImport = imported.schemaSets.find((s) => s.id === imported.activeSchemaSetId);
      const activeId =
        (activeInImport && toAdd.some((s) => s.id === activeInImport.id) ? activeInImport.id : undefined) ??
        toAdd[0]?.id;
      if (!activeId) return state;
      return bumpVersion({
        ...state,
        schemaSets: [...state.schemaSets, ...toAdd],
        activeSchemaSetId: activeId,
      });
    }

    case 'RESTORE_SCHEMA_SET_SNAPSHOT': {
      const loaded = action.schemaSet;
      const existing = state.schemaSets.find((s) => s.id === loaded.id);
      if (existing) {
        return bumpVersion({
          ...state,
          schemaSets: state.schemaSets.map((s) =>
            s.id === loaded.id ? structuredClone(loaded) : s
          ),
          activeSchemaSetId: loaded.id,
        });
      }
      if (state.schemaSets.length >= SANDBOX_LIMITS.maxSchemaSets) return state;
      const copy = structuredClone(loaded);
      return bumpVersion({
        ...state,
        schemaSets: [...state.schemaSets, copy],
        activeSchemaSetId: copy.id,
      });
    }

    case 'IMPORT_CSV':
      return updateActiveSet(state, (set) => {
        if (action.mode === 'new_relation') {
          if (set.relations.length >= SANDBOX_LIMITS.maxRelationsPerSet) return set;
          const err = validateRelationName(action.relationName, set);
          if (err) return set;
          const newRel: SandboxRelation = {
            id: createId(),
            name: action.relationName.trim(),
            attributes: action.attributes.map((a) => ({ ...a })),
            rows: action.rows.map((row) => ({ ...row })),
          };
          return { ...set, relations: [...set.relations, newRel] };
        }

        if (!action.relationId) return set;
        return updateRelation(set, action.relationId, (rel) => ({
          ...rel,
          attributes: action.attributes.map((a) => ({ ...a })),
          rows: action.rows.map((row) => ({ ...row })),
        }));
      });

    default:
      return state;
  }
}

export { previewChangeAttributeType, previewDeleteRelation, previewRemoveAttribute };
