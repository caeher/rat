const KEYWORDS = new Set([
  'SELECT',
  'DISTINCT',
  'FROM',
  'WHERE',
  'AS',
  'AND',
  'OR',
  'NOT',
  'NULL',
  'IS',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'FULL',
  'OUTER',
  'CROSS',
  'NATURAL',
  'ON',
  'UNION',
  'INTERSECT',
  'EXCEPT',
  'EXISTS',
]);

/**
 * Light formatting: uppercase keywords and break major clauses onto new lines.
 */
export function formatSql(sql: string): string {
  const tokens = sql.split(/(\s+|[(),])/);
  const lines: string[] = [];
  let current = '';
  let depth = 0;

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed) {
      lines.push(trimmed);
    }
    current = '';
  };

  for (const token of tokens) {
    if (!token) continue;
    if (/^\s+$/.test(token)) {
      current += token;
      continue;
    }

    const upper = token.toUpperCase();
    if (KEYWORDS.has(upper)) {
      current += upper;
    } else {
      current += token;
    }

    if (token === '(') {
      depth += 1;
    } else if (token === ')') {
      depth -= 1;
    }

    if (
      depth === 0 &&
      (upper === 'FROM' ||
        upper === 'WHERE' ||
        upper === 'UNION' ||
        upper === 'INTERSECT' ||
        upper === 'EXCEPT' ||
        upper === 'JOIN' ||
        upper === 'ON')
    ) {
      flush();
    }
  }

  flush();
  return lines.join('\n').replace(/\n+/g, '\n').trim();
}
