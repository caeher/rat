import type { RelationData, RelationSchema, Tuple } from '@/lib/engine/types';
import type { SandboxSchemaSet, SandboxSnapshot, SandboxState } from './types';

function deepCopyTuple(tuple: Tuple): Tuple {
  return { ...tuple };
}

function sanitizeRow(
  row: Tuple,
  attributes: SandboxSchemaSet['relations'][number]['attributes']
): Tuple | null {
  const out: Tuple = {};
  for (const attr of attributes) {
    const raw = row[attr.name];
    if (raw === undefined || raw === null) {
      if (!attr.nullable) {
        return null;
      }
      out[attr.name] = null;
    } else {
      out[attr.name] = raw;
    }
  }
  return out;
}

function buildRelationData(relation: SandboxSchemaSet['relations'][number]): RelationData {
  const schema: RelationSchema = {
    name: relation.name,
    attributes: relation.attributes.map((a) => ({
      name: a.name,
      type: a.type,
      nullable: a.nullable,
      sourceRelation: relation.name,
    })),
  };
  const tuples = relation.rows
    .map((row) => sanitizeRow(row, relation.attributes))
    .filter((row): row is Tuple => row !== null)
    .map(deepCopyTuple);
  return {
    schema,
    tuples,
  };
}

/**
 * Returns an immutable, versioned snapshot for the query editor and engine pipeline.
 */
export function createSandboxSnapshot(state: SandboxState): SandboxSnapshot | null {
  const active = state.schemaSets.find((s) => s.id === state.activeSchemaSetId);
  if (!active) return null;

  const relations: Record<string, RelationData> = {};
  const schemas: Record<string, RelationSchema> = {};

  for (const relation of active.relations) {
    const data = buildRelationData(relation);
    relations[relation.name] = data;
    schemas[relation.name] = data.schema;
  }

  const snapshot: SandboxSnapshot = {
    version: state.dataVersion,
    schemaSetId: active.id,
    schemaSetName: active.name,
    relations: structuredClone(relations),
    schemas: structuredClone(schemas),
    createdAt: Date.now(),
  };

  return Object.freeze(snapshot);
}

export function snapshotRelationNames(snapshot: SandboxSnapshot | null): string[] {
  if (!snapshot) return [];
  return Object.keys(snapshot.schemas).sort();
}

export function snapshotAttributeNames(snapshot: SandboxSnapshot | null): string[] {
  if (!snapshot) return [];
  const names: string[] = [];
  for (const schema of Object.values(snapshot.schemas)) {
    for (const attr of schema.attributes) {
      names.push(attr.name);
    }
  }
  return [...new Set(names)].sort();
}
