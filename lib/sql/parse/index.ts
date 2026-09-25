import type { Diagnostic } from '@/lib/engine/types';
import type { SqlQuery } from '../ast/types';
import { SqlParser } from './parser';

export interface ParseSqlResult {
  ast: SqlQuery | null;
  diagnostics: Diagnostic[];
}

export function parseSql(input: string): ParseSqlResult {
  const parser = new SqlParser(input);
  return parser.parse();
}
