import { describe, expect, it } from 'vitest';
import { compareAlgebraAndSql } from '@/lib/sql/runtime/compare';
import type { RelationData } from '@/lib/engine/types';

const schema = {
  name: 'R',
  attributes: [{ name: 'a', type: 'number' as const }],
};

describe('compareAlgebraAndSql', () => {
  it('returns incomplete when either path failed', () => {
    const left: RelationData = { schema, tuples: [{ a: 1 }] };
    const result = compareAlgebraAndSql(left, undefined, {
      algebraReady: true,
      sqlReady: false,
      failureStage: 'sql_runtime',
      message: 'boom',
    });
    expect(result.status).toBe('incomplete');
  });

  it('detects unordered set equality', () => {
    const left: RelationData = { schema, tuples: [{ a: 2 }, { a: 1 }] };
    const right: RelationData = { schema, tuples: [{ a: 1 }, { a: 2 }] };
    const result = compareAlgebraAndSql(left, right, {
      algebraReady: true,
      sqlReady: true,
    });
    expect(result.status).toBe('match');
  });

  it('surfaces missing and extra tuples', () => {
    const left: RelationData = { schema, tuples: [{ a: 1 }, { a: 2 }] };
    const right: RelationData = { schema, tuples: [{ a: 2 }, { a: 3 }] };
    const result = compareAlgebraAndSql(left, right, {
      algebraReady: true,
      sqlReady: true,
    });
    expect(result.status).toBe('mismatch');
    expect(result.diff?.onlyInLeft).toEqual([{ a: 1 }]);
    expect(result.diff?.onlyInRight).toEqual([{ a: 3 }]);
  });
});
