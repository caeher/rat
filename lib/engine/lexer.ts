/**
 * Relational Algebra Lexer & Tokenizer
 * Version: 1.0.0
 * 
 * Tokenizes Unicode characters, ASCII aliases, LaTeX commands, literals,
 * and operators while tracking exact 1-indexed (line, column) and 0-indexed char offset.
 */

import {
  Diagnostic,
  SourcePosition,
  SourceRange,
  Token,
  TokenType,
} from './types';

export interface LexerResult {
  tokens: Token[];
  diagnostics: Diagnostic[];
  isIncomplete: boolean;
}

export class Lexer {
  private input: string;
  private offset = 0;
  private line = 1;
  private column = 1;
  private tokens: Token[] = [];
  private diagnostics: Diagnostic[] = [];
  private isIncomplete = false;

  constructor(input: string) {
    this.input = input;
  }

  public tokenize(): LexerResult {
    while (this.offset < this.input.length) {
      this.skipWhitespaceAndComments();
      if (this.offset >= this.input.length) break;

      const char = this.input[this.offset];

      // 1. Quoted Identifier: `...`
      if (char === '`') {
        this.scanQuotedIdentifier();
        continue;
      }

      // 2. String Literal: '...' or "..."
      if (char === "'" || char === '"') {
        this.scanStringLiteral(char);
        continue;
      }

      // 3. LaTeX Commands: \sigma, \pi, \rho, \times, \bowtie, etc.
      if (char === '\\') {
        this.scanBackslashOrLatex();
        continue;
      }

      // 4. Multi-character ASCII joins: |><|*, |><|, |><, ><|, ><, ||, &&, ->
      if (this.matchMultiCharSymbol()) {
        continue;
      }

      // 5. Punctuation & Delimiters
      if (this.matchSinglePunctuation(char)) {
        continue;
      }

      // 6. Numbers: 0-9
      if (this.isDigit(char)) {
        this.scanNumber();
        continue;
      }

      // 7. Unicode Operators & Symbols
      if (this.matchUnicodeOperator(char)) {
        continue;
      }

      // 8. Identifiers & Keywords: [A-Za-z_][A-Za-z0-9_]*
      if (this.isIdentifierStart(char)) {
        this.scanIdentifierOrKeyword();
        continue;
      }

      // 9. Unrecognized character
      const startPos = this.currentPosition();
      this.advance();
      const endPos = this.currentPosition();
      const range: SourceRange = { start: startPos, end: endPos };
      this.diagnostics.push({
        code: 'E_UNEXPECTED_TOKEN',
        severity: 'error',
        message: `Unexpected character '${char}'.`,
        range,
      });
    }

    // Emit EOF Token
    const eofPos = this.currentPosition();
    this.tokens.push({
      type: 'EOF',
      value: '',
      raw: '',
      range: { start: eofPos, end: eofPos },
    });

    return {
      tokens: this.tokens,
      diagnostics: this.diagnostics,
      isIncomplete: this.isIncomplete,
    };
  }

  private currentPosition(): SourcePosition {
    return {
      line: this.line,
      column: this.column,
      offset: this.offset,
    };
  }

  private peek(offsetAhead = 0): string {
    const idx = this.offset + offsetAhead;
    if (idx >= this.input.length) return '';
    return this.input[idx];
  }

  private advance(count = 1): string {
    let result = '';
    for (let i = 0; i < count; i++) {
      if (this.offset >= this.input.length) break;
      const char = this.input[this.offset];
      result += char;
      this.offset++;
      if (char === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
    }
    return result;
  }

  private skipWhitespaceAndComments(): void {
    while (this.offset < this.input.length) {
      const char = this.input[this.offset];

      // Whitespace
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        this.advance();
        continue;
      }

      // Single-line comment: -- or //
      if (
        (char === '-' && this.peek(1) === '-') ||
        (char === '/' && this.peek(1) === '/')
      ) {
        this.advance(2);
        while (this.offset < this.input.length && this.peek() !== '\n') {
          this.advance();
        }
        continue;
      }

      // Block comment: /* ... */
      if (char === '/' && this.peek(1) === '*') {
        const startPos = this.currentPosition();
        this.advance(2);
        let closed = false;
        while (this.offset < this.input.length) {
          if (this.peek() === '*' && this.peek(1) === '/') {
            this.advance(2);
            closed = true;
            break;
          }
          this.advance();
        }
        if (!closed) {
          this.isIncomplete = true;
          this.diagnostics.push({
            code: 'E_SYNTAX_ERROR',
            severity: 'error',
            message: 'Unterminated block comment.',
            range: { start: startPos, end: this.currentPosition() },
          });
        }
        continue;
      }

      break;
    }
  }

  private scanQuotedIdentifier(): void {
    const startPos = this.currentPosition();
    this.advance(); // consume opening `
    let val = '';

    while (this.offset < this.input.length && this.peek() !== '`') {
      if (this.peek() === '\\') {
        this.advance(); // consume \
        if (this.offset < this.input.length) {
          val += this.advance();
        }
      } else {
        val += this.advance();
      }
    }

    if (this.offset >= this.input.length) {
      this.isIncomplete = true;
      const endPos = this.currentPosition();
      this.diagnostics.push({
        code: 'E_UNTERMINATED_STRING',
        severity: 'error',
        message: 'Unterminated quoted identifier. Expected closing backtick (`).',
        range: { start: startPos, end: endPos },
      });
      this.tokens.push({
        type: 'IDENTIFIER',
        value: val,
        raw: '`' + val,
        range: { start: startPos, end: endPos },
      });
      return;
    }

    this.advance(); // consume closing `
    const endPos = this.currentPosition();
    this.tokens.push({
      type: 'IDENTIFIER',
      value: val,
      raw: this.input.slice(startPos.offset, endPos.offset),
      range: { start: startPos, end: endPos },
    });
  }

  private scanStringLiteral(quoteChar: string): void {
    const startPos = this.currentPosition();
    this.advance(); // consume opening quote
    let val = '';

    while (this.offset < this.input.length && this.peek() !== quoteChar) {
      if (this.peek() === '\\') {
        const escStart = this.currentPosition();
        this.advance(); // consume \
        if (this.offset >= this.input.length) break;
        const escChar = this.advance();
        switch (escChar) {
          case "'":
            val += "'";
            break;
          case '"':
            val += '"';
            break;
          case '\\':
            val += '\\';
            break;
          case 'n':
            val += '\n';
            break;
          case 't':
            val += '\t';
            break;
          case 'r':
            val += '\r';
            break;
          case '0':
            val += '\0';
            break;
          default:
            this.diagnostics.push({
              code: 'E_INVALID_ESCAPE',
              severity: 'error',
              message: `Invalid escape sequence '\\${escChar}'.`,
              range: { start: escStart, end: this.currentPosition() },
            });
            val += escChar;
            break;
        }
      } else {
        val += this.advance();
      }
    }

    if (this.offset >= this.input.length) {
      this.isIncomplete = true;
      const endPos = this.currentPosition();
      this.diagnostics.push({
        code: 'E_UNTERMINATED_STRING',
        severity: 'error',
        message: `Unterminated string literal. Expected closing quote (${quoteChar}).`,
        range: { start: startPos, end: endPos },
      });
      this.tokens.push({
        type: 'STRING_LITERAL',
        value: val,
        raw: this.input.slice(startPos.offset, endPos.offset),
        range: { start: startPos, end: endPos },
      });
      return;
    }

    this.advance(); // consume closing quote
    const endPos = this.currentPosition();
    this.tokens.push({
      type: 'STRING_LITERAL',
      value: val,
      raw: this.input.slice(startPos.offset, endPos.offset),
      range: { start: startPos, end: endPos },
    });
  }

  private scanBackslashOrLatex(): void {
    const startPos = this.currentPosition();
    this.advance(); // consume '\'

    // Read following command letters
    let cmd = '';
    while (this.offset < this.input.length && /[A-Za-z_]/.test(this.peek())) {
      cmd += this.advance();
    }

    const endPos = this.currentPosition();
    const fullCmd = '\\' + cmd;
    const lowerCmd = fullCmd.toLowerCase();

    // LaTeX mapping
    switch (lowerCmd) {
      case '\\sigma':
        this.addToken('OP_SELECTION', 'σ', fullCmd, startPos, endPos);
        return;
      case '\\pi':
        this.addToken('OP_PROJECTION', 'π', fullCmd, startPos, endPos);
        return;
      case '\\rho':
        this.addToken('OP_RENAME', 'ρ', fullCmd, startPos, endPos);
        return;
      case '\\times':
        this.addToken('OP_CARTESIAN', '⨯', fullCmd, startPos, endPos);
        return;
      case '\\bowtie':
        this.addToken('OP_NATURAL_JOIN', '⋈', fullCmd, startPos, endPos);
        return;
      case '\\leftouterjoin':
      case '\\loj':
        this.addToken('OP_LEFT_JOIN', '⟕', fullCmd, startPos, endPos);
        return;
      case '\\rightouterjoin':
      case '\\roj':
        this.addToken('OP_RIGHT_JOIN', '⟖', fullCmd, startPos, endPos);
        return;
      case '\\fullouterjoin':
      case '\\foj':
        this.addToken('OP_FULL_JOIN', '⟗', fullCmd, startPos, endPos);
        return;
      case '\\div':
        this.addToken('OP_DIVISION', '÷', fullCmd, startPos, endPos);
        return;
      case '\\cap':
        this.addToken('OP_INTERSECT', '∩', fullCmd, startPos, endPos);
        return;
      case '\\cup':
        this.addToken('OP_UNION', '∪', fullCmd, startPos, endPos);
        return;
      case '\\minus':
      case '\\setminus':
        this.addToken('OP_DIFFERENCE', '−', fullCmd, startPos, endPos);
        return;
      default:
        if (cmd === '') {
          // Standalone backslash \ represents set difference in RA
          this.addToken('OP_DIFFERENCE', '−', '\\', startPos, endPos);
        } else {
          this.diagnostics.push({
            code: 'E_UNEXPECTED_TOKEN',
            severity: 'error',
            message: `Unknown LaTeX command '${fullCmd}'.`,
            range: { start: startPos, end: endPos },
          });
          this.addToken('IDENTIFIER', cmd, fullCmd, startPos, endPos);
        }
        return;
    }
  }

  private matchMultiCharSymbol(): boolean {
    const startPos = this.currentPosition();
    const remaining = this.input.slice(this.offset);

    // |><|* (Full outer join)
    if (remaining.startsWith('|><|*')) {
      this.advance(5);
      this.addToken('OP_FULL_JOIN', '⟗', '|><|*', startPos, this.currentPosition());
      return true;
    }

    // |><| (Natural join)
    if (remaining.startsWith('|><|')) {
      this.advance(4);
      this.addToken('OP_NATURAL_JOIN', '⋈', '|><|', startPos, this.currentPosition());
      return true;
    }

    // |>< (Left outer join)
    if (remaining.startsWith('|><')) {
      this.advance(3);
      this.addToken('OP_LEFT_JOIN', '⟕', '|><', startPos, this.currentPosition());
      return true;
    }

    // ><| (Right outer join)
    if (remaining.startsWith('><|')) {
      this.advance(3);
      this.addToken('OP_RIGHT_JOIN', '⟖', '><|', startPos, this.currentPosition());
      return true;
    }

    // >< (Natural join)
    if (remaining.startsWith('><')) {
      this.advance(2);
      this.addToken('OP_NATURAL_JOIN', '⋈', '><', startPos, this.currentPosition());
      return true;
    }

    // -> (Rename arrow)
    if (remaining.startsWith('->')) {
      this.advance(2);
      this.addToken('ARROW', '->', '->', startPos, this.currentPosition());
      return true;
    }

    // == (Equality)
    if (remaining.startsWith('==')) {
      this.advance(2);
      this.addToken('EQ', '=', '==', startPos, this.currentPosition());
      return true;
    }

    // != (Not equal)
    if (remaining.startsWith('!=')) {
      this.advance(2);
      this.addToken('NEQ', '!=', '!=', startPos, this.currentPosition());
      return true;
    }

    // <> (Not equal)
    if (remaining.startsWith('<>')) {
      this.advance(2);
      this.addToken('NEQ', '<>', '<>', startPos, this.currentPosition());
      return true;
    }

    // <= (Less than or equal)
    if (remaining.startsWith('<=')) {
      this.advance(2);
      this.addToken('LTE', '<=', '<=', startPos, this.currentPosition());
      return true;
    }

    // >= (Greater than or equal)
    if (remaining.startsWith('>=')) {
      this.advance(2);
      this.addToken('GTE', '>=', '>=', startPos, this.currentPosition());
      return true;
    }

    // && (Logical AND)
    if (remaining.startsWith('&&')) {
      this.advance(2);
      this.addToken('AND', 'AND', '&&', startPos, this.currentPosition());
      return true;
    }

    // || (Logical OR / Union)
    if (remaining.startsWith('||')) {
      this.advance(2);
      this.addToken('OR', 'OR', '||', startPos, this.currentPosition());
      return true;
    }

    return false;
  }

  private matchSinglePunctuation(char: string): boolean {
    const startPos = this.currentPosition();

    switch (char) {
      case '(':
        this.advance();
        this.addToken('LPAREN', '(', '(', startPos, this.currentPosition());
        return true;
      case ')':
        this.advance();
        this.addToken('RPAREN', ')', ')', startPos, this.currentPosition());
        return true;
      case '[':
        this.advance();
        this.addToken('LBRACKET', '[', '[', startPos, this.currentPosition());
        return true;
      case ']':
        this.advance();
        this.addToken('RBRACKET', ']', ']', startPos, this.currentPosition());
        return true;
      case ',':
        this.advance();
        this.addToken('COMMA', ',', ',', startPos, this.currentPosition());
        return true;
      case '.':
        this.advance();
        this.addToken('DOT', '.', '.', startPos, this.currentPosition());
        return true;
      case '=':
        this.advance();
        this.addToken('EQ', '=', '=', startPos, this.currentPosition());
        return true;
      case '<':
        this.advance();
        this.addToken('LT', '<', '<', startPos, this.currentPosition());
        return true;
      case '>':
        this.advance();
        this.addToken('GT', '>', '>', startPos, this.currentPosition());
        return true;
      case '!':
        this.advance();
        this.addToken('NOT', 'NOT', '!', startPos, this.currentPosition());
        return true;
      case '*':
        this.advance();
        this.addToken('OP_CARTESIAN', '⨯', '*', startPos, this.currentPosition());
        return true;
      case '/':
        this.advance();
        this.addToken('OP_DIVISION', '÷', '/', startPos, this.currentPosition());
        return true;
      case '-':
        this.advance();
        this.addToken('OP_DIFFERENCE', '−', '-', startPos, this.currentPosition());
        return true;
      case '^':
        this.advance();
        this.addToken('OP_INTERSECT', '∩', '^', startPos, this.currentPosition());
        return true;
      default:
        return false;
    }
  }

  private matchUnicodeOperator(char: string): boolean {
    const startPos = this.currentPosition();

    switch (char) {
      case 'σ':
        this.advance();
        this.addToken('OP_SELECTION', 'σ', 'σ', startPos, this.currentPosition());
        return true;
      case 'π':
        this.advance();
        this.addToken('OP_PROJECTION', 'π', 'π', startPos, this.currentPosition());
        return true;
      case 'ρ':
        this.advance();
        this.addToken('OP_RENAME', 'ρ', 'ρ', startPos, this.currentPosition());
        return true;
      case '⨯': // U+2A2F
      case '×': // U+00D7
        this.advance();
        this.addToken('OP_CARTESIAN', '⨯', char, startPos, this.currentPosition());
        return true;
      case '⋈': // U+22C8
        this.advance();
        this.addToken('OP_NATURAL_JOIN', '⋈', '⋈', startPos, this.currentPosition());
        return true;
      case '⟕': // U+27D5
        this.advance();
        this.addToken('OP_LEFT_JOIN', '⟕', '⟕', startPos, this.currentPosition());
        return true;
      case '⟖': // U+27D6
        this.advance();
        this.addToken('OP_RIGHT_JOIN', '⟖', '⟖', startPos, this.currentPosition());
        return true;
      case '⟗': // U+27D7
        this.advance();
        this.addToken('OP_FULL_JOIN', '⟗', '⟗', startPos, this.currentPosition());
        return true;
      case '÷': // U+00F7
        this.advance();
        this.addToken('OP_DIVISION', '÷', '÷', startPos, this.currentPosition());
        return true;
      case '∩': // U+2229
        this.advance();
        this.addToken('OP_INTERSECT', '∩', '∩', startPos, this.currentPosition());
        return true;
      case '∪': // U+222A
        this.advance();
        this.addToken('OP_UNION', '∪', '∪', startPos, this.currentPosition());
        return true;
      case '−': // U+2212 (Unicode minus)
        this.advance();
        this.addToken('OP_DIFFERENCE', '−', '−', startPos, this.currentPosition());
        return true;
      case '→': // U+2192
        this.advance();
        this.addToken('ARROW', '->', '→', startPos, this.currentPosition());
        return true;
      case '∧': // U+2227 (Logical AND)
        this.advance();
        this.addToken('AND', 'AND', '∧', startPos, this.currentPosition());
        return true;
      case '∨': // U+2228 (Logical OR)
        this.advance();
        this.addToken('OR', 'OR', '∨', startPos, this.currentPosition());
        return true;
      case '¬': // U+00AC (Logical NOT)
        this.advance();
        this.addToken('NOT', 'NOT', '¬', startPos, this.currentPosition());
        return true;
      default:
        return false;
    }
  }

  private scanNumber(): void {
    const startPos = this.currentPosition();
    let numStr = '';

    while (this.offset < this.input.length && this.isDigit(this.peek())) {
      numStr += this.advance();
    }

    // Decimal point followed by digits
    if (this.peek() === '.' && this.isDigit(this.peek(1))) {
      numStr += this.advance(); // consume '.'
      while (this.offset < this.input.length && this.isDigit(this.peek())) {
        numStr += this.advance();
      }
    }

    // Scientific notation: e+10, E-5
    if (
      (this.peek() === 'e' || this.peek() === 'E') &&
      (this.isDigit(this.peek(1)) ||
        ((this.peek(1) === '+' || this.peek(1) === '-') &&
          this.isDigit(this.peek(2))))
    ) {
      numStr += this.advance(); // consume 'e' or 'E'
      if (this.peek() === '+' || this.peek() === '-') {
        numStr += this.advance();
      }
      while (this.offset < this.input.length && this.isDigit(this.peek())) {
        numStr += this.advance();
      }
    }

    const endPos = this.currentPosition();
    this.tokens.push({
      type: 'NUMBER_LITERAL',
      value: numStr,
      raw: numStr,
      range: { start: startPos, end: endPos },
    });
  }

  private scanIdentifierOrKeyword(): void {
    const startPos = this.currentPosition();
    let ident = '';

    while (this.offset < this.input.length && this.isIdentifierPart(this.peek())) {
      ident += this.advance();
    }

    const endPos = this.currentPosition();
    const lower = ident.toLowerCase();

    // Check keywords and ASCII aliases
    switch (lower) {
      // Unary RA Operators
      case 'sigma':
      case 'select':
        this.addToken('OP_SELECTION', 'σ', ident, startPos, endPos);
        return;
      case 'pi':
      case 'project':
        this.addToken('OP_PROJECTION', 'π', ident, startPos, endPos);
        return;
      case 'rho':
      case 'rename':
      case 'rho_attr':
      case 'rename_attr':
        this.addToken('OP_RENAME', 'ρ', ident, startPos, endPos);
        return;

      // Binary RA Operators
      case 'cross':
      case 'cross_join':
        this.addToken('OP_CARTESIAN', '⨯', ident, startPos, endPos);
        return;
      case 'join':
      case 'natural_join':
        this.addToken('OP_NATURAL_JOIN', '⋈', ident, startPos, endPos);
        return;
      case 'theta_join':
      case 'join_on':
        this.addToken('OP_THETA_JOIN', '⋈_θ', ident, startPos, endPos);
        return;
      case 'left_join':
      case 'left_outer_join':
        this.addToken('OP_LEFT_JOIN', '⟕', ident, startPos, endPos);
        return;
      case 'right_join':
      case 'right_outer_join':
        this.addToken('OP_RIGHT_JOIN', '⟖', ident, startPos, endPos);
        return;
      case 'full_join':
      case 'full_outer_join':
        this.addToken('OP_FULL_JOIN', '⟗', ident, startPos, endPos);
        return;
      case 'divide':
      case 'div':
        this.addToken('OP_DIVISION', '÷', ident, startPos, endPos);
        return;
      case 'intersect':
      case 'cap':
        this.addToken('OP_INTERSECT', '∩', ident, startPos, endPos);
        return;
      case 'union':
      case 'cup':
        this.addToken('OP_UNION', '∪', ident, startPos, endPos);
        return;
      case 'minus':
      case 'diff':
      case 'difference':
      case 'except':
        this.addToken('OP_DIFFERENCE', '−', ident, startPos, endPos);
        return;

      // Predicate Keywords
      case 'and':
        this.addToken('AND', 'AND', ident, startPos, endPos);
        return;
      case 'or':
        this.addToken('OR', 'OR', ident, startPos, endPos);
        return;
      case 'not':
        this.addToken('NOT', 'NOT', ident, startPos, endPos);
        return;
      case 'is':
        this.addToken('IS', 'IS', ident, startPos, endPos);
        return;
      case 'null':
        this.addToken('NULL_LITERAL', 'null', ident, startPos, endPos);
        return;
      case 'true':
        this.addToken('BOOLEAN_LITERAL', 'true', ident, startPos, endPos);
        return;
      case 'false':
        this.addToken('BOOLEAN_LITERAL', 'false', ident, startPos, endPos);
        return;
      case 'as':
        this.addToken('ARROW', 'as', ident, startPos, endPos);
        return;

      // Single-letter aliases: 's', 'p', 'r', 'x', 'u'
      // We will tokenize as IDENTIFIER with their raw text, and parser can recognize them as unary/binary operators if in operator positions.
      // Alternatively, let's keep them as IDENTIFIER so single letter relations (like `R`, `S`, `p`, `x`) don't get mis-tokenized as operators unconditionally.
      default:
        this.tokens.push({
          type: 'IDENTIFIER',
          value: ident,
          raw: ident,
          range: { start: startPos, end: endPos },
        });
        return;
    }
  }

  private addToken(
    type: TokenType,
    value: string,
    raw: string,
    start: SourcePosition,
    end: SourcePosition
  ): void {
    this.tokens.push({
      type,
      value,
      raw,
      range: { start, end },
    });
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isIdentifierStart(char: string): boolean {
    return (
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      char === '_'
    );
  }

  private isIdentifierPart(char: string): boolean {
    return (
      this.isIdentifierStart(char) ||
      this.isDigit(char)
    );
  }
}

export function tokenize(input: string): LexerResult {
  const lexer = new Lexer(input);
  return lexer.tokenize();
}
