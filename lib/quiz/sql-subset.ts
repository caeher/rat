export type SqlSubsetRejectionReason =
  | 'empty'
  | 'multi_statement'
  | 'mutating'
  | 'unsupported'
  | 'not_select';

const MUTATING_KEYWORDS =
  /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|REPLACE|TRUNCATE|ATTACH|DETACH|PRAGMA|VACUUM|REINDEX|ANALYZE)\b/i;

const UNSUPPORTED_KEYWORDS = /\b(WITH|RECURSIVE|CALL|EXEC|EXECUTE|GRANT|REVOKE)\b/i;

export interface SqlSubsetValidation {
  ok: boolean;
  message?: string;
  reason?: SqlSubsetRejectionReason;
  /** Normalized single statement without trailing semicolon. */
  normalizedSql?: string;
}

function stripSqlComments(sql: string): string {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i += 1;
      continue;
    }
    if (sql[i] === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    out += sql[i];
    i += 1;
  }
  return out;
}

function countStatements(sql: string): number {
  const parts = sql
    .split(';')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts.length;
}

export function validateLearnerSql(raw: string): SqlSubsetValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      reason: 'empty',
      message: 'Enter a SQL query before checking your answer.',
    };
  }

  const withoutComments = stripSqlComments(trimmed).trim();
  const statementCount = countStatements(withoutComments);
  if (statementCount > 1) {
    return {
      ok: false,
      reason: 'multi_statement',
      message:
        'Only one read-only SELECT statement is allowed. Remove extra statements separated by semicolons.',
    };
  }

  const normalized = withoutComments.replace(/;\s*$/, '').trim();

  if (MUTATING_KEYWORDS.test(normalized)) {
    return {
      ok: false,
      reason: 'mutating',
      message:
        'Mutating or schema-changing SQL is not allowed in quizzes. Use a single SELECT query.',
    };
  }

  if (!/^SELECT\b/i.test(normalized)) {
    return {
      ok: false,
      reason: 'not_select',
      message: 'Quiz SQL must be a single SELECT query (read-only subset).',
    };
  }

  if (UNSUPPORTED_KEYWORDS.test(normalized)) {
    return {
      ok: false,
      reason: 'unsupported',
      message:
        'This SQL feature is outside the quiz read-only subset. Rewrite using a single SELECT (set operations like UNION are allowed).',
    };
  }

  if (normalized.length > 4000) {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'Query is too long for the quiz SQL subset.',
    };
  }

  return { ok: true, normalizedSql: normalized };
}
