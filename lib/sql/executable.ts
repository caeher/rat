import { formatLiteralValue } from './quote';
import type { SqlParameter } from './types';

/**
 * Produces a single executable SQLite script with literals inlined (for copy/export).
 */
export function toExecutableSql(sql: string, parameters: SqlParameter[]): string {
  if (parameters.length === 0) {
    return sql.endsWith(';') ? sql : `${sql};`;
  }

  let cursor = 0;
  let output = '';
  const sorted = [...parameters].sort((a, b) => a.index - b.index);

  for (const param of sorted) {
    const placeholderIndex = sql.indexOf('?', cursor);
    if (placeholderIndex === -1) {
      break;
    }
    output += sql.slice(cursor, placeholderIndex);
    output += formatLiteralValue(param.value);
    cursor = placeholderIndex + 1;
  }

  output += sql.slice(cursor);
  const trimmed = output.trim();
  return trimmed.endsWith(';') ? trimmed : `${trimmed};`;
}
