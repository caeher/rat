import { describe, expect, it } from 'vitest';
import { classifyCellDisplay, parseCellInput } from '@/lib/sandbox/validateCell';

describe('sandbox cell validation', () => {
  it('parses numbers and rejects malformed values', () => {
    expect(parseCellInput('42', 'number', false)).toEqual({ ok: true, value: 42 });
    expect(parseCellInput('abc', 'number', false).ok).toBe(false);
  });

  it('allows NULL only when nullable', () => {
    expect(parseCellInput('NULL', 'string', true)).toEqual({ ok: true, value: null });
    expect(parseCellInput('NULL', 'string', false).ok).toBe(false);
  });

  it('classifies display kinds', () => {
    expect(classifyCellDisplay(null, 'string')).toBe('null');
    expect(classifyCellDisplay('', 'string')).toBe('empty_string');
    expect(classifyCellDisplay(0, 'number')).toBe('zero');
  });
});
