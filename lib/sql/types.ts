import type { ASTNodeType, Diagnostic, TupleValue } from '@/lib/engine/types';

export const SQL_DIALECT_ID = 'sqlite' as const;
export const SQL_DIALECT_VERSION = '3.39+';

export interface SqlParameter {
  /** 1-based index for SQLite `?` placeholders */
  index: number;
  value: TupleValue;
  /** SQLite affinity hint for documentation */
  affinity: 'TEXT' | 'INTEGER' | 'REAL' | 'NUMERIC' | 'BLOB' | 'NULL';
}

export interface AstToSqlMapping {
  nodeId: string;
  operator: ASTNodeType;
  /** Inclusive start offset in `formattedSql` */
  sqlStart: number;
  /** Exclusive end offset in `formattedSql` */
  sqlEnd: number;
  /** Short label for UI (e.g. σ, ⋈, ÷) */
  label: string;
}

export interface SqlTranspilationResult {
  success: boolean;
  dialect: typeof SQL_DIALECT_ID;
  dialectVersion: string;
  /** Parameterized SQL (placeholders where literals appear in predicates) */
  sql?: string;
  /** Pretty-printed SQL aligned with `sql` */
  formattedSql?: string;
  parameters: SqlParameter[];
  mappings: AstToSqlMapping[];
  diagnostics: Diagnostic[];
}
