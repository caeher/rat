import { SANDBOX_LIMITS, SUPPORTED_ATTRIBUTE_TYPES } from '@/lib/sandbox/constants';
import type { SandboxAttributeType } from '@/lib/sandbox/constants';
import type { Tuple, TupleValue } from '@/lib/engine/types';
import type { SandboxRelation, SandboxSchemaSet, SandboxState } from '@/lib/sandbox/types';
import { SHARE_PAYLOAD_VERSION } from './constants';
import { ShareError } from './errors';
import type { SandboxSharePayloadV1 } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isTupleValue(value: unknown): value is TupleValue {
  if (value === null) return true;
  const t = typeof value;
  return t === 'string' || t === 'number' || t === 'boolean';
}

function validateTuple(raw: unknown): Tuple | null {
  if (!isRecord(raw)) return null;
  const tuple: Tuple = {};
  for (const [key, val] of Object.entries(raw)) {
    if (!isString(key) || key.length > SANDBOX_LIMITS.maxAttributeNameLength) return null;
    if (!isTupleValue(val)) return null;
    tuple[key] = val;
  }
  return tuple;
}

function validateRelation(raw: unknown): SandboxRelation | null {
  if (!isRecord(raw)) return null;
  if (!isString(raw.id) || !isString(raw.name)) return null;
  if (raw.name.length > SANDBOX_LIMITS.maxRelationNameLength) return null;
  if (!Array.isArray(raw.attributes) || !Array.isArray(raw.rows)) return null;
  if (raw.attributes.length > SANDBOX_LIMITS.maxAttributesPerRelation) return null;
  if (raw.rows.length > SANDBOX_LIMITS.maxRowsPerRelation) return null;

  const attributes = [];
  for (const attr of raw.attributes) {
    if (!isRecord(attr) || !isString(attr.name)) return null;
    if (!SUPPORTED_ATTRIBUTE_TYPES.includes(attr.type as SandboxAttributeType)) return null;
    if (!isBoolean(attr.nullable)) return null;
    attributes.push({
      name: attr.name,
      type: attr.type as SandboxAttributeType,
      nullable: attr.nullable,
    });
  }

  const rows: Tuple[] = [];
  for (const row of raw.rows) {
    const tuple = validateTuple(row);
    if (!tuple) return null;
    rows.push(tuple);
  }

  return {
    id: raw.id,
    name: raw.name,
    attributes,
    rows,
  };
}

function validateSchemaSet(raw: unknown): SandboxSchemaSet | null {
  if (!isRecord(raw)) return null;
  if (!isString(raw.id) || !isString(raw.name)) return null;
  if (raw.name.length > SANDBOX_LIMITS.maxSchemaSetNameLength) return null;
  if (!Array.isArray(raw.relations)) return null;
  if (raw.relations.length > SANDBOX_LIMITS.maxRelationsPerSet) return null;

  const relations: SandboxRelation[] = [];
  for (const rel of raw.relations) {
    const parsed = validateRelation(rel);
    if (!parsed) return null;
    relations.push(parsed);
  }

  const presetId = raw.presetId;
  const exerciseId = raw.exerciseId;

  return {
    id: raw.id,
    name: raw.name,
    relations,
    ...(isString(presetId) ? { presetId: presetId as SandboxSchemaSet['presetId'] } : {}),
    ...(isString(exerciseId) ? { exerciseId } : {}),
  };
}

export function validateSandboxState(raw: unknown): SandboxState | null {
  if (!isRecord(raw)) return null;
  if (!Array.isArray(raw.schemaSets) || !isString(raw.activeSchemaSetId)) return null;
  if (!isNumber(raw.dataVersion)) return null;
  if (raw.schemaSets.length > SANDBOX_LIMITS.maxSchemaSets) return null;

  const schemaSets: SandboxSchemaSet[] = [];
  for (const set of raw.schemaSets) {
    const parsed = validateSchemaSet(set);
    if (!parsed) return null;
    schemaSets.push(parsed);
  }

  if (!schemaSets.some((s) => s.id === raw.activeSchemaSetId)) return null;

  return {
    schemaSets,
    activeSchemaSetId: raw.activeSchemaSetId,
    dataVersion: raw.dataVersion,
  };
}

export function validateSharePayload(raw: unknown): SandboxSharePayloadV1 {
  if (!isRecord(raw)) {
    throw new ShareError('invalid_structure', 'Share payload must be a JSON object.');
  }
  if (raw.v !== SHARE_PAYLOAD_VERSION) {
    throw new ShareError(
      'unsupported_version',
      `Unsupported share version ${String(raw.v)}. This app supports version ${SHARE_PAYLOAD_VERSION}.`
    );
  }
  if (!isString(raw.expression)) {
    throw new ShareError('invalid_structure', 'Share payload is missing a valid expression.');
  }
  const sandbox = validateSandboxState(raw.sandbox);
  if (!sandbox) {
    throw new ShareError('invalid_structure', 'Share payload contains invalid schema or relation data.');
  }

  let meta: SandboxSharePayloadV1['meta'];
  if (raw.meta !== undefined) {
    if (!isRecord(raw.meta)) {
      throw new ShareError('invalid_structure', 'Share metadata must be an object.');
    }
    if (raw.meta.title !== undefined && !isString(raw.meta.title)) {
      throw new ShareError('invalid_structure', 'Share title must be a string.');
    }
    if (raw.meta.schemaSetName !== undefined && !isString(raw.meta.schemaSetName)) {
      throw new ShareError('invalid_structure', 'Share schema set name must be a string.');
    }
    if (raw.meta.sharedAt !== undefined && !isNumber(raw.meta.sharedAt)) {
      throw new ShareError('invalid_structure', 'Share timestamp must be a number.');
    }
    meta = {
      title: raw.meta.title as string | undefined,
      schemaSetName: raw.meta.schemaSetName as string | undefined,
      sharedAt: (raw.meta.sharedAt as number | undefined) ?? Date.now(),
    };
  }

  return {
    v: SHARE_PAYLOAD_VERSION,
    expression: raw.expression,
    sandbox,
    meta,
  };
}
