import { describe, it, expect } from 'vitest';
import { tokenize } from '@/lib/engine/lexer';

describe('Relational Algebra Lexer & Tokenizer', () => {
  describe('Unicode Operator Glyphs', () => {
    it('tokenizes all Unicode relational operators correctly', () => {
      const input = 'σ π ρ ⨯ × ⋈ ⟕ ⟖ ⟗ ÷ ∩ ∪ − → ∧ ∨ ¬';
      const { tokens, diagnostics } = tokenize(input);

      expect(diagnostics).toHaveLength(0);
      const tokenTypes = tokens.map((t) => t.type);
      expect(tokenTypes).toEqual([
        'OP_SELECTION',
        'OP_PROJECTION',
        'OP_RENAME',
        'OP_CARTESIAN',
        'OP_CARTESIAN',
        'OP_NATURAL_JOIN',
        'OP_LEFT_JOIN',
        'OP_RIGHT_JOIN',
        'OP_FULL_JOIN',
        'OP_DIVISION',
        'OP_INTERSECT',
        'OP_UNION',
        'OP_DIFFERENCE',
        'ARROW',
        'AND',
        'OR',
        'NOT',
        'EOF',
      ]);
    });
  });

  describe('ASCII and Keyword Operator Aliases', () => {
    it('tokenizes ASCII aliases case-insensitively', () => {
      const input =
        'sigma SELECT pi PROJECT rho RENAME cross cross_join join natural_join theta_join join_on left_join left_outer_join right_join right_outer_join full_join full_outer_join divide div intersect cap union cup minus diff difference except AND OR NOT IS NULL TRUE FALSE as';
      const { tokens, diagnostics } = tokenize(input);

      expect(diagnostics).toHaveLength(0);
      const tokenTypes = tokens.map((t) => t.type);
      expect(tokenTypes).toEqual([
        'OP_SELECTION',
        'OP_SELECTION',
        'OP_PROJECTION',
        'OP_PROJECTION',
        'OP_RENAME',
        'OP_RENAME',
        'OP_CARTESIAN',
        'OP_CARTESIAN',
        'OP_NATURAL_JOIN',
        'OP_NATURAL_JOIN',
        'OP_THETA_JOIN',
        'OP_THETA_JOIN',
        'OP_LEFT_JOIN',
        'OP_LEFT_JOIN',
        'OP_RIGHT_JOIN',
        'OP_RIGHT_JOIN',
        'OP_FULL_JOIN',
        'OP_FULL_JOIN',
        'OP_DIVISION',
        'OP_DIVISION',
        'OP_INTERSECT',
        'OP_INTERSECT',
        'OP_UNION',
        'OP_UNION',
        'OP_DIFFERENCE',
        'OP_DIFFERENCE',
        'OP_DIFFERENCE',
        'OP_DIFFERENCE',
        'AND',
        'OR',
        'NOT',
        'IS',
        'NULL_LITERAL',
        'BOOLEAN_LITERAL',
        'BOOLEAN_LITERAL',
        'ARROW',
        'EOF',
      ]);
    });
  });

  describe('LaTeX Aliases', () => {
    it('tokenizes LaTeX commands properly', () => {
      const input =
        '\\sigma \\pi \\rho \\times \\bowtie \\leftouterjoin \\loj \\rightouterjoin \\roj \\fullouterjoin \\foj \\div \\cap \\cup \\minus \\setminus';
      const { tokens, diagnostics } = tokenize(input);

      expect(diagnostics).toHaveLength(0);
      const tokenTypes = tokens.map((t) => t.type);
      expect(tokenTypes).toEqual([
        'OP_SELECTION',
        'OP_PROJECTION',
        'OP_RENAME',
        'OP_CARTESIAN',
        'OP_NATURAL_JOIN',
        'OP_LEFT_JOIN',
        'OP_LEFT_JOIN',
        'OP_RIGHT_JOIN',
        'OP_RIGHT_JOIN',
        'OP_FULL_JOIN',
        'OP_FULL_JOIN',
        'OP_DIVISION',
        'OP_INTERSECT',
        'OP_UNION',
        'OP_DIFFERENCE',
        'OP_DIFFERENCE',
        'EOF',
      ]);
    });

    it('tokenizes standalone backslash as set difference', () => {
      const input = 'R \\ S';
      const { tokens, diagnostics } = tokenize(input);
      expect(diagnostics).toHaveLength(0);
      expect(tokens[1].type).toBe('OP_DIFFERENCE');
    });
  });

  describe('ASCII Join Symbols & Comparisons', () => {
    it('tokenizes multi-char ASCII joins without ambiguity', () => {
      const input = '|><|* |><| |>< ><| >< -> == != <> <= >= && ||';
      const { tokens, diagnostics } = tokenize(input);

      expect(diagnostics).toHaveLength(0);
      const tokenTypes = tokens.map((t) => t.type);
      expect(tokenTypes).toEqual([
        'OP_FULL_JOIN',
        'OP_NATURAL_JOIN',
        'OP_LEFT_JOIN',
        'OP_RIGHT_JOIN',
        'OP_NATURAL_JOIN',
        'ARROW',
        'EQ',
        'NEQ',
        'NEQ',
        'LTE',
        'GTE',
        'AND',
        'OR',
        'EOF',
      ]);
    });
  });

  describe('Literals & Escapes', () => {
    it('parses string literals with valid escape sequences', () => {
      const input = `'Hello \\'World\\'' "Line 1\\nLine 2\\tTabbed"`;
      const { tokens, diagnostics } = tokenize(input);

      expect(diagnostics).toHaveLength(0);
      expect(tokens[0].type).toBe('STRING_LITERAL');
      expect(tokens[0].value).toBe("Hello 'World'");
      expect(tokens[1].type).toBe('STRING_LITERAL');
      expect(tokens[1].value).toBe('Line 1\nLine 2\tTabbed');
    });

    it('emits diagnostic on unterminated string literal and flags incomplete', () => {
      const input = "'Unfinished string";
      const { tokens, diagnostics, isIncomplete } = tokenize(input);

      expect(tokens).toHaveLength(2); // Partial string + EOF
      expect(isIncomplete).toBe(true);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('E_UNTERMINATED_STRING');
    });

    it('emits diagnostic on invalid escape sequence', () => {
      const input = "'Invalid \\k escape'";
      const { diagnostics } = tokenize(input);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('E_INVALID_ESCAPE');
    });

    it('parses numeric literals including floats and scientific notation', () => {
      const input = '42 3.14159 1e6 2.5e-3';
      const { tokens, diagnostics } = tokenize(input);

      expect(diagnostics).toHaveLength(0);
      expect(tokens[0].value).toBe('42');
      expect(tokens[1].value).toBe('3.14159');
      expect(tokens[2].value).toBe('1e6');
      expect(tokens[3].value).toBe('2.5e-3');
    });

    it('parses quoted identifiers with backticks', () => {
      const input = '`First Name` `Department ID`';
      const { tokens, diagnostics } = tokenize(input);

      expect(diagnostics).toHaveLength(0);
      expect(tokens[0].type).toBe('IDENTIFIER');
      expect(tokens[0].value).toBe('First Name');
      expect(tokens[1].type).toBe('IDENTIFIER');
      expect(tokens[1].value).toBe('Department ID');
    });
  });

  describe('Source Range Accuracy', () => {
    it('tracks exact 1-indexed line/column and 0-indexed offset', () => {
      const input = 'σ salary > 50000\n( Employees )';
      const { tokens } = tokenize(input);

      // 'σ' at line 1, col 1..2, offset 0..1
      expect(tokens[0].type).toBe('OP_SELECTION');
      expect(tokens[0].range.start).toEqual({ line: 1, column: 1, offset: 0 });
      expect(tokens[0].range.end).toEqual({ line: 1, column: 2, offset: 1 });

      // 'salary' at line 1, col 3..9, offset 2..8
      expect(tokens[1].type).toBe('IDENTIFIER');
      expect(tokens[1].range.start).toEqual({ line: 1, column: 3, offset: 2 });
      expect(tokens[1].range.end).toEqual({ line: 1, column: 9, offset: 8 });

      // '(' at line 2, col 1..2
      expect(tokens[4].type).toBe('LPAREN');
      expect(tokens[4].range.start.line).toBe(2);
      expect(tokens[4].range.start.column).toBe(1);

      // 'Employees' at line 2, col 3..12
      expect(tokens[5].type).toBe('IDENTIFIER');
      expect(tokens[5].value).toBe('Employees');
      expect(tokens[5].range.start.line).toBe(2);
      expect(tokens[5].range.start.column).toBe(3);
    });
  });
});
