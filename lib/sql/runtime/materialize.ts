import type { AttributeType, RelationData } from '@/lib/engine/types';
import type { SandboxSnapshot } from '@/lib/sandbox/types';
import { formatIdentifier, formatLiteralValue } from '../quote';

export interface SqlDatabaseLike {
  run(sql: string): void;
}

function sqliteColumnType(attrType: AttributeType): string {
  switch (attrType) {
    case 'number':
      return 'REAL';
    case 'boolean':
      return 'INTEGER';
    case 'date':
    case 'string':
    case 'null':
      return 'TEXT';
    default:
      return 'TEXT';
  }
}

export function materializeSnapshotTables(
  db: SqlDatabaseLike,
  snapshot: Pick<SandboxSnapshot, 'relations'>
): void {
  for (const rel of Object.values(snapshot.relations)) {
    materializeRelation(db, rel);
  }
}

export function materializeRelation(db: SqlDatabaseLike, rel: RelationData): void {
  const table = formatIdentifier(rel.schema.name);
  const attrs = rel.schema.attributes;

  if (attrs.length === 0) {
    db.run(`CREATE TABLE ${table} ("_rat_zero_arity" INTEGER);`);
    return;
  }

  const columnDefs = attrs
    .map((a) => `${formatIdentifier(a.name)} ${sqliteColumnType(a.type)}`)
    .join(', ');
  db.run(`CREATE TABLE ${table} (${columnDefs});`);

  for (const tuple of rel.tuples) {
    const colNames = attrs.map((a) => formatIdentifier(a.name)).join(', ');
    const values = attrs.map((a) => formatLiteralValue(tuple[a.name] ?? null)).join(', ');
    db.run(`INSERT INTO ${table} (${colNames}) VALUES (${values});`);
  }
}
