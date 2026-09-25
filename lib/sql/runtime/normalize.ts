import type { AttributeType, RelationData, RelationSchema, Tuple, TupleValue } from '@/lib/engine/types';
import { deduplicateTuples } from '@/lib/engine/contract';

export function normalizeSqlCell(value: unknown, attrType: AttributeType): TupleValue {
  if (value === null || value === undefined) {
    return null;
  }

  switch (attrType) {
    case 'boolean': {
      if (value === 0 || value === '0') return false;
      if (value === 1 || value === '1') return true;
      if (typeof value === 'boolean') return value;
      return Boolean(value);
    }
    case 'number': {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? n : null;
    }
    case 'date':
    case 'string':
      return String(value);
    case 'null':
      return value === null ? null : String(value);
    default:
      return String(value);
  }
}

function inferSchemaFromRows(
  rawRows: Record<string, unknown>[],
  baseName: string
): RelationSchema {
  const columnNames =
    rawRows.length > 0
      ? Object.keys(rawRows[0])
      : [];
  return {
    name: baseName,
    attributes: columnNames.map((name) => ({
      name,
      type: 'string' as const,
      nullable: true,
    })),
  };
}

export function normalizeSqlResult(
  rawRows: Record<string, unknown>[],
  expectedSchema: RelationSchema
): RelationData {
  const schema: RelationSchema =
    expectedSchema.attributes.length > 0
      ? {
          name: expectedSchema.name,
          attributes: expectedSchema.attributes.map((a) => ({ ...a })),
        }
      : inferSchemaFromRows(rawRows, expectedSchema.name);

  const tuples: Tuple[] = rawRows.map((raw) => {
    const tuple: Tuple = {};
    for (const attr of schema.attributes) {
      const rawValue = raw[attr.name];
      tuple[attr.name] = normalizeSqlCell(rawValue, attr.type);
    }
    return tuple;
  });

  const distinct = deduplicateTuples(tuples, schema);
  return { schema, tuples: distinct };
}
