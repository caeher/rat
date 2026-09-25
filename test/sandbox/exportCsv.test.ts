import { describe, it, expect } from 'vitest';
import {
  CSV_NULL_TOKEN,
  escapeCsvField,
  serializeRelationToCsv,
} from '@/lib/sandbox/csv/exportCsv';
import { applySpreadsheetSafeExport } from '@/lib/sandbox/csv/spreadsheetSafe';
import { getResultExportEligibility } from '@/lib/sandbox/resultExport';
import type { RelationSchema } from '@/lib/engine/types';

const schema: RelationSchema = {
  name: 'R',
  attributes: [
    { name: 'a', type: 'string', nullable: true },
    { name: 'b', type: 'number', nullable: false },
  ],
};

describe('escapeCsvField', () => {
  it('quotes fields with commas and newlines', () => {
    expect(escapeCsvField('hello, world')).toBe('"hello, world"');
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('leaves simple tokens unquoted', () => {
    expect(escapeCsvField('plain')).toBe('plain');
  });
});

describe('serializeRelationToCsv', () => {
  it('exports NULL and empty string distinctly', () => {
    const { csv } = serializeRelationToCsv(schema, [
      { a: null, b: 1 },
      { a: '', b: 2 },
    ]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('a,b');
    expect(lines[1]).toBe(`${CSV_NULL_TOKEN},1`);
    expect(lines[2]).toBe('"",2');
  });

  it('includes all rows regardless of display paging', () => {
    const rows = Array.from({ length: 120 }, (_, i) => ({ a: `r${i}`, b: i }));
    const { csv } = serializeRelationToCsv(schema, rows);
    expect(csv.split('\r\n').length).toBe(121);
  });

  it('applies spreadsheet-safe prefix for formula-like strings', () => {
    const { csv, spreadsheetSafeTransformCount } = serializeRelationToCsv(
      { name: 'R', attributes: [{ name: 'x', type: 'string', nullable: false }] },
      [{ x: '=1+1' }],
      { spreadsheetSafe: true }
    );
    expect(csv).toContain("'=1+1");
    expect(spreadsheetSafeTransformCount).toBe(1);
  });
});

describe('applySpreadsheetSafeExport', () => {
  it('prefixes dangerous leading characters', () => {
    expect(applySpreadsheetSafeExport('=SUM(A1)').prefixed).toBe(true);
    expect(applySpreadsheetSafeExport('normal').prefixed).toBe(false);
  });
});

describe('getResultExportEligibility', () => {
  it('blocks stale and failed exports', () => {
    expect(
      getResultExportEligibility({ phase: 'stale', schema, rows: [] }).ok
    ).toBe(false);
    expect(
      getResultExportEligibility({
        phase: 'failed',
        schema,
        rows: [],
        algebraError: 'boom',
      }).ok
    ).toBe(false);
  });

  it('allows successful complete results', () => {
    const eligibility = getResultExportEligibility({
      phase: 'success',
      schema,
      rows: [{ a: 'x', b: 1 }],
    });
    expect(eligibility.ok).toBe(true);
  });
});
