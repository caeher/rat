import type { RelationSchema, Tuple } from '@/lib/engine/types';

export type ResultRunPhase = 'idle' | 'running' | 'success' | 'empty' | 'failed' | 'stale';

export interface ResultExportContext {
  phase: ResultRunPhase;
  schema?: RelationSchema;
  rows?: Tuple[];
  algebraError?: string;
  /** True when evaluation did not finish successfully (limits, runtime error). */
  incomplete?: boolean;
}

export type ResultExportEligibility =
  | { ok: true; schema: RelationSchema; rows: Tuple[] }
  | { ok: false; reason: string };

export function deriveRunPhase(args: {
  isEvaluating: boolean;
  hasSnapshot: boolean;
  algebraError?: string;
  schema?: RelationSchema;
  rowCount: number;
  isStale: boolean;
}): ResultRunPhase {
  if (args.isEvaluating) return 'running';
  if (!args.hasSnapshot) return 'idle';
  if (args.isStale) return 'stale';
  if (args.algebraError || !args.schema) return 'failed';
  if (args.rowCount === 0) return 'empty';
  return 'success';
}

export function getResultExportEligibility(ctx: ResultExportContext): ResultExportEligibility {
  if (ctx.phase === 'idle' || ctx.phase === 'running') {
    return { ok: false, reason: 'Run a query and wait for completion before exporting.' };
  }
  if (ctx.phase === 'stale') {
    return {
      ok: false,
      reason: 'Results are out of date — run again after your latest edits before exporting.',
    };
  }
  if (ctx.phase === 'failed' || ctx.incomplete || ctx.algebraError) {
    return { ok: false, reason: 'The last run did not produce a complete algebra result to export.' };
  }
  if (ctx.phase !== 'success' && ctx.phase !== 'empty') {
    return { ok: false, reason: 'The last run is not a complete successful result.' };
  }
  if (!ctx.schema) {
    return { ok: false, reason: 'No result schema is available from the last run.' };
  }
  const rows = ctx.rows ?? [];
  return { ok: true, schema: ctx.schema, rows };
}
