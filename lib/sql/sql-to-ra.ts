import type { ASTNode, Diagnostic, RelationSchema } from '@/lib/engine/types';
import { validateExpression } from '@/lib/engine/validator';
import { validateSqlTranslationInput } from './translate-subset';
import { emptySqlRange } from './ranges';
import { parseSql } from './parse';
import { buildRaExpressionFromSqlAst, type SqlToRaStep } from './reverse/compile';

export interface SqlToRaMapping {
  /** SQL clause or construct label */
  label: string;
  /** RA operator symbol */
  symbol: string;
  /** Corresponding RA expression after this step */
  expression: string;
}

export interface SqlToRaResult {
  success: boolean;
  expression?: string;
  ast?: ASTNode;
  steps: SqlToRaStep[];
  mappings: SqlToRaMapping[];
  diagnostics: Diagnostic[];
}

function stepsToMappings(steps: SqlToRaStep[]): SqlToRaMapping[] {
  return steps.map((s) => ({
    label: s.summary,
    symbol: s.symbol,
    expression: s.expressionFragment,
  }));
}

export function translateSqlToAlgebra(
  rawSql: string,
  schemas: Record<string, RelationSchema> = {}
): SqlToRaResult {
  const subset = validateSqlTranslationInput(rawSql);
  if (!subset.ok) {
    return {
      success: false,
      steps: [],
      mappings: [],
      diagnostics: subset.diagnostics,
    };
  }

  const sql = subset.normalizedSql!;
  if (/\?/.test(sql)) {
    return {
      success: false,
      steps: [],
      mappings: [],
      diagnostics: [
        {
          code: 'E_SQL_UNSUPPORTED',
          severity: 'error',
          message:
            'Parameterized SQL (? placeholders) cannot be translated. Use literal values or run algebra → SQL first and copy the executable statement.',
          range: emptySqlRange(),
        },
      ],
    };
  }

  const parsed = parseSql(sql);
  const diagnostics: Diagnostic[] = [...parsed.diagnostics];
  if (!parsed.ast || diagnostics.some((d) => d.severity === 'error')) {
    return {
      success: false,
      steps: [],
      mappings: [],
      diagnostics,
    };
  }

  const built = buildRaExpressionFromSqlAst(parsed.ast, schemas, sql);
  diagnostics.push(...built.diagnostics);
  if (!built.expression || diagnostics.some((d) => d.severity === 'error')) {
    return {
      success: false,
      steps: built.steps,
      mappings: stepsToMappings(built.steps),
      diagnostics,
    };
  }

  const validation = validateExpression(built.expression, schemas);
  diagnostics.push(...validation.diagnostics);
  if (!validation.valid || !validation.ast) {
    return {
      success: false,
      expression: built.expression,
      steps: built.steps,
      mappings: stepsToMappings(built.steps),
      diagnostics,
    };
  }

  return {
    success: true,
    expression: built.expression,
    ast: validation.ast,
    steps: built.steps,
    mappings: stepsToMappings(built.steps),
    diagnostics,
  };
}
