import type { SourceRange } from '@/lib/engine/types';

export type SqlSetOperator = 'union' | 'intersect' | 'except';

export type SqlJoinKind =
  | 'inner'
  | 'cross'
  | 'natural'
  | 'left'
  | 'right'
  | 'full';

export interface SqlSelectItem {
  kind: 'all' | 'column';
  /** Unqualified or qualified column reference */
  column?: { qualifier?: string; name: string; range: SourceRange };
  alias?: string;
  range: SourceRange;
}

export interface SqlTableRef {
  relationName?: string;
  alias?: string;
  subquery?: SqlQuery;
  range: SourceRange;
}

export interface SqlJoinNode {
  kind: SqlJoinKind;
  right: SqlTableRef;
  on?: SqlExpr;
  range: SourceRange;
}

export interface SqlFromClause {
  base: SqlTableRef;
  joins: SqlJoinNode[];
  /** True when base and joins were connected with comma (implicit cross). */
  implicitCross: boolean[];
  range: SourceRange;
}

export type SqlExpr =
  | SqlBinaryExpr
  | SqlUnaryExpr
  | SqlComparisonExpr
  | SqlIsNullExpr
  | SqlColumnRef
  | SqlLiteralExpr
  | SqlParenExpr;

export interface SqlBinaryExpr {
  type: 'binary';
  operator: 'AND' | 'OR';
  left: SqlExpr;
  right: SqlExpr;
  range: SourceRange;
}

export interface SqlUnaryExpr {
  type: 'unary';
  operator: 'NOT';
  operand: SqlExpr;
  range: SourceRange;
}

export interface SqlComparisonExpr {
  type: 'comparison';
  operator: '=' | '!=' | '<>' | '<' | '<=' | '>' | '>=';
  left: SqlExpr;
  right: SqlExpr;
  range: SourceRange;
}

export interface SqlIsNullExpr {
  type: 'is_null';
  negated: boolean;
  operand: SqlColumnRef;
  range: SourceRange;
}

export interface SqlColumnRef {
  type: 'column';
  qualifier?: string;
  name: string;
  range: SourceRange;
}

export interface SqlLiteralExpr {
  type: 'literal';
  value: string | number | boolean | null;
  raw: string;
  range: SourceRange;
}

export interface SqlParenExpr {
  type: 'paren';
  inner: SqlExpr;
  range: SourceRange;
}

export interface SqlSelectQuery {
  type: 'select';
  distinct: boolean;
  columns: SqlSelectItem[];
  from?: SqlFromClause;
  where?: SqlExpr;
  range: SourceRange;
}

export interface SqlSetOperation {
  operator: SqlSetOperator;
  all: boolean;
  right: SqlQuery;
  range: SourceRange;
}

export type SqlQuery = SqlSelectQuery | SqlSetQuery;

export interface SqlSetQuery {
  type: 'set';
  left: SqlQuery;
  operation: SqlSetOperation;
  range: SourceRange;
}
