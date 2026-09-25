import initSqlJs from 'sql.js';
import type { SqlJsStatic } from './execute';

let cached: SqlJsStatic | null = null;

export async function initSqlEngine(locateWasm: () => string): Promise<SqlJsStatic> {
  if (cached) {
    return cached;
  }
  const SQL = await initSqlJs({
    locateFile: locateWasm,
  });
  cached = SQL as SqlJsStatic;
  return cached;
}

export function resetSqlEngineCacheForTests(): void {
  cached = null;
}
