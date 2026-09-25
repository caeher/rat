import { areRelationsEqual, deduplicateTuples, tupleToKey } from '@/lib/engine/contract';
import type { RelationData, Tuple } from '@/lib/engine/types';
import type { DualPathComparison, RelationSetDiff } from './types';

export function diffRelationSets(left: RelationData, right: RelationData): RelationSetDiff {
  const leftDistinct = deduplicateTuples(left.tuples, left.schema);
  const rightDistinct = deduplicateTuples(right.tuples, right.schema);

  const rightKeys = new Map<string, Tuple>();
  for (const t of rightDistinct) {
    rightKeys.set(tupleToKey(t, right.schema), t);
  }

  const leftKeys = new Map<string, Tuple>();
  for (const t of leftDistinct) {
    leftKeys.set(tupleToKey(t, left.schema), t);
  }

  const onlyInLeft: Tuple[] = [];
  for (const t of leftDistinct) {
    const key = tupleToKey(t, left.schema);
    if (!rightKeys.has(key)) {
      onlyInLeft.push(t);
    }
  }

  const onlyInRight: Tuple[] = [];
  for (const t of rightDistinct) {
    const key = tupleToKey(t, right.schema);
    if (!leftKeys.has(key)) {
      onlyInRight.push(t);
    }
  }

  return { onlyInLeft, onlyInRight };
}

export function compareAlgebraAndSql(
  algebra: RelationData | undefined,
  sql: RelationData | undefined,
  options: {
    algebraReady: boolean;
    sqlReady: boolean;
    failureStage?: DualPathComparison['failureStage'];
    message?: string;
  }
): DualPathComparison {
  const algebraRowCount = algebra?.tuples.length ?? 0;
  const sqlRowCount = sql?.tuples.length ?? 0;

  if (!options.algebraReady || !options.sqlReady) {
    return {
      status: 'incomplete',
      algebraReady: options.algebraReady,
      sqlReady: options.sqlReady,
      failureStage: options.failureStage,
      message: options.message,
      algebraRowCount,
      sqlRowCount,
    };
  }

  if (!algebra || !sql) {
    return {
      status: 'incomplete',
      algebraReady: false,
      sqlReady: false,
      failureStage: options.failureStage ?? 'comparison',
      message: options.message ?? 'Missing relation data for comparison.',
      algebraRowCount,
      sqlRowCount,
    };
  }

  const equal = areRelationsEqual(algebra, sql);
  if (equal) {
    return {
      status: 'match',
      algebraReady: true,
      sqlReady: true,
      algebraRowCount,
      sqlRowCount,
    };
  }

  const diff = diffRelationSets(algebra, sql);
  return {
    status: 'mismatch',
    algebraReady: true,
    sqlReady: true,
    algebraRowCount,
    sqlRowCount,
    diff,
    message: 'Algebra and SQL result sets differ (unordered tuple comparison).',
  };
}
