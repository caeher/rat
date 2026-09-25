import { withBasePath } from '@/lib/paths';
import type { SandboxState } from '@/lib/sandbox/types';
import { SHARE_PAYLOAD_VERSION, SHARE_URL_SAFE_MAX_CHARS } from './constants';
import { compressToShareToken, buildShareHash } from './codec';
import { buildSharePreview } from './preview';
import { buildWorkspaceFileBundle } from './workspaceFile';
import type { SandboxSharePayloadV1, ShareBuildResult } from './types';

export function createSharePayload(
  expression: string,
  sandbox: SandboxState,
  meta?: SandboxSharePayloadV1['meta']
): SandboxSharePayloadV1 {
  const active = sandbox.schemaSets.find((s) => s.id === sandbox.activeSchemaSetId);
  return {
    v: SHARE_PAYLOAD_VERSION,
    expression,
    sandbox,
    meta: {
      schemaSetName: active?.name,
      sharedAt: Date.now(),
      ...meta,
    },
  };
}

export function resolveSandboxShareUrl(origin: string, hash: string): string {
  const path = withBasePath('/sandbox');
  return `${origin.replace(/\/+$/, '')}${path}${hash}`;
}

export async function buildPortableShareLink(
  origin: string,
  expression: string,
  sandbox: SandboxState
): Promise<ShareBuildResult> {
  const payload = createSharePayload(expression, sandbox);
  const json = JSON.stringify(payload);
  const preview = buildSharePreview(expression, sandbox, new TextEncoder().encode(json).length);

  try {
    const token = await compressToShareToken(json);
    const hash = buildShareHash(token);
    const url = resolveSandboxShareUrl(origin, hash);
    if (url.length > SHARE_URL_SAFE_MAX_CHARS) {
      return {
        ok: false,
        reason: 'oversized',
        preview,
        bundle: buildWorkspaceFileBundle(expression, sandbox),
      };
    }
    return { ok: true, url, encodedLength: url.length, preview };
  } catch {
    return {
      ok: false,
      reason: 'oversized',
      preview,
      bundle: buildWorkspaceFileBundle(expression, sandbox),
    };
  }
}
