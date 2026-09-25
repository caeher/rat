import { describe, expect, it } from 'vitest';
import { createInitialSandboxState } from '@/lib/sandbox/defaults';
import {
  buildShareHash,
  buildSharePreview,
  cloneSandboxStateWithFreshIds,
  createSharePayload,
  decompressShareToken,
  extractShareTokenFromHash,
  compressToShareToken,
  validateSharePayload,
} from '@/lib/share';
import { ShareError } from '@/lib/share/errors';

describe('share payload', () => {
  const expression = 'π name ( Employees )';
  const sandbox = createInitialSandboxState();

  it('round-trips through uncompressed codec in test env', async () => {
    const payload = createSharePayload(expression, sandbox);
    const json = JSON.stringify(payload);
    const token = await compressToShareToken(json);
    const decoded = await decompressShareToken(token);
    const parsed = validateSharePayload(JSON.parse(decoded) as unknown);
    expect(parsed.expression).toBe(expression);
    expect(parsed.sandbox.schemaSets).toHaveLength(sandbox.schemaSets.length);
  });

  it('extracts hash fragment', () => {
    const hash = buildShareHash('u.abc');
    expect(extractShareTokenFromHash(hash)).toBe('u.abc');
    expect(extractShareTokenFromHash('#other')).toBeNull();
  });

  it('clones sandbox with fresh ids', () => {
    const clone = cloneSandboxStateWithFreshIds(sandbox);
    expect(clone.schemaSets[0].id).not.toBe(sandbox.schemaSets[0].id);
    expect(clone.schemaSets[0].relations[0].id).not.toBe(sandbox.schemaSets[0].relations[0].id);
  });

  it('rejects unsupported versions', () => {
    expect(() =>
      validateSharePayload({
        v: 99,
        expression: 'σ true (R)',
        sandbox,
      })
    ).toThrow(ShareError);
  });

  it('builds preview counts', () => {
    const preview = buildSharePreview(expression, sandbox, 100);
    expect(preview.relationCount).toBeGreaterThan(0);
    expect(preview.rowCount).toBeGreaterThan(0);
  });
});
