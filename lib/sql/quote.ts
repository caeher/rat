import type { TupleValue } from '@/lib/engine/types';

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const SQLITE_RESERVED = new Set([
  'ABORT',
  'ACTION',
  'ADD',
  'ALL',
  'ALTER',
  'AND',
  'AS',
  'ASC',
  'AUTOINCREMENT',
  'BETWEEN',
  'BY',
  'CASCADE',
  'CASE',
  'CHECK',
  'COLLATE',
  'COLUMN',
  'COMMIT',
  'CONFLICT',
  'CONSTRAINT',
  'CREATE',
  'CROSS',
  'CURRENT',
  'CURRENT_DATE',
  'CURRENT_TIME',
  'CURRENT_TIMESTAMP',
  'DATABASE',
  'DEFAULT',
  'DEFERRABLE',
  'DEFERRED',
  'DELETE',
  'DESC',
  'DISTINCT',
  'DROP',
  'EACH',
  'ELSE',
  'END',
  'ESCAPE',
  'EXCEPT',
  'EXCLUSIVE',
  'EXISTS',
  'EXPLAIN',
  'FAIL',
  'FALSE',
  'FOR',
  'FOREIGN',
  'FROM',
  'FULL',
  'GLOB',
  'GROUP',
  'HAVING',
  'IF',
  'IGNORE',
  'IMMEDIATE',
  'IN',
  'INDEX',
  'INITIALLY',
  'INNER',
  'INSERT',
  'INSTEAD',
  'INTERSECT',
  'INTO',
  'IS',
  'ISNULL',
  'JOIN',
  'KEY',
  'LEFT',
  'LIKE',
  'LIMIT',
  'MATCH',
  'NATURAL',
  'NO',
  'NOT',
  'NOTNULL',
  'NULL',
  'OF',
  'OFFSET',
  'ON',
  'OR',
  'ORDER',
  'OUTER',
  'PLAN',
  'PRAGMA',
  'PRIMARY',
  'QUERY',
  'RAISE',
  'RECURSIVE',
  'REFERENCES',
  'REGEXP',
  'REINDEX',
  'RELEASE',
  'RENAME',
  'REPLACE',
  'RESTRICT',
  'RIGHT',
  'ROLLBACK',
  'ROW',
  'SAVEPOINT',
  'SELECT',
  'SET',
  'TABLE',
  'TEMP',
  'TEMPORARY',
  'THEN',
  'TO',
  'TRANSACTION',
  'TRIGGER',
  'TRUE',
  'UNION',
  'UNIQUE',
  'UPDATE',
  'USING',
  'VACUUM',
  'VALUES',
  'VIEW',
  'VIRTUAL',
  'WHEN',
  'WHERE',
  'WITH',
  'WITHOUT',
]);

export function needsQuoting(identifier: string): boolean {
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    return true;
  }
  return SQLITE_RESERVED.has(identifier.toUpperCase());
}

export function quoteIdentifier(identifier: string): string {
  const escaped = identifier.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function formatIdentifier(identifier: string): string {
  if (needsQuoting(identifier)) {
    return quoteIdentifier(identifier);
  }
  return identifier;
}

export function escapeStringLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function formatLiteralValue(value: TupleValue): string {
  if (value === null) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return 'NULL';
    }
    return String(value);
  }
  return escapeStringLiteral(String(value));
}
