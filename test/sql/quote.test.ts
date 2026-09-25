import { describe, expect, it } from 'vitest';
import { formatIdentifier, escapeStringLiteral, formatLiteralValue } from '@/lib/sql/quote';

describe('SQL quoting', () => {
  it('quotes reserved SQL keywords', () => {
    expect(formatIdentifier('order')).toBe('"order"');
    expect(formatIdentifier('SELECT')).toBe('"SELECT"');
  });

  it('leaves safe identifiers unquoted', () => {
    expect(formatIdentifier('student_id')).toBe('student_id');
  });

  it('escapes single quotes in literals', () => {
    expect(escapeStringLiteral("O'Reilly")).toBe("'O''Reilly'");
    expect(formatLiteralValue("a'b")).toBe("'a''b'");
  });
});
