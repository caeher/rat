import type { Diagnostic, RelationData, RelationSchema, Tuple } from '@/lib/engine/types';
import type { SqlParameter } from '../types';

export type SqlFailureKind =
  | 'initialization'
  | 'materialization'
  | 'execution'
  | 'resource_limit'
  | 'cancelled';

export interface SqlExecutionOutcome {
  success: boolean;
  failureKind?: SqlFailureKind;
  message?: string;
  diagnostics: Diagnostic[];
  relation?: RelationData;
  schema?: RelationSchema;
  rowCount?: number;
  executionTimeMs?: number;
}

export type ComparisonStatus = 'match' | 'mismatch' | 'incomplete';

export type ComparisonFailureStage =
  | 'algebra'
  | 'sql_translation'
  | 'sql_runtime'
  | 'comparison';

export interface RelationSetDiff {
  onlyInLeft: Tuple[];
  onlyInRight: Tuple[];
}

export interface DualPathComparison {
  status: ComparisonStatus;
  algebraReady: boolean;
  sqlReady: boolean;
  failureStage?: ComparisonFailureStage;
  message?: string;
  algebraRowCount: number;
  sqlRowCount: number;
  diff?: RelationSetDiff;
}

export interface SqlVerifyParams {
  sql: string;
  parameters: SqlParameter[];
  expectedSchema: RelationSchema;
  wasmLocateUrl: string;
  limits?: Partial<typeof import('./limits').SQL_RUNTIME_LIMITS>;
}
