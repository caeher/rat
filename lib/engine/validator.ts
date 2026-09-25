/**
 * Relational Algebra Validator & Analysis Pipeline
 * Version: 1.0.0
 * 
 * High-level validation API that integrates Lexer, Parser, and Semantic Analyzer.
 * Resilient to incomplete editor inputs and returns structured diagnostics with
 * exact source ranges and actionable suggestions.
 */

import {
  ASTNode,
  Diagnostic,
  EvaluationOptions,
  RelationSchema,
  ValidationResult,
} from './types';
import { parse, ParseResult } from './parser';
import { analyze, AnalysisResult } from './analyzer';

/**
 * Validates a Relational Algebra expression against active schemas.
 * 
 * @param input Raw relational algebra expression string
 * @param schemas Active in-memory relation schemas
 * @param options Optional evaluation options
 * @returns Structured validation result
 */
export function validateExpression(
  input: string,
  schemas: Record<string, RelationSchema> | RelationSchema[] = {},
  _options?: EvaluationOptions
): ValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      valid: false,
      isIncomplete: true,
      diagnostics: [],
    };
  }

  // 1. Lex and Parse
  const parseResult: ParseResult = parse(input);
  const diagnostics: Diagnostic[] = [...parseResult.diagnostics];

  if (!parseResult.ast) {
    return {
      valid: false,
      isIncomplete: parseResult.isIncomplete,
      diagnostics,
    };
  }

  // 2. Semantic Analysis & Type Checking
  const analysisResult: AnalysisResult = analyze(parseResult.ast, schemas);
  diagnostics.push(...analysisResult.diagnostics);

  const hasErrors = diagnostics.some((d) => d.severity === 'error');

  return {
    valid: !hasErrors && !parseResult.isIncomplete,
    isIncomplete: parseResult.isIncomplete,
    ast: analysisResult.typedAST,
    schema: analysisResult.inferredSchema,
    diagnostics,
  };
}

/**
 * Convenience entry point for parsing an expression to AST.
 */
export function parseExpression(input: string): ParseResult {
  return parse(input);
}

/**
 * Convenience entry point for analyzing a parsed AST.
 */
export function analyzeAST(
  ast: ASTNode,
  schemas: Record<string, RelationSchema> | RelationSchema[] = {}
): AnalysisResult {
  return analyze(ast, schemas);
}
