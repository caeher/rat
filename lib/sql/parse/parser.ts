import type { Diagnostic, SourceRange } from '@/lib/engine/types';
import type {
  SqlColumnRef,
  SqlExpr,
  SqlFromClause,
  SqlJoinKind,
  SqlJoinNode,
  SqlQuery,
  SqlSelectItem,
  SqlSelectQuery,
  SqlSetOperation,
  SqlSetQuery,
  SqlTableRef,
} from '../ast/types';
import { tokenizeSql, type SqlToken } from './lexer';
import { emptySqlRange } from '../ranges';

export class SqlParser {
  private tokens: SqlToken[];
  private current = 0;
  private diagnostics: Diagnostic[] = [];

  constructor(input: string) {
    const lexed = tokenizeSql(input);
    this.tokens = lexed.tokens;
    this.diagnostics.push(...lexed.diagnostics);
  }

  parse(): { ast: SqlQuery | null; diagnostics: Diagnostic[] } {
    if (this.diagnostics.some((d) => d.severity === 'error')) {
      return { ast: null, diagnostics: this.diagnostics };
    }
    if (this.check('EOF')) {
      this.diagnostics.push({
        code: 'E_SQL_PARSE',
        severity: 'error',
        message: 'Enter a SQL query to translate.',
        range: emptySqlRange(),
      });
      return { ast: null, diagnostics: this.diagnostics };
    }

    try {
      const ast: SqlQuery = this.parseQuery();
      if (!this.check('EOF')) {
        this.diagnostics.push({
          code: 'E_SQL_PARSE',
          severity: 'error',
          message: 'Unexpected tokens after the SQL query.',
          range: this.peek().range,
        });
        return { ast: null, diagnostics: this.diagnostics };
      }
      return { ast, diagnostics: this.diagnostics };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'SQL parse failed.';
      this.diagnostics.push({
        code: 'E_SQL_PARSE',
        severity: 'error',
        message,
        range: this.peek().range,
      });
      return { ast: null, diagnostics: this.diagnostics };
    }
  }

  private parseQuery(): SqlQuery {
    let left = this.parseSelectOrParen();
    while (this.matchKeyword('UNION', 'INTERSECT', 'EXCEPT')) {
      const opToken = this.previous();
      const operator =
        opToken.value === 'UNION'
          ? 'union'
          : opToken.value === 'INTERSECT'
            ? 'intersect'
            : 'except';
      const all = this.matchKeyword('ALL');
      const right = this.parseSelectOrParen();
      const operation: SqlSetOperation = {
        operator,
        all,
        right,
        range: { start: opToken.range.start, end: right.range.end },
      };
      const node: SqlSetQuery = {
        type: 'set',
        left,
        operation,
        range: { start: left.range.start, end: right.range.end },
      };
      left = node;
    }
    return left;
  }

  private parseSelectOrParen(): SqlQuery {
    if (this.matchPunct('(')) {
      const inner = this.parseQuery();
      this.consumePunct(')', "Expected ')' after grouped query.");
      return inner;
    }
    return this.parseSelect();
  }

  private parseSelect(): SqlSelectQuery {
    const start = this.consumeKeyword('SELECT', "Expected SELECT.");
    const distinct = this.matchKeyword('DISTINCT');
    const columns = this.parseSelectList();
    let from: SqlFromClause | undefined;
    if (this.matchKeyword('FROM')) {
      from = this.parseFrom();
    }
    let where: SqlExpr | undefined;
    if (this.matchKeyword('WHERE')) {
      where = this.parseExpr();
    }
    this.rejectUnsupportedClauses();
    const end = this.previous().range.end;
    return {
      type: 'select',
      distinct,
      columns,
      from,
      where,
      range: { start: start.range.start, end },
    };
  }

  private rejectUnsupportedClauses(): void {
    const banned = [
      'GROUP',
      'HAVING',
      'ORDER',
      'LIMIT',
      'OFFSET',
      'WINDOW',
      'WITH',
    ] as const;
    for (const kw of banned) {
      if (this.checkKeyword(kw)) {
        const tok = this.peek();
        this.diagnostics.push({
          code: 'E_SQL_UNSUPPORTED',
          severity: 'error',
          message: `${kw} is outside the supported read-only SQL subset for algebra translation.`,
          range: tok.range,
        });
        this.advance();
      }
    }
    if (this.checkKeyword('BY')) {
      this.diagnostics.push({
        code: 'E_SQL_UNSUPPORTED',
        severity: 'error',
        message: 'ORDER BY / GROUP BY are not supported (relational algebra uses unordered sets).',
        range: this.peek().range,
      });
    }
  }

  private parseSelectList(): SqlSelectItem[] {
    const items: SqlSelectItem[] = [];
    do {
      const start = this.peek().range.start;
      if (this.matchPunct('*')) {
        items.push({
          kind: 'all',
          range: { start, end: this.previous().range.end },
        });
      } else {
        const col = this.parseColumnRef();
        let alias: string | undefined;
        if (this.matchKeyword('AS')) {
          alias = this.consumeIdent('Expected column alias after AS.').value;
        } else if (this.check('IDENT') && !this.looksLikeJoinOrClause()) {
          alias = this.advanceIdent().value;
        }
        items.push({
          kind: 'column',
          column: col,
          alias,
          range: { start, end: this.previous().range.end },
        });
      }
    } while (this.matchPunct(','));
    return items;
  }

  private looksLikeJoinOrClause(): boolean {
    return (
      this.checkKeyword('FROM') ||
      this.checkKeyword('WHERE') ||
      this.checkKeyword('UNION') ||
      this.checkKeyword('INTERSECT') ||
      this.checkKeyword('EXCEPT') ||
      this.checkKeyword('JOIN') ||
      this.checkKeyword('INNER') ||
      this.checkKeyword('LEFT') ||
      this.checkKeyword('RIGHT') ||
      this.checkKeyword('FULL') ||
      this.checkKeyword('CROSS') ||
      this.checkKeyword('NATURAL') ||
      this.checkKeyword('ON') ||
      this.checkPunct(')')
    );
  }

  private parseFrom(): SqlFromClause {
    const start = this.previous().range.start;
    const base = this.parseTableRef();
    const joins: SqlJoinNode[] = [];
    const implicitCross: boolean[] = [];

    while (!this.isAtEnd() && !this.clauseBoundary()) {
      if (this.matchPunct(',')) {
        implicitCross.push(true);
        joins.push({
          kind: 'cross',
          right: this.parseTableRef(),
          range: this.spanSince(joins.length ? joins[joins.length - 1].range.start : base.range.start),
        });
        continue;
      }
      const join = this.parseJoinSuffix();
      if (!join) break;
      implicitCross.push(false);
      joins.push(join);
    }

    return {
      base,
      joins,
      implicitCross,
      range: { start, end: this.previous().range.end },
    };
  }

  private parseJoinSuffix(): SqlJoinNode | null {
    const start = this.peek().range.start;
    let kind: SqlJoinKind;

    if (this.matchKeyword('NATURAL')) {
      this.consumeKeyword('JOIN', "Expected JOIN after NATURAL.");
      kind = 'natural';
    } else if (this.matchKeyword('CROSS')) {
      this.consumeKeyword('JOIN', "Expected JOIN after CROSS.");
      kind = 'cross';
    } else if (this.matchKeyword('INNER')) {
      this.consumeKeyword('JOIN', "Expected JOIN after INNER.");
      kind = 'inner';
    } else if (this.matchKeyword('LEFT')) {
      this.matchKeyword('OUTER');
      this.consumeKeyword('JOIN', "Expected JOIN after LEFT.");
      kind = 'left';
    } else if (this.matchKeyword('RIGHT')) {
      this.matchKeyword('OUTER');
      this.consumeKeyword('JOIN', "Expected JOIN after RIGHT.");
      kind = 'right';
    } else if (this.matchKeyword('FULL')) {
      this.matchKeyword('OUTER');
      this.consumeKeyword('JOIN', "Expected JOIN after FULL.");
      kind = 'full';
    } else if (this.matchKeyword('JOIN')) {
      kind = 'inner';
    } else {
      return null;
    }

    const right = this.parseTableRef();
    let on: SqlExpr | undefined;
    if (kind !== 'cross' && kind !== 'natural') {
      if (this.matchKeyword('ON')) {
        on = this.parseExpr();
      } else if (kind === 'inner') {
        throw new Error('INNER JOIN requires an ON predicate in this subset.');
      }
    }
    return { kind, right, on, range: { start, end: right.range.end } };
  }

  private parseTableRef(): SqlTableRef {
    const start = this.peek().range.start;
    if (this.matchPunct('(')) {
      const inner = this.parseQuery();
      this.consumePunct(')', "Expected ')' after subquery.");
      let alias: string | undefined;
      if (this.matchKeyword('AS')) {
        alias = this.consumeIdent('Expected alias after subquery.').value;
      } else if (this.check('IDENT') && !this.looksLikeJoinOrClause()) {
        alias = this.advanceIdent().value;
      }
      return {
        subquery: inner,
        alias,
        range: { start, end: this.previous().range.end },
      };
    }
    const relationName = this.consumeIdent('Expected table name.').value;
    let alias: string | undefined;
    if (this.matchKeyword('AS')) {
      alias = this.consumeIdent('Expected alias after AS.').value;
    } else if (this.check('IDENT') && this.looksLikeJoinOrClause() === false) {
      const next = this.peek().value.toUpperCase();
      if (!['JOIN', 'ON', 'WHERE', 'UNION', 'INTERSECT', 'EXCEPT', 'FROM'].includes(next)) {
        alias = this.advanceIdent().value;
      }
    }
    return {
      relationName,
      alias,
      range: { start, end: this.previous().range.end },
    };
  }

  private parseExpr(): SqlExpr {
    return this.parseOr();
  }

  private parseOr(): SqlExpr {
    let left = this.parseAnd();
    while (this.matchKeyword('OR')) {
      const op = this.previous();
      const right = this.parseAnd();
      left = {
        type: 'binary',
        operator: 'OR',
        left,
        right,
        range: { start: left.range.start, end: right.range.end },
      };
      void op;
    }
    return left;
  }

  private parseAnd(): SqlExpr {
    let left = this.parseNot();
    while (this.matchKeyword('AND')) {
      const right = this.parseNot();
      left = {
        type: 'binary',
        operator: 'AND',
        left,
        right,
        range: { start: left.range.start, end: right.range.end },
      };
    }
    return left;
  }

  private parseNot(): SqlExpr {
    if (this.matchKeyword('NOT')) {
      const start = this.previous().range.start;
      const operand = this.parseNot();
      return {
        type: 'unary',
        operator: 'NOT',
        operand,
        range: { start, end: operand.range.end },
      };
    }
    return this.parseComparison();
  }

  private parseComparison(): SqlExpr {
    const left = this.parsePrimaryExpr();
    if (this.matchKeyword('IS')) {
      const start = left.range.start;
      const negated = this.matchKeyword('NOT');
      this.consumeKeyword('NULL', "Expected NULL after IS [NOT].");
      if (left.type !== 'column') {
        throw new Error('IS NULL checks require a column reference.');
      }
      return {
        type: 'is_null',
        negated,
        operand: left,
        range: { start, end: this.previous().range.end },
      };
    }

    if (this.check('OP')) {
      const opTok = this.peek();
      const op = opTok.value;
      if (['=', '!=', '<>', '<', '<=', '>', '>='].includes(op)) {
        this.advance();
        const right = this.parsePrimaryExpr();
        return {
          type: 'comparison',
          operator: op as '=' | '!=' | '<>' | '<' | '<=' | '>' | '>=',
          left,
          right,
          range: { start: left.range.start, end: right.range.end },
        };
      }
    }
    return left;
  }

  private parsePrimaryExpr(): SqlExpr {
    if (this.matchPunct('(')) {
      const inner = this.parseExpr();
      this.consumePunct(')', "Expected ')' after grouped predicate.");
      return {
        type: 'paren',
        inner,
        range: { start: this.tokens[this.current - 2].range.start, end: this.previous().range.end },
      };
    }
    if (
      this.check('STRING') ||
      this.check('NUMBER') ||
      this.checkKeyword('TRUE') ||
      this.checkKeyword('FALSE') ||
      this.checkKeyword('NULL')
    ) {
      return this.parseLiteral();
    }
    const col = this.parseColumnRef();
    return col;
  }

  private parseLiteral(): SqlExpr {
    const tok = this.peek();
    const start = tok.range.start;
    if (this.matchKeyword('NULL')) {
      return { type: 'literal', value: null, raw: 'NULL', range: tok.range };
    }
    if (this.matchKeyword('TRUE')) {
      return { type: 'literal', value: true, raw: 'TRUE', range: tok.range };
    }
    if (this.matchKeyword('FALSE')) {
      return { type: 'literal', value: false, raw: 'FALSE', range: tok.range };
    }
    if (this.match('STRING')) {
      return {
        type: 'literal',
        value: this.previous().value,
        raw: this.previous().raw,
        range: { start, end: this.previous().range.end },
      };
    }
    if (this.match('NUMBER')) {
      const n = Number(this.previous().value);
      return {
        type: 'literal',
        value: n,
        raw: this.previous().raw,
        range: { start, end: this.previous().range.end },
      };
    }
    throw new Error('Expected literal value.');
  }

  private parseColumnRef(): SqlColumnRef {
    const first = this.consumeIdent('Expected column reference.');
    if (this.matchPunct('.')) {
      const second = this.consumeIdent('Expected attribute name after ".".');
      return {
        type: 'column',
        qualifier: first.value,
        name: second.value,
        range: { start: first.range.start, end: second.range.end },
      };
    }
    return {
      type: 'column',
      name: first.value,
      range: first.range,
    };
  }

  private clauseBoundary(): boolean {
    return (
      this.checkKeyword('WHERE') ||
      this.checkKeyword('UNION') ||
      this.checkKeyword('INTERSECT') ||
      this.checkKeyword('EXCEPT') ||
      this.checkKeyword('GROUP') ||
      this.checkKeyword('ORDER') ||
      this.checkKeyword('LIMIT') ||
      this.checkPunct(')')
    );
  }

  private spanSince(start: SourceRange['start']): SourceRange {
    return { start, end: this.previous().range.end };
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private match(...types: SqlToken['type'][]): boolean {
    for (const t of types) {
      if (this.check(t)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private matchKeyword(...words: string[]): boolean {
    if (this.check('KEYWORD') && words.includes(this.peek().value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchPunct(value: string): boolean {
    if (this.check('PUNCT') && this.peek().value === value) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(...types: SqlToken['type'][]): boolean {
    return types.includes(this.peek().type);
  }

  private checkKeyword(word: string): boolean {
    return this.check('KEYWORD') && this.peek().value === word;
  }

  private checkPunct(value: string): boolean {
    return this.check('PUNCT') && this.peek().value === value;
  }

  private advance(): SqlToken {
    if (!this.isAtEnd()) this.current += 1;
    return this.previous();
  }

  private previous(): SqlToken {
    return this.tokens[this.current - 1];
  }

  private peek(): SqlToken {
    return this.tokens[this.current];
  }

  private consumeIdent(message: string): SqlToken {
    if (this.check('IDENT')) return this.advanceIdent();
    throw new Error(message);
  }

  private advanceIdent(): SqlToken {
    const tok = this.peek();
    this.advance();
    return tok;
  }

  private consumeKeyword(word: string, message: string): SqlToken {
    if (this.matchKeyword(word)) return this.previous();
    throw new Error(message);
  }

  private consumePunct(value: string, message: string): void {
    if (this.matchPunct(value)) return;
    throw new Error(message);
  }
}
