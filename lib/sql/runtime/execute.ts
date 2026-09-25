import type { RelationSchema } from '@/lib/engine/types';
import type { SandboxSnapshot } from '@/lib/sandbox/types';
import type { SqlParameter } from '../types';
import { SQL_RUNTIME_LIMITS, type SqlRuntimeLimits } from './limits';
import { materializeSnapshotTables } from './materialize';
import { normalizeSqlResult } from './normalize';
import type { SqlExecutionOutcome } from './types';

export interface SqlJsDatabase {
  run(sql: string, params?: unknown[]): void;
  prepare(sql: string): SqlJsStatement;
  close(): void;
}

export interface SqlJsStatement {
  bind(values?: unknown[]): boolean;
  step(): boolean;
  getAsObject(): Record<string, unknown>;
  free(): void;
}

export interface SqlJsStatic {
  Database: new () => SqlJsDatabase;
}

export interface ExecuteSqlOnDatabaseParams {
  db: SqlJsDatabase;
  snapshot: SandboxSnapshot;
  sql: string;
  parameters: SqlParameter[];
  expectedSchema: RelationSchema;
  limits?: Partial<SqlRuntimeLimits>;
  startedAt?: number;
  isCancelled?: () => boolean;
}

export function executeSqlOnDatabase(params: ExecuteSqlOnDatabaseParams): SqlExecutionOutcome {
  const limits = { ...SQL_RUNTIME_LIMITS, ...params.limits };
  const startedAt = params.startedAt ?? Date.now();

  if (params.isCancelled?.()) {
    return cancelledOutcome();
  }

  try {
    materializeSnapshotTables(params.db, params.snapshot);
  } catch (error) {
    return {
      success: false,
      failureKind: 'materialization',
      message: error instanceof Error ? error.message : 'Failed to materialize snapshot tables.',
      diagnostics: [],
    };
  }

  if (params.isCancelled?.()) {
    return cancelledOutcome();
  }

  if (Date.now() - startedAt > limits.maxExecutionMs) {
    return resourceLimitOutcome('Snapshot materialization exceeded the time budget.');
  }

  const paramValues = [...params.parameters]
    .sort((a, b) => a.index - b.index)
    .map((p) => bindParameterValue(p.value));

  let stmt: SqlJsStatement | null = null;
  try {
    stmt = params.db.prepare(params.sql);
    if (paramValues.length > 0) {
      stmt.bind(paramValues);
    }

    const rawRows: Record<string, unknown>[] = [];
    while (stmt.step()) {
      if (params.isCancelled?.()) {
        return cancelledOutcome();
      }
      if (Date.now() - startedAt > limits.maxExecutionMs) {
        return resourceLimitOutcome('SQL execution exceeded the time budget.');
      }
      if (rawRows.length >= limits.maxOutputRows) {
        return resourceLimitOutcome(
          `SQL result exceeded the row limit (${limits.maxOutputRows}).`
        );
      }
      rawRows.push(stmt.getAsObject());
    }

    const relation = normalizeSqlResult(rawRows, params.expectedSchema);
    return {
      success: true,
      relation,
      schema: relation.schema,
      rowCount: relation.tuples.length,
      executionTimeMs: Date.now() - startedAt,
      diagnostics: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SQL execution failed.';
    return {
      success: false,
      failureKind: 'execution',
      message,
      diagnostics: [],
    };
  } finally {
    stmt?.free();
  }
}

function bindParameterValue(value: SqlParameter['value']): unknown {
  if (value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

function cancelledOutcome(): SqlExecutionOutcome {
  return {
    success: false,
    failureKind: 'cancelled',
    message: 'SQL verification was cancelled.',
    diagnostics: [],
  };
}

function resourceLimitOutcome(message: string): SqlExecutionOutcome {
  return {
    success: false,
    failureKind: 'resource_limit',
    message,
    diagnostics: [],
  };
}
