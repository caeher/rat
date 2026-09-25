import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateExpression } from '@/lib/engine/validator';
import { evaluateRaAst } from '@/lib/evaluator/evaluate';
import { transpileRaAst, toExecutableSql, translateSqlToAlgebra } from '@/lib/sql';
import { buildUniversitySnapshot } from './runtime/helpers';
import { executeSqlOnDatabase } from '@/lib/sql/runtime/execute';
import { compareAlgebraAndSql } from '@/lib/sql/runtime/compare';
import { initSqlEngine, resetSqlEngineCacheForTests } from '@/lib/sql/runtime/initSql';

const FIXTURE_EXPRESSIONS = [
  'σ gpa > 3.5 ( Students )',
  'π student_id, major_name ( Students ⋈ Majors )',
  '( π name ( Students ) ) ∪ ( π name ( Professors ) )',
];

describe('SQL → RA semantic parity (round-trip via executable SQL)', () => {
  for (const expr of FIXTURE_EXPRESSIONS) {
    it(`matches algebra for fixture: ${expr.slice(0, 40)}…`, async () => {
      const snapshot = buildUniversitySnapshot();
      const validation = validateExpression(expr, snapshot.schemas);
      expect(validation.valid, validation.diagnostics.map((d) => d.message).join('; ')).toBe(
        true
      );

      const transpiled = transpileRaAst(validation.ast!, snapshot.schemas);
      expect(transpiled.success).toBe(true);
      const executable = toExecutableSql(transpiled.sql!, transpiled.parameters);

      const reversed = translateSqlToAlgebra(executable, snapshot.schemas);
      expect(
        reversed.success,
        reversed.diagnostics.map((d) => d.message).join('; ')
      ).toBe(true);

      const reversedValidation = validateExpression(reversed.expression!, snapshot.schemas);
      expect(reversedValidation.valid).toBe(true);

      const algebraOriginal = evaluateRaAst({
        ast: validation.ast!,
        relations: snapshot.relations,
      });
      const algebraReversed = evaluateRaAst({
        ast: reversedValidation.ast!,
        relations: snapshot.relations,
      });

      resetSqlEngineCacheForTests();
      const wasmPath = path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm');
      const SQL = await initSqlEngine(() => wasmPath);
      const db = new SQL.Database();
      try {
        const sqlOutcome = executeSqlOnDatabase({
          db,
          snapshot,
          sql: transpiled.sql!,
          parameters: transpiled.parameters,
          expectedSchema: algebraOriginal.schema ?? { name: 'out', attributes: [] },
        });

        const comparison = compareAlgebraAndSql(algebraReversed.relation, sqlOutcome.relation, {
          algebraReady: algebraReversed.success && Boolean(algebraReversed.relation),
          sqlReady: sqlOutcome.success,
        });

        expect(comparison.status).toBe('match');
      } finally {
        db.close();
      }
    });
  }
});
