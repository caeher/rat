import path from 'node:path';
import { validateExpression } from '@/lib/engine/validator';
import { evaluateRaAst } from '@/lib/evaluator/evaluate';
import { createSandboxSnapshot } from '@/lib/sandbox/snapshot';
import { universityPreset } from '@/lib/sandbox/presets/university';
import type { SandboxState } from '@/lib/sandbox/types';
import { transpileRaAst } from '@/lib/sql';
import { compareAlgebraAndSql } from '@/lib/sql/runtime/compare';
import { executeSqlOnDatabase } from '@/lib/sql/runtime/execute';
import { initSqlEngine, resetSqlEngineCacheForTests } from '@/lib/sql/runtime/initSql';
import type { DualPathComparison } from '@/lib/sql/runtime/types';

export function buildUniversitySnapshot() {
  const schemaSet = universityPreset.buildSchemaSet();
  const state: SandboxState = {
    schemaSets: [{ ...schemaSet, id: 'uni' }],
    activeSchemaSetId: 'uni',
    dataVersion: 1,
  };
  const snapshot = createSandboxSnapshot(state);
  if (!snapshot) throw new Error('snapshot missing');
  return snapshot;
}

export async function runAlgebraSqlParity(expression: string): Promise<DualPathComparison> {
  const snapshot = buildUniversitySnapshot();
  const validation = validateExpression(expression, snapshot.schemas);
  if (!validation.valid || !validation.ast) {
    throw new Error(validation.diagnostics.map((d) => d.message).join('; '));
  }

  const algebraOutcome = evaluateRaAst({
    ast: validation.ast,
    relations: snapshot.relations,
  });

  const transpiled = transpileRaAst(validation.ast, snapshot.schemas);
  if (!transpiled.success || !transpiled.sql) {
    throw new Error(
      transpiled.diagnostics.map((d) => d.message).join('; ') || 'transpilation failed'
    );
  }

  resetSqlEngineCacheForTests();
  const wasmPath = path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm');
  const SQL = await initSqlEngine(() => wasmPath);
  const db = new SQL.Database();

  let sqlOutcome;
  try {
    sqlOutcome = executeSqlOnDatabase({
      db,
      snapshot,
      sql: transpiled.sql,
      parameters: transpiled.parameters,
      expectedSchema: algebraOutcome.schema ?? { name: 'out', attributes: [] },
    });
  } finally {
    db.close();
  }

  return compareAlgebraAndSql(algebraOutcome.relation, sqlOutcome.relation, {
    algebraReady: algebraOutcome.success && Boolean(algebraOutcome.relation),
    sqlReady: sqlOutcome.success,
    failureStage: !algebraOutcome.success ? 'algebra' : !sqlOutcome.success ? 'sql_runtime' : undefined,
    message: sqlOutcome.message,
  });
}

export async function runSqlWithCustomQuery(
  expression: string,
  sqlOverride: string
): Promise<DualPathComparison> {
  const snapshot = buildUniversitySnapshot();
  const validation = validateExpression(expression, snapshot.schemas);
  if (!validation.valid || !validation.ast) {
    throw new Error('invalid expression');
  }

  const algebraOutcome = evaluateRaAst({
    ast: validation.ast,
    relations: snapshot.relations,
  });

  const transpiled = transpileRaAst(validation.ast, snapshot.schemas);

  resetSqlEngineCacheForTests();
  const wasmPath = path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm');
  const SQL = await initSqlEngine(() => wasmPath);
  const db = new SQL.Database();

  let sqlOutcome;
  try {
    sqlOutcome = executeSqlOnDatabase({
      db,
      snapshot,
      sql: sqlOverride,
      parameters: transpiled.parameters,
      expectedSchema: algebraOutcome.schema!,
    });
  } finally {
    db.close();
  }

  return compareAlgebraAndSql(algebraOutcome.relation, sqlOutcome.relation, {
    algebraReady: Boolean(algebraOutcome.relation),
    sqlReady: sqlOutcome.success,
  });
}
