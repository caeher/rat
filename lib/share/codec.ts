import {
  SHARE_DECODED_MAX_BYTES,
  SHARE_ENCODED_MAX_BYTES,
  SHARE_HASH_PREFIX,
} from './constants';
import { ShareError } from './errors';

const BASE64_URL_CHARS = /^[A-Za-z0-9_-]+$/;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(encoded: string): Uint8Array {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function assertDecodedSize(text: string): void {
  const bytes = utf8ByteLength(text);
  if (bytes > SHARE_DECODED_MAX_BYTES) {
    throw new ShareError(
      'too_large',
      `Shared content is too large (${bytes} bytes decoded; limit is ${SHARE_DECODED_MAX_BYTES}).`
    );
  }
}

export async function compressToShareToken(json: string): Promise<string> {
  assertDecodedSize(json);

  const blob = new Blob([json]);
  const canCompress =
    typeof CompressionStream !== 'undefined' &&
    typeof blob.stream === 'function';

  if (!canCompress) {
    const encoded = bytesToBase64Url(new TextEncoder().encode(json));
    return `u.${encoded}`;
  }

  const input = blob.stream();
  const compressed = input.pipeThrough(new CompressionStream('deflate'));
  const buffer = await new Response(compressed).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length > SHARE_ENCODED_MAX_BYTES) {
    throw new ShareError('too_large', 'Compressed share payload exceeds the safe size limit.');
  }
  return `z.${bytesToBase64Url(bytes)}`;
}

export async function decompressShareToken(token: string): Promise<string> {
  const dot = token.indexOf('.');
  if (dot < 1) {
    throw new ShareError('malformed', 'Share encoding is missing a compression prefix.');
  }
  const mode = token.slice(0, dot);
  const body = token.slice(dot + 1);
  if (!BASE64_URL_CHARS.test(body)) {
    throw new ShareError('malformed', 'Share encoding contains invalid characters.');
  }
  if (body.length > SHARE_ENCODED_MAX_BYTES * 1.4) {
    throw new ShareError('too_large', 'Share link payload is too large to import.');
  }

  try {
    if (mode === 'u') {
      const bytes = base64UrlToBytes(body);
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      assertDecodedSize(text);
      return text;
    }
    if (mode === 'z') {
      if (typeof DecompressionStream === 'undefined') {
        throw new ShareError('malformed', 'This browser cannot decompress shared links. Use a workspace file instead.');
      }
      const compressed = base64UrlToBytes(body);
      const input = new Blob([compressed]).stream();
      const decompressed = input.pipeThrough(new DecompressionStream('deflate'));
      const buffer = await new Response(decompressed).arrayBuffer();
      const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      assertDecodedSize(text);
      return text;
    }
    throw new ShareError('malformed', `Unknown share compression mode "${mode}".`);
  } catch (error) {
    if (error instanceof ShareError) throw error;
    if (error instanceof TypeError) {
      throw new ShareError('unicode', 'Share payload contains invalid Unicode data.');
    }
    throw new ShareError('malformed', 'Could not decode the share link payload.');
  }
}

export function extractShareTokenFromHash(hash: string): string | null {
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!trimmed.startsWith(SHARE_HASH_PREFIX)) return null;
  const token = trimmed.slice(SHARE_HASH_PREFIX.length);
  return token.length > 0 ? token : null;
}

export function buildShareHash(token: string): string {
  return `#${SHARE_HASH_PREFIX}${token}`;
}
