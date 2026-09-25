import type { Diagnostic, SourcePosition, SourceRange } from '@/lib/engine/types';

export type SqlTokenType =
  | 'EOF'
  | 'IDENT'
  | 'STRING'
  | 'NUMBER'
  | 'PUNCT'
  | 'KEYWORD'
  | 'OP';

export interface SqlToken {
  type: SqlTokenType;
  value: string;
  raw: string;
  range: SourceRange;
}

const KEYWORDS = new Set([
  'SELECT',
  'DISTINCT',
  'ALL',
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
  'TRUE',
  'FALSE',
]);

export function tokenizeSql(input: string): { tokens: SqlToken[]; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const tokens: SqlToken[] = [];
  let offset = 0;
  let line = 1;
  let column = 1;

  const pos = (): SourcePosition => ({ line, column, offset });
  const rangeFrom = (start: SourcePosition, end: SourcePosition): SourceRange => ({ start, end });

  const advance = (n: number) => {
    for (let i = 0; i < n; i += 1) {
      if (input[offset] === '\n') {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
      offset += 1;
    }
  };

  const skipWs = () => {
    while (offset < input.length) {
      const c = input[offset];
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
        advance(1);
        continue;
      }
      if (c === '-' && input[offset + 1] === '-') {
        while (offset < input.length && input[offset] !== '\n') advance(1);
        continue;
      }
      if (c === '/' && input[offset + 1] === '*') {
        advance(2);
        while (offset < input.length && !(input[offset] === '*' && input[offset + 1] === '/')) {
          advance(1);
        }
        if (offset < input.length) advance(2);
        continue;
      }
      break;
    }
  };

  while (offset <= input.length) {
    skipWs();
    if (offset >= input.length) break;
    const start = pos();
    const c = input[offset];

    if (c === "'" || c === '"') {
      const quote = c;
      advance(1);
      let raw = quote;
      let value = '';
      while (offset < input.length && input[offset] !== quote) {
        if (input[offset] === '\\' && offset + 1 < input.length) {
          raw += input[offset] + input[offset + 1];
          const esc = input[offset + 1];
          if (esc === 'n') value += '\n';
          else if (esc === 't') value += '\t';
          else if (esc === quote) value += quote;
          else if (esc === '\\') value += '\\';
          else value += esc;
          advance(2);
          continue;
        }
        value += input[offset];
        raw += input[offset];
        advance(1);
      }
      if (offset < input.length) {
        raw += quote;
        advance(1);
      } else {
        diagnostics.push({
          code: 'E_SYNTAX_ERROR',
          severity: 'error',
          message: 'Unterminated string literal in SQL.',
          range: rangeFrom(start, pos()),
        });
      }
      tokens.push({
        type: 'STRING',
        value,
        raw,
        range: rangeFrom(start, pos()),
      });
      continue;
    }

    if (c === '`') {
      advance(1);
      let value = '';
      while (offset < input.length && input[offset] !== '`') {
        value += input[offset];
        advance(1);
      }
      if (offset < input.length) advance(1);
      tokens.push({
        type: 'IDENT',
        value,
        raw: '`' + value + '`',
        range: rangeFrom(start, pos()),
      });
      continue;
    }

    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(input[offset + 1] ?? ''))) {
      let raw = '';
      while (offset < input.length && /[0-9.eE+-]/.test(input[offset])) {
        raw += input[offset];
        advance(1);
      }
      const num = Number(raw);
      tokens.push({
        type: 'NUMBER',
        value: String(num),
        raw,
        range: rangeFrom(start, pos()),
      });
      continue;
    }

    if (/[A-Za-z_]/.test(c)) {
      let raw = '';
      while (offset < input.length && /[A-Za-z0-9_]/.test(input[offset])) {
        raw += input[offset];
        advance(1);
      }
      const upper = raw.toUpperCase();
      if (KEYWORDS.has(upper)) {
        tokens.push({
          type: 'KEYWORD',
          value: upper,
          raw,
          range: rangeFrom(start, pos()),
        });
      } else {
        tokens.push({
          type: 'IDENT',
          value: raw,
          raw,
          range: rangeFrom(start, pos()),
        });
      }
      continue;
    }

    const two = input.slice(offset, offset + 2);
    const three = input.slice(offset, offset + 3);
    let op = c;
    if (two === '<>' || two === '!=' || two === '<=' || two === '>=') {
      op = two;
      advance(2);
    } else if (three === '||') {
      op = three;
      advance(3);
    } else if ('(),.*;=<>'.includes(c)) {
      advance(1);
    } else {
      diagnostics.push({
        code: 'E_SYNTAX_ERROR',
        severity: 'error',
        message: `Unexpected character '${c}' in SQL.`,
        range: rangeFrom(start, pos()),
      });
      advance(1);
      continue;
    }

    tokens.push({
      type: op.length === 1 && '(),.*;'.includes(op) ? 'PUNCT' : 'OP',
      value: op,
      raw: op,
      range: rangeFrom(start, pos()),
    });
  }

  const end = pos();
  tokens.push({
    type: 'EOF',
    value: '',
    raw: '',
    range: rangeFrom(end, end),
  });

  return { tokens, diagnostics };
}
