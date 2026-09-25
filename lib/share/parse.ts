import { decompressShareToken, extractShareTokenFromHash } from './codec';
import { previewFromPayload } from './preview';
import { validateSharePayload } from './validate';
import type { ShareParseResult } from './types';
import { ShareError } from './errors';

export async function parseShareFromLocationHash(hash: string): Promise<ShareParseResult> {
  const token = extractShareTokenFromHash(hash);
  if (!token) {
    return { ok: false, code: 'missing', message: 'No share payload in the URL.' };
  }

  try {
    const json = await decompressShareToken(token);
    const raw: unknown = JSON.parse(json);
    const payload = validateSharePayload(raw);
    const approxBytes = new TextEncoder().encode(json).length;
    return { ok: true, payload, preview: previewFromPayload(payload, approxBytes) };
  } catch (error) {
    if (error instanceof ShareError) {
      return { ok: false, code: error.code, message: error.message };
    }
    if (error instanceof SyntaxError) {
      return { ok: false, code: 'malformed', message: 'Share link contains invalid JSON.' };
    }
    return { ok: false, code: 'malformed', message: 'Could not read the share link.' };
  }
}
