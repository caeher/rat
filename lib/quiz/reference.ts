import type { RelationSchema } from '@/lib/engine/types';
import { validateExpression } from '@/lib/engine/validator';
import { evaluateReference } from '@/lib/exercises/grade';
import type { Exercise } from '@/lib/exercises/types';
import type { SandboxSnapshot } from '@/lib/sandbox/types';
import { transpileRaAst } from '@/lib/sql';
import { toExecutableSql } from '@/lib/sql/executable';
import type { SqlParameter } from '@/lib/sql/types';

export interface ResolvedReferenceSql {
  sql: string;
  parameters: SqlParameter[];
  executableSql: string;
}

export function resolveReferenceSql(
  exercise: Exercise,
  snapshot: SandboxSnapshot
): ResolvedReferenceSql | null {
  const validation = validateExpression(exercise.referenceExpression, snapshot.schemas);
  if (!validation.valid || !validation.ast) return null;

  const transpiled = transpileRaAst(validation.ast, snapshot.schemas);
  if (!transpiled.success || !transpiled.sql) return null;

  return {
    sql: transpiled.sql,
    parameters: transpiled.parameters,
    executableSql: toExecutableSql(transpiled.sql, transpiled.parameters),
  };
}

export function buildExpectedSchema(exercise: Exercise, snapshot: SandboxSnapshot): RelationSchema {
  const fromReference = evaluateReference(exercise, snapshot);
  if (fromReference?.schema.attributes.length) {
    return {
      name: 'quiz_result',
      attributes: fromReference.schema.attributes.filter((a) =>
        exercise.expectedColumns.includes(a.name)
      ),
    };
  }

  return {
    name: 'quiz_result',
    attributes: exercise.expectedColumns.map((name) => ({ name, type: 'null' as const })),
  };
}
