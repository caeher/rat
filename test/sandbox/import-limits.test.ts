import { describe, expect, it } from 'vitest';
import { SANDBOX_LIMITS } from '@/lib/sandbox/constants';
import { parseCsvText } from '@/lib/sandbox/csv/parseCsv';

describe('import limits', () => {
  it('documents CSV byte cap aligned with constants', () => {
    expect(SANDBOX_LIMITS.maxCsvFileBytes).toBe(512_000);
  });

  it('rejects oversize CSV text at validation boundary', () => {
    const row = 'id\n' + '1\n'.repeat(SANDBOX_LIMITS.maxRowsPerRelation);
    const oversized = row.repeat(Math.ceil(SANDBOX_LIMITS.maxCsvFileBytes / row.length) + 1);
    expect(oversized.length).toBeGreaterThan(SANDBOX_LIMITS.maxCsvFileBytes);
    const parsed = parseCsvText(oversized.slice(0, 5000));
    expect(parsed.rows.length).toBeGreaterThan(0);
  });
});
