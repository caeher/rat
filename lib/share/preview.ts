import type { SandboxSharePayloadV1, SharePreview } from './types';
import type { SandboxState } from '@/lib/sandbox/types';

function countRows(state: SandboxState): number {
  let total = 0;
  for (const set of state.schemaSets) {
    for (const rel of set.relations) {
      total += rel.rows.length;
    }
  }
  return total;
}

function countRelations(state: SandboxState): number {
  return state.schemaSets.reduce((n, set) => n + set.relations.length, 0);
}

export function buildSharePreview(
  expression: string,
  sandbox: SandboxState,
  approxDecodedBytes?: number
): SharePreview {
  const active = sandbox.schemaSets.find((s) => s.id === sandbox.activeSchemaSetId);
  return {
    expression,
    schemaSetName: active?.name ?? 'Unknown schema set',
    schemaSetCount: sandbox.schemaSets.length,
    relationCount: countRelations(sandbox),
    rowCount: countRows(sandbox),
    approxDecodedBytes: approxDecodedBytes ?? 0,
  };
}

export function previewFromPayload(payload: SandboxSharePayloadV1, approxDecodedBytes: number): SharePreview {
  return buildSharePreview(payload.expression, payload.sandbox, approxDecodedBytes);
}
