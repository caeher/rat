export * from './types';
export { transpileRaAst } from './transpile';
export { toExecutableSql } from './executable';
export { formatSql } from './format';
export { formatIdentifier, escapeStringLiteral, formatLiteralValue } from './quote';

import { validateExpression } from '@/lib/engine/validator';
import type { RelationSchema } from '@/lib/engine/types';
import { transpileRaAst } from './transpile';
import type { SqlTranspilationResult } from './types';
import { SQL_DIALECT_ID, SQL_DIALECT_VERSION } from './types';

/**
 * Validates an expression, then transpiles the typed AST to SQL when semantically valid.
 */
export function transpileExpression(
  expression: string,
  schemas: Record<string, RelationSchema> = {}
): SqlTranspilationResult {
  const trimmed = expression.trim();
  if (!trimmed) {
    return {
      success: false,
      dialect: SQL_DIALECT_ID,
      dialectVersion: SQL_DIALECT_VERSION,
      parameters: [],
      mappings: [],
      diagnostics: [],
    };
  }

  const validation = validateExpression(expression, schemas);
  if (!validation.valid || !validation.ast) {
    return {
      success: false,
      dialect: SQL_DIALECT_ID,
      dialectVersion: SQL_DIALECT_VERSION,
      parameters: [],
      mappings: [],
      diagnostics: validation.diagnostics,
    };
  }

  const sqlResult = transpileRaAst(validation.ast, schemas);
  const mergedDiagnostics = [...validation.diagnostics, ...sqlResult.diagnostics];
  const hasError = mergedDiagnostics.some((d) => d.severity === 'error');

  return {
    ...sqlResult,
    success: sqlResult.success && !hasError,
    diagnostics: mergedDiagnostics,
  };
}
