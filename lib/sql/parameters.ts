import type { TupleValue } from '@/lib/engine/types';
import type { SqlParameter } from './types';

export class SqlParameterBinder {
  private readonly values: TupleValue[] = [];

  bind(value: TupleValue): string {
    this.values.push(value);
    return '?';
  }

  getParameters(): SqlParameter[] {
    return this.values.map((value, index) => ({
      index: index + 1,
      value,
      affinity: inferAffinity(value),
    }));
  }
}

function inferAffinity(value: TupleValue): SqlParameter['affinity'] {
  if (value === null) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return 'INTEGER';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'INTEGER' : 'REAL';
  }
  return 'TEXT';
}
