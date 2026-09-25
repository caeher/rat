/**
 * Relational Algebra Parser & AST Builder
 * Version: 1.0.0
 * 
 * Implements a recursive descent / Pratt precedence parser for Relational Algebra expressions
 * and 3VL boolean predicates with exact source range tracking, stable node identities,
 * and resilient recovery for incomplete editor inputs.
 */

import {
  ASTNode,
  CartesianProductNode,
  ComparisonOperator,
  Diagnostic,
  DifferenceNode,
  DivisionNode,
  FullOuterJoinNode,
  IntersectionNode,
  LeftOuterJoinNode,
  LogicalBinaryPredicateNode,
  NaturalJoinNode,
  NullCheckOperator,
  PredicateNode,
  RenameAttributesNode,
  RenameRelationNode,
  RightOuterJoinNode,
  SourceRange,
  ThetaJoinNode,
  Token,
  TokenType,
  UnionNode,
} from './types';
import { tokenize } from './lexer';

export interface ParseResult {
  ast: ASTNode | null;
  diagnostics: Diagnostic[];
  isIncomplete: boolean;
}

export class Parser {
  private tokens: Token[];
  private current = 0;
  private diagnostics: Diagnostic[] = [];
  private isIncomplete = false;
  private nodeIdCounter = 0;

  constructor(tokensOrInput: Token[] | string) {
    if (typeof tokensOrInput === 'string') {
      const lexResult = tokenize(tokensOrInput);
      this.tokens = lexResult.tokens;
      this.diagnostics.push(...lexResult.diagnostics);
      if (lexResult.isIncomplete) {
        this.isIncomplete = true;
      }
    } else {
      this.tokens = tokensOrInput;
    }
  }

  private nextId(prefix = 'node'): string {
    return `${prefix}_${++this.nodeIdCounter}`;
  }

  public parse(): ParseResult {
    if (this.tokens.length === 0 || this.peek().type === 'EOF') {
      return {
        ast: null,
        diagnostics: this.diagnostics,
        isIncomplete: true,
      };
    }

    try {
      const ast = this.parseExpression();

      // Check for leftover unparsed tokens
      if (!this.isAtEnd()) {
        const leftover = this.peek();
        this.diagnostics.push({
          code: 'E_UNEXPECTED_TOKEN',
          severity: 'error',
          message: `Unexpected token '${leftover.raw}' after valid relational expression.`,
          range: leftover.range,
        });
      }

      return {
        ast,
        diagnostics: this.diagnostics,
        isIncomplete: this.isIncomplete,
      };
    } catch {
      return {
        ast: null,
        diagnostics: this.diagnostics,
        isIncomplete: this.isIncomplete,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Relational Algebra Expression Hierarchy (Precedence Levels 5 -> 1)
  // ---------------------------------------------------------------------------

  /**
   * Top-level expression entry point: Level 5 (Set Difference & Union)
   * Left-associative: R ∪ S − T == (R ∪ S) − T
   */
  public parseExpression(): ASTNode {
    let left = this.parseIntersection();

    while (this.match('OP_UNION', 'OP_DIFFERENCE') || this.matchInfixUnionDiff()) {
      const opToken = this.previous();
      const isUnion =
        opToken.type === 'OP_UNION' ||
        opToken.value === '∪' ||
        opToken.value.toLowerCase() === 'u';

      if (this.isAtEnd()) {
        this.isIncomplete = true;
        this.diagnostics.push({
          code: 'E_SYNTAX_ERROR',
          severity: 'error',
          message: `Expected relation or expression after '${opToken.raw}'.`,
          range: opToken.range,
        });
        return left;
      }

      const right = this.parseIntersection();
      const combinedRange: SourceRange = {
        start: left.range.start,
        end: right.range.end,
      };

      if (isUnion) {
        const node: UnionNode = {
          id: this.nextId('union'),
          type: 'union',
          left,
          right,
          range: combinedRange,
        };
        left = node;
      } else {
        const node: DifferenceNode = {
          id: this.nextId('diff'),
          type: 'difference',
          left,
          right,
          range: combinedRange,
        };
        left = node;
      }
    }

    return left;
  }

  /**
   * Precedence Level 4: Set Intersection (∩)
   * Left-associative
   */
  private parseIntersection(): ASTNode {
    let left = this.parseJoinsAndProduct();

    while (this.match('OP_INTERSECT')) {
      const opToken = this.previous();

      if (this.isAtEnd()) {
        this.isIncomplete = true;
        this.diagnostics.push({
          code: 'E_SYNTAX_ERROR',
          severity: 'error',
          message: `Expected relation or expression after '${opToken.raw}'.`,
          range: opToken.range,
        });
        return left;
      }

      const right = this.parseJoinsAndProduct();
      const node: IntersectionNode = {
        id: this.nextId('intersect'),
        type: 'intersection',
        left,
        right,
        range: {
          start: left.range.start,
          end: right.range.end,
        },
      };
      left = node;
    }

    return left;
  }

  /**
   * Precedence Level 3: Multiplicative & Join Operators
   * ⨯, ÷, ⋈, ⋈_θ, ⟕, ⟖, ⟗
   * Left-associative
   */
  private parseJoinsAndProduct(): ASTNode {
    let left = this.parsePrimary();

    while (
      this.match(
        'OP_CARTESIAN',
        'OP_NATURAL_JOIN',
        'OP_THETA_JOIN',
        'OP_LEFT_JOIN',
        'OP_RIGHT_JOIN',
        'OP_FULL_JOIN',
        'OP_DIVISION'
      ) ||
      this.matchInfixProduct()
    ) {
      const opToken = this.previous();
      let predicate: PredicateNode | undefined;
      let thetaJoinDetected = false;

      // Check if join operator is followed by join predicate: [ Predicate ]
      if (
        (opToken.type === 'OP_NATURAL_JOIN' ||
          opToken.type === 'OP_THETA_JOIN' ||
          opToken.type === 'OP_LEFT_JOIN' ||
          opToken.type === 'OP_RIGHT_JOIN' ||
          opToken.type === 'OP_FULL_JOIN') &&
        this.check('LBRACKET')
      ) {
        thetaJoinDetected = true;
        this.advance(); // consume '['
        predicate = this.parsePredicate();
        this.consume('RBRACKET', "Expected ']' after join predicate.");
      }

      if (this.isAtEnd()) {
        this.isIncomplete = true;
        this.diagnostics.push({
          code: 'E_SYNTAX_ERROR',
          severity: 'error',
          message: `Expected relation or expression after '${opToken.raw}'.`,
          range: opToken.range,
        });
        return left;
      }

      const right = this.parsePrimary();
      const combinedRange: SourceRange = {
        start: left.range.start,
        end: right.range.end,
      };

      if (opToken.type === 'OP_CARTESIAN' || opToken.value === 'x' || opToken.value === '*') {
        const node: CartesianProductNode = {
          id: this.nextId('cross'),
          type: 'cartesian_product',
          left,
          right,
          range: combinedRange,
        };
        left = node;
      } else if (opToken.type === 'OP_DIVISION') {
        const node: DivisionNode = {
          id: this.nextId('div'),
          type: 'division',
          left,
          right,
          range: combinedRange,
        };
        left = node;
      } else if (opToken.type === 'OP_LEFT_JOIN') {
        const node: LeftOuterJoinNode = {
          id: this.nextId('left_join'),
          type: 'left_join',
          predicate,
          left,
          right,
          range: combinedRange,
        };
        left = node;
      } else if (opToken.type === 'OP_RIGHT_JOIN') {
        const node: RightOuterJoinNode = {
          id: this.nextId('right_join'),
          type: 'right_join',
          predicate,
          left,
          right,
          range: combinedRange,
        };
        left = node;
      } else if (opToken.type === 'OP_FULL_JOIN') {
        const node: FullOuterJoinNode = {
          id: this.nextId('full_join'),
          type: 'full_join',
          predicate,
          left,
          right,
          range: combinedRange,
        };
        left = node;
      } else if (thetaJoinDetected || opToken.type === 'OP_THETA_JOIN') {
        const node: ThetaJoinNode = {
          id: this.nextId('theta_join'),
          type: 'theta_join',
          predicate: predicate || '',
          left,
          right,
          range: combinedRange,
        };
        left = node;
      } else {
        // Natural Join
        const node: NaturalJoinNode = {
          id: this.nextId('join'),
          type: 'natural_join',
          left,
          right,
          range: combinedRange,
        };
        left = node;
      }
    }

    return left;
  }

  /**
   * Precedence Level 2 & 1: Primary Expressions & Unary Operators
   * ( Expression ), σ, π, ρ, or RelationReference
   */
  private parsePrimary(): ASTNode {
    // 1. Parenthesized Expression: ( Expression )
    if (this.match('LPAREN')) {
      const openToken = this.previous();
      if (this.isAtEnd()) {
        this.isIncomplete = true;
        this.diagnostics.push({
          code: 'E_UNMATCHED_PAREN',
          severity: 'error',
          message: "Unclosed parenthesis '('. Expected expression.",
          range: openToken.range,
        });
        return {
          id: this.nextId('error'),
          type: 'relation',
          relationName: '',
          range: openToken.range,
        };
      }

      const inner = this.parseExpression();
      const closeToken = this.consume('RPAREN', "Expected closing parenthesis ')'.");
      const endPos = closeToken ? closeToken.range.end : inner.range.end;
      inner.range = {
        start: openToken.range.start,
        end: endPos,
      };
      return inner;
    }

    // 2. Selection: σ, sigma, s, SELECT, \sigma
    if (this.match('OP_SELECTION') || this.matchPrefixSelection()) {
      return this.parseSelection();
    }

    // 3. Projection: π, pi, p, PROJECT, \pi
    if (this.match('OP_PROJECTION') || this.matchPrefixProjection()) {
      return this.parseProjection();
    }

    // 4. Rename: ρ, rho, r, RENAME, \rho, rho_attr, rename_attr
    if (this.match('OP_RENAME') || this.matchPrefixRename()) {
      return this.parseRename();
    }

    // 5. Relation Reference: Identifier
    if (this.match('IDENTIFIER')) {
      const token = this.previous();
      return {
        id: this.nextId('rel'),
        type: 'relation',
        relationName: token.value,
        range: token.range,
      };
    }

    // Error case
    const token = this.peek();
    if (token.type === 'EOF') {
      this.isIncomplete = true;
      this.diagnostics.push({
        code: 'E_SYNTAX_ERROR',
        severity: 'error',
        message: 'Unexpected end of expression. Expected relation or operator.',
        range: token.range,
      });
    } else {
      this.advance();
      this.diagnostics.push({
        code: 'E_UNEXPECTED_TOKEN',
        severity: 'error',
        message: `Unexpected token '${token.raw}'. Expected relation name or algebraic operator.`,
        range: token.range,
      });
    }

    return {
      id: this.nextId('error'),
      type: 'relation',
      relationName: token.value || '',
      range: token.range,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Unary Operators: Selection, Projection, Rename
  // ---------------------------------------------------------------------------

  /**
   * Selection: σ[Predicate](Child) or σ Predicate (Child) or σ(Predicate)(Child)
   */
  private parseSelection(): ASTNode {
    const startToken = this.previous();
    let predicate: PredicateNode;

    if (this.match('LBRACKET')) {
      predicate = this.parsePredicate();
      this.consume('RBRACKET', "Expected ']' after selection condition.");
    } else if (this.check('LPAREN') && this.isPredicateInParensAhead()) {
      this.advance(); // consume '('
      predicate = this.parsePredicate();
      this.consume('RPAREN', "Expected ')' after selection condition.");
    } else {
      predicate = this.parsePredicate();
    }

    const child = this.parseChildExpression();
    const range: SourceRange = {
      start: startToken.range.start,
      end: child.range.end,
    };

    return {
      id: this.nextId('select'),
      type: 'selection',
      predicate,
      child,
      range,
    };
  }

  /**
   * Projection: π[a1, a2](Child) or π a1, a2 (Child)
   */
  private parseProjection(): ASTNode {
    const startToken = this.previous();
    const attributes: string[] = [];

    if (this.match('LBRACKET')) {
      this.parseAttributeList(attributes);
      this.consume('RBRACKET', "Expected ']' after projection attribute list.");
    } else {
      this.parseAttributeList(attributes);
    }

    const child = this.parseChildExpression();
    const range: SourceRange = {
      start: startToken.range.start,
      end: child.range.end,
    };

    return {
      id: this.nextId('proj'),
      type: 'projection',
      attributes,
      child,
      range,
    };
  }

  /**
   * Rename:
   * 1. Relation rename: ρ S (Child) or ρ[S](Child)
   * 2. Relation rename with positional attributes: ρ S(a, b, c) (Child) or ρ[S(a, b, c)](Child)
   * 3. Attribute map rename: ρ[a -> b, c -> d](Child) or ρ a -> b, c -> d (Child)
   */
  private parseRename(): ASTNode {
    const startToken = this.previous();
    const isBracketed = this.match('LBRACKET');

    let newRelationName: string | undefined;
    let attributeMap: Record<string, string> | undefined;
    let positionalAttributes: string[] | undefined;

    // Check if we start with an attribute rename mapping: e.g. "a -> b"
    if (this.isAttributeRenameAhead()) {
      attributeMap = this.parseAttributeRenameMap();
    } else {
      // It starts with a new relation identifier: S or S(...)
      if (this.match('IDENTIFIER') || this.isKeywordAsIdentifier(this.peek())) {
        const idToken = this.previous();
        newRelationName = idToken.value;

        // Check for positional attributes: S(a, b, c)
        // If bracketed: ρ[S(a, b, c)](R) -> LPAREN inside brackets is positional
        // If unbracketed: ρ S(a, b, c) (R) -> LPAREN is positional only if followed by another '(' child
        if (this.check('LPAREN') && (isBracketed || this.isPositionalRenameParensAhead())) {
          this.advance(); // consume '('
          positionalAttributes = [];
          this.parseAttributeList(positionalAttributes);
          this.consume('RPAREN', "Expected ')' after attribute list in relation rename.");
        }
      } else if (this.isAttributeRenameAhead()) {
        attributeMap = this.parseAttributeRenameMap();
      } else {
        this.diagnostics.push({
          code: 'E_SYNTAX_ERROR',
          severity: 'error',
          message: 'Expected relation name or attribute mapping in rename specification.',
          range: this.peek().range,
        });
      }
    }

    if (isBracketed) {
      this.consume('RBRACKET', "Expected ']' after rename specification.");
    }

    const child = this.parseChildExpression();
    const range: SourceRange = {
      start: startToken.range.start,
      end: child.range.end,
    };

    if (attributeMap && Object.keys(attributeMap).length > 0) {
      const node: RenameAttributesNode = {
        id: this.nextId('rename_attr'),
        type: 'rename_attributes',
        newRelationName,
        attributeMap,
        child,
        range,
      };
      return node;
    }

    const renameNode: RenameRelationNode & { positionalAttributes?: string[] } = {
      id: this.nextId('rename_rel'),
      type: 'rename_relation',
      newRelationName: newRelationName || '',
      child,
      range,
    };
    if (positionalAttributes) {
      renameNode.positionalAttributes = positionalAttributes;
    }
    return renameNode;
  }

  private parseChildExpression(): ASTNode {
    if (this.check('LPAREN')) {
      return this.parsePrimary();
    }

    if (
      this.check('OP_SELECTION') ||
      this.check('OP_PROJECTION') ||
      this.check('OP_RENAME') ||
      this.check('IDENTIFIER')
    ) {
      return this.parsePrimary();
    }

    if (this.isAtEnd()) {
      this.isIncomplete = true;
      const endPos = this.previous().range.end;
      this.diagnostics.push({
        code: 'E_SYNTAX_ERROR',
        severity: 'error',
        message: 'Expected child relation expression.',
        range: { start: endPos, end: endPos },
      });
      return {
        id: this.nextId('rel'),
        type: 'relation',
        relationName: '',
        range: { start: endPos, end: endPos },
      };
    }

    return this.parsePrimary();
  }

  private parseAttributeList(attributes: string[]): void {
    while (!this.isAtEnd() && !this.check('RBRACKET') && !this.check('RPAREN') && !this.check('LPAREN')) {
      if (this.match('IDENTIFIER') || this.isKeywordAsIdentifier(this.peek())) {
        const token = this.previousTokenOrConsumedIdentifier();
        let attrName = token.value;

        // Check for qualified attribute: Employees.salary
        if (this.match('DOT')) {
          const colToken = this.consumeIdentifier('Expected column name after dot.');
          attrName = `${attrName}.${colToken.value}`;
        }
        attributes.push(attrName);
      } else {
        break;
      }

      if (this.match('COMMA')) {
        continue;
      } else {
        break;
      }
    }
  }

  private parseAttributeRenameMap(): Record<string, string> {
    const map: Record<string, string> = {};

    while (!this.isAtEnd() && !this.check('RBRACKET') && !this.check('RPAREN') && !this.check('LPAREN')) {
      const fromToken = this.consumeIdentifier('Expected source attribute name in rename mapping.');
      this.consume('ARROW', "Expected '->', '→', or 'AS' in attribute rename mapping.");
      const toToken = this.consumeIdentifier('Expected target attribute name in rename mapping.');

      map[fromToken.value] = toToken.value;

      if (this.match('COMMA')) {
        continue;
      } else {
        break;
      }
    }

    return map;
  }

  // ---------------------------------------------------------------------------
  // 3. Predicate Expressions (OR -> AND -> NOT -> Comparisons -> Atoms)
  // ---------------------------------------------------------------------------

  public parsePredicate(): PredicateNode {
    return this.parseOrPredicate();
  }

  private parseOrPredicate(): PredicateNode {
    let left = this.parseAndPredicate();

    while (this.match('OR')) {
      const opToken = this.previous();
      if (this.isAtEnd() || this.check('RBRACKET') || this.check('RPAREN')) {
        this.isIncomplete = true;
        this.diagnostics.push({
          code: 'E_INVALID_PREDICATE',
          severity: 'error',
          message: "Expected predicate expression after 'OR'.",
          range: opToken.range,
        });
        return left;
      }

      const right = this.parseAndPredicate();
      const node: LogicalBinaryPredicateNode = {
        id: this.nextId('pred_or'),
        type: 'logical_binary',
        operator: 'OR',
        left,
        right,
        range: {
          start: left.range.start,
          end: right.range.end,
        },
      };
      left = node;
    }

    return left;
  }

  private parseAndPredicate(): PredicateNode {
    let left = this.parseNotPredicate();

    while (this.match('AND')) {
      const opToken = this.previous();
      if (this.isAtEnd() || this.check('RBRACKET') || this.check('RPAREN')) {
        this.isIncomplete = true;
        this.diagnostics.push({
          code: 'E_INVALID_PREDICATE',
          severity: 'error',
          message: "Expected predicate expression after 'AND'.",
          range: opToken.range,
        });
        return left;
      }

      const right = this.parseNotPredicate();
      const node: LogicalBinaryPredicateNode = {
        id: this.nextId('pred_and'),
        type: 'logical_binary',
        operator: 'AND',
        left,
        right,
        range: {
          start: left.range.start,
          end: right.range.end,
        },
      };
      left = node;
    }

    return left;
  }

  private parseNotPredicate(): PredicateNode {
    if (this.match('NOT')) {
      const notToken = this.previous();
      const operand = this.parseNotPredicate();
      return {
        id: this.nextId('pred_not'),
        type: 'logical_unary',
        operator: 'NOT',
        operand,
        range: {
          start: notToken.range.start,
          end: operand.range.end,
        },
      };
    }

    return this.parseComparisonPredicate();
  }

  private parseComparisonPredicate(): PredicateNode {
    // Check if predicate starts with parenthesis: ( Predicate )
    if (this.check('LPAREN') && !this.isPrimaryRelExpressionAhead()) {
      const openParen = this.advance();
      const inner = this.parsePredicate();
      const closeParen = this.consume('RPAREN', "Expected ')' after predicate.");
      const endPos = closeParen ? closeParen.range.end : inner.range.end;
      inner.range = {
        start: openParen.range.start,
        end: endPos,
      };
      return inner;
    }

    const left = this.parseValueExpr();

    // Check for IS NULL / IS NOT NULL
    if (this.match('IS')) {
      const isToken = this.previous();
      let isNot = false;
      if (this.match('NOT')) {
        isNot = true;
      }
      const nullToken = this.consume('NULL_LITERAL', "Expected 'NULL' after 'IS' in predicate.");
      const op: NullCheckOperator = isNot ? 'IS NOT NULL' : 'IS NULL';
      const endPos = nullToken ? nullToken.range.end : isToken.range.end;
      return {
        id: this.nextId('pred_null'),
        type: 'null_check',
        operator: op,
        operand: left,
        range: {
          start: left.range.start,
          end: endPos,
        },
      };
    }

    // Comparison Operators: =, !=, <>, <, <=, >, >=
    if (this.match('EQ', 'NEQ', 'LT', 'LTE', 'GT', 'GTE')) {
      const opToken = this.previous();
      const compOp = this.mapComparisonOperator(opToken);

      if (this.isAtEnd() || this.check('RBRACKET') || this.check('RPAREN')) {
        this.isIncomplete = true;
        this.diagnostics.push({
          code: 'E_INVALID_PREDICATE',
          severity: 'error',
          message: `Expected operand after comparison operator '${opToken.raw}'.`,
          range: opToken.range,
        });
        return left;
      }

      const right = this.parseValueExpr();
      return {
        id: this.nextId('pred_comp'),
        type: 'comparison',
        operator: compOp,
        left,
        right,
        range: {
          start: left.range.start,
          end: right.range.end,
        },
      };
    }

    return left;
  }

  private parseValueExpr(): PredicateNode {
    // 1. Literal: String
    if (this.match('STRING_LITERAL')) {
      const token = this.previous();
      return {
        id: this.nextId('lit_str'),
        type: 'literal',
        dataType: 'string',
        value: token.value,
        raw: token.raw,
        range: token.range,
      };
    }

    // 2. Literal: Number (including leading minus/plus)
    if (this.match('OP_DIFFERENCE')) {
      const minusToken = this.previous();
      if (this.match('NUMBER_LITERAL')) {
        const numToken = this.previous();
        const val = -Number(numToken.value);
        return {
          id: this.nextId('lit_num'),
          type: 'literal',
          dataType: 'number',
          value: val,
          raw: `-${numToken.raw}`,
          range: {
            start: minusToken.range.start,
            end: numToken.range.end,
          },
        };
      }
    }

    if (this.match('NUMBER_LITERAL')) {
      const token = this.previous();
      return {
        id: this.nextId('lit_num'),
        type: 'literal',
        dataType: 'number',
        value: Number(token.value),
        raw: token.raw,
        range: token.range,
      };
    }

    // 3. Literal: Boolean (TRUE, FALSE)
    if (this.match('BOOLEAN_LITERAL')) {
      const token = this.previous();
      return {
        id: this.nextId('lit_bool'),
        type: 'literal',
        dataType: 'boolean',
        value: token.value.toLowerCase() === 'true',
        raw: token.raw,
        range: token.range,
      };
    }

    // 4. Literal: NULL
    if (this.match('NULL_LITERAL')) {
      const token = this.previous();
      return {
        id: this.nextId('lit_null'),
        type: 'literal',
        dataType: 'null',
        value: null,
        raw: token.raw,
        range: token.range,
      };
    }

    // 5. Identifier / Qualified Identifier: Employees.dept_id or dept_id
    if (this.match('IDENTIFIER') || this.isKeywordAsIdentifier(this.peek())) {
      const idToken = this.previousTokenOrConsumedIdentifier();
      let attributeName = idToken.value;
      let relationQualifier: string | undefined;

      if (this.match('DOT')) {
        relationQualifier = attributeName;
        const colToken = this.consumeIdentifier('Expected attribute name after relation qualifier.');
        attributeName = colToken.value;
        return {
          id: this.nextId('ident'),
          type: 'identifier',
          attributeName,
          relationQualifier,
          range: {
            start: idToken.range.start,
            end: colToken.range.end,
          },
        };
      }

      return {
        id: this.nextId('ident'),
        type: 'identifier',
        attributeName,
        range: idToken.range,
      };
    }

    // Fallback error node
    const token = this.peek();
    if (token.type === 'EOF') {
      this.isIncomplete = true;
      this.diagnostics.push({
        code: 'E_INVALID_PREDICATE',
        severity: 'error',
        message: 'Expected identifier or literal in predicate.',
        range: token.range,
      });
    } else {
      this.advance();
      this.diagnostics.push({
        code: 'E_UNEXPECTED_TOKEN',
        severity: 'error',
        message: `Unexpected token '${token.raw}' in predicate expression.`,
        range: token.range,
      });
    }

    return {
      id: this.nextId('lit_null'),
      type: 'literal',
      dataType: 'null',
      value: null,
      raw: token.raw || '',
      range: token.range,
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Disambiguation & Helper Methods
  // ---------------------------------------------------------------------------

  private mapComparisonOperator(token: Token): ComparisonOperator {
    switch (token.raw) {
      case '==':
      case '=':
        return '=';
      case '<>':
      case '!=':
        return '!=';
      case '<=':
        return '<=';
      case '>=':
        return '>=';
      case '<':
        return '<';
      case '>':
        return '>';
      default:
        return '=';
    }
  }

  private matchPrefixSelection(): boolean {
    if (this.check('IDENTIFIER')) {
      const val = this.peek().value.toLowerCase();
      if (val === 'select' || val === 'sigma') {
        this.advance();
        return true;
      }
      if (val === 's') {
        if (this.peek(1).type === 'LBRACKET' || this.isPrefixUnaryWithChildAhead()) {
          this.advance();
          return true;
        }
      }
    }
    return false;
  }

  private matchPrefixProjection(): boolean {
    if (this.check('IDENTIFIER')) {
      const val = this.peek().value.toLowerCase();
      if (val === 'project' || val === 'pi') {
        this.advance();
        return true;
      }
      if (val === 'p') {
        if (this.peek(1).type === 'LBRACKET' || this.isPrefixUnaryWithChildAhead()) {
          this.advance();
          return true;
        }
      }
    }
    return false;
  }

  private matchPrefixRename(): boolean {
    if (this.check('IDENTIFIER')) {
      const val = this.peek().value.toLowerCase();
      if (val === 'rename' || val === 'rho') {
        this.advance();
        return true;
      }
      if (val === 'r') {
        if (this.peek(1).type === 'LBRACKET' || this.isPrefixUnaryWithChildAhead()) {
          this.advance();
          return true;
        }
      }
    }
    return false;
  }

  private isPrefixUnaryWithChildAhead(): boolean {
    // If next token is a binary operator, delimiter, or EOF, it cannot be a prefix unary operator
    const next = this.peek(1);
    if (!next || next.type === 'EOF') return false;
    if (
      next.type === 'OP_UNION' ||
      next.type === 'OP_DIFFERENCE' ||
      next.type === 'OP_INTERSECT' ||
      next.type === 'OP_CARTESIAN' ||
      next.type === 'OP_NATURAL_JOIN' ||
      next.type === 'OP_THETA_JOIN' ||
      next.type === 'OP_LEFT_JOIN' ||
      next.type === 'OP_RIGHT_JOIN' ||
      next.type === 'OP_FULL_JOIN' ||
      next.type === 'OP_DIVISION' ||
      next.type === 'RPAREN' ||
      next.type === 'RBRACKET' ||
      next.type === 'COMMA'
    ) {
      return false;
    }

    // Check if there is an opening '(' for the child expression ahead before any top-level binary operator
    for (let i = this.current + 1; i < this.tokens.length; i++) {
      const t = this.tokens[i];
      if (t.type === 'LPAREN' || t.type === 'LBRACKET') {
        return true;
      }
      if (
        t.type === 'OP_UNION' ||
        t.type === 'OP_DIFFERENCE' ||
        t.type === 'OP_INTERSECT' ||
        t.type === 'OP_CARTESIAN' ||
        t.type === 'OP_NATURAL_JOIN' ||
        t.type === 'OP_DIVISION'
      ) {
        return false;
      }
    }
    return false;
  }

  private isPositionalRenameParensAhead(): boolean {
    // Start at current token which is '('
    let parenDepth = 0;
    for (let i = this.current; i < this.tokens.length; i++) {
      if (this.tokens[i].type === 'LPAREN') {
        parenDepth++;
      } else if (this.tokens[i].type === 'RPAREN') {
        parenDepth--;
        if (parenDepth === 0) {
          // Check if followed by another '(' child expression
          return i + 1 < this.tokens.length && this.tokens[i + 1].type === 'LPAREN';
        }
      }
    }
    return false;
  }

  private matchInfixUnionDiff(): boolean {
    if (this.check('IDENTIFIER')) {
      const val = this.peek().value.toLowerCase();
      if (val === 'u' || val === 'union' || val === 'cup') {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private matchInfixProduct(): boolean {
    if (this.check('IDENTIFIER')) {
      const val = this.peek().value.toLowerCase();
      if (val === 'x' || val === 'cross') {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private isKeywordAsIdentifier(token: Token): boolean {
    if (!token) return false;
    // Allow keywords to act as identifiers if in attribute/relation name positions
    return (
      token.type === 'IDENTIFIER' ||
      token.type === 'OP_CARTESIAN' ||
      token.type === 'OP_UNION' ||
      token.type === 'OP_DIFFERENCE' ||
      token.type === 'OP_SELECTION' ||
      token.type === 'OP_PROJECTION' ||
      token.type === 'OP_RENAME' ||
      token.type === 'AND' ||
      token.type === 'OR' ||
      token.type === 'NOT' ||
      token.type === 'IS' ||
      token.type === 'ARROW'
    );
  }

  private previousTokenOrConsumedIdentifier(): Token {
    if (this.previous()) return this.previous();
    return this.advance();
  }

  private isAttributeRenameAhead(): boolean {
    // Look ahead for "ident -> ident" or "ident AS ident"
    let i = this.current;
    if (i < this.tokens.length && (this.tokens[i].type === 'IDENTIFIER' || this.isKeywordAsIdentifier(this.tokens[i]))) {
      i++;
      if (i < this.tokens.length && this.tokens[i].type === 'ARROW') {
        return true;
      }
    }
    return false;
  }

  private isPredicateInParensAhead(): boolean {
    // Checks if `( ... ) ( ... )` pattern is present
    let parenDepth = 0;
    for (let i = this.current; i < this.tokens.length; i++) {
      if (this.tokens[i].type === 'LPAREN') {
        parenDepth++;
      } else if (this.tokens[i].type === 'RPAREN') {
        parenDepth--;
        if (parenDepth === 0) {
          // If followed by another '(', it is `σ (predicate) (child)`
          return i + 1 < this.tokens.length && this.tokens[i + 1].type === 'LPAREN';
        }
      }
    }
    return false;
  }

  private isPrimaryRelExpressionAhead(): boolean {
    if (this.check('LPAREN')) {
      // Look past '('
      const nextTok = this.peek(1);
      if (
        nextTok.type === 'OP_SELECTION' ||
        nextTok.type === 'OP_PROJECTION' ||
        nextTok.type === 'OP_RENAME'
      ) {
        return true;
      }
    }
    return false;
  }

  private consumeIdentifier(errorMessage: string): Token {
    if (this.match('IDENTIFIER') || this.isKeywordAsIdentifier(this.peek())) {
      return this.previousTokenOrConsumedIdentifier();
    }
    const token = this.peek();
    this.diagnostics.push({
      code: 'E_UNEXPECTED_TOKEN',
      severity: 'error',
      message: errorMessage,
      range: token.range,
    });
    return token;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return type === 'EOF';
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.peek().type === 'EOF';
  }

  private peek(offsetAhead = 0): Token {
    const idx = this.current + offsetAhead;
    if (idx >= this.tokens.length) {
      const last = this.tokens[this.tokens.length - 1];
      return (
        last || {
          type: 'EOF',
          value: '',
          raw: '',
          range: {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 1, offset: 0 },
          },
        }
      );
    }
    return this.tokens[idx];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, errorMessage: string): Token | null {
    if (this.check(type)) return this.advance();

    const token = this.peek();
    if (token.type === 'EOF') {
      this.isIncomplete = true;
    }

    this.diagnostics.push({
      code: type === 'RPAREN' || type === 'RBRACKET' ? 'E_UNMATCHED_PAREN' : 'E_SYNTAX_ERROR',
      severity: 'error',
      message: errorMessage,
      range: token.range,
    });

    return null;
  }
}

export function parse(tokensOrInput: Token[] | string): ParseResult {
  const parser = new Parser(tokensOrInput);
  return parser.parse();
}
