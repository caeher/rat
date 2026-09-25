import { describe, expect, it } from 'vitest';
import { parseCsvText } from '@/lib/sandbox/csv/parseCsv';
import { validateCsvImport, buildDefaultMappings } from '@/lib/sandbox/csv/validateImport';
import { inferColumnTypes } from '@/lib/sandbox/csv/inferTypes';

describe('parseCsvText', () => {
  it('handles UTF-8 BOM and quoted commas', () => {
    const text = '\uFEFFid,name\n1,"Smith, Jr."';
    const parsed = parseCsvText(text);
    expect(parsed.headers).toEqual(['id', 'name']);
    expect(parsed.rows[0]).toEqual(['1', 'Smith, Jr.']);
  });

  it('parses embedded newlines inside quotes', () => {
    const text = 'a,b\n"line1\nline2",2';
    const parsed = parseCsvText(text);
    expect(parsed.rows[0][0]).toBe('line1\nline2');
    expect(parsed.rows[0][1]).toBe('2');
  });

  it('escapes doubled quotes', () => {
    const text = 'note,val\n"He said ""hi""",x';
    const parsed = parseCsvText(text);
    expect(parsed.rows[0][0]).toBe('He said "hi"');
  });

  it('renames duplicate headers', () => {
    const text = 'id,id\n1,2';
    const parsed = parseCsvText(text);
    expect(parsed.headers).toEqual(['id', 'id_2']);
    expect(parsed.duplicateHeaders).toContain('id');
  });

  it('respects semicolon delimiter override', () => {
    const text = 'a;b\n1;2';
    const parsed = parseCsvText(text, { delimiter: ';' });
    expect(parsed.delimiter).toBe(';');
    expect(parsed.rows[0]).toEqual(['1', '2']);
  });
});

describe('validateCsvImport', () => {
  it('reports invalid numeric cells with row and column', () => {
    const csv = parseCsvText('score\n10\nnot_a_number');
    const guesses = inferColumnTypes(csv.rows, csv.headers.length);
    const mappings = buildDefaultMappings(csv.headers, guesses);
    mappings[0].type = 'number';
    mappings[0].nullable = false;
    const result = validateCsvImport(csv.headers, csv.rows, mappings, 'Scores');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.row).toBe(3);
      expect(result.errors[0]?.column).toBe('score');
    }
  });

  it('imports valid rows atomically', () => {
    const csv = parseCsvText('id,name\n1,Ada\n2,Alan');
    const guesses = inferColumnTypes(csv.rows, csv.headers.length);
    const mappings = buildDefaultMappings(csv.headers, guesses);
    mappings[0].type = 'number';
    mappings[0].nullable = false;
    const result = validateCsvImport(csv.headers, csv.rows, mappings, 'People');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].id).toBe(1);
    }
  });
});
