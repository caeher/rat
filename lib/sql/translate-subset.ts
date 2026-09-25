import type { Diagnostic } from '@/lib/engine/types';
import { emptySqlRange } from './ranges';
import { validateLearnerSql } from '@/lib/quiz/sql-subset';

export interface SqlTranslationInputValidation {
  ok: boolean;
  normalizedSql?: string;
  diagnostics: Diagnostic[];
}

export function validateSqlTranslationInput(raw: string): SqlTranslationInputValidation {
  const subset = validateLearnerSql(raw);
  if (!subset.ok) {
    return {
      ok: false,
      diagnostics: [
        {
          code: 'E_SQL_SUBSET',
          severity: 'error',
          message: subset.message ?? 'SQL is outside the supported read-only subset.',
          range: emptySqlRange(),
        },
      ],
    };
  }

  const sql = subset.normalizedSql!;

  if (/\b(GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT|OFFSET|WINDOW\s+)\b/i.test(sql)) {
    return {
      ok: false,
      diagnostics: [
        {
          code: 'E_SQL_UNSUPPORTED',
          severity: 'error',
          message:
            'ORDER BY, GROUP BY, LIMIT, and window clauses are outside the algebra translation subset.',
          range: emptySqlRange(),
        },
      ],
    };
  }

  if (/\bUNION\s+ALL\b|\bINTERSECT\s+ALL\b|\bEXCEPT\s+ALL\b/i.test(sql)) {
    return {
      ok: false,
      diagnostics: [
        {
          code: 'E_SQL_BAG_SEMANTICS',
          severity: 'error',
          message:
            'UNION ALL / INTERSECT ALL / EXCEPT ALL use bag semantics and cannot be translated into set-based relational algebra.',
          range: emptySqlRange(),
        },
      ],
    };
  }

  return { ok: true, normalizedSql: sql, diagnostics: [] };
}
