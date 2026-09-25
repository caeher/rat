/**
 * Relational Algebra Semantic Analyzer & Type Checker
 * Version: 1.0.0
 * 
 * Performs static semantic analysis, active schema resolution, ambiguous column detection,
 * 3VL predicate type checking, union and division compatibility validation,
 * schema and nullability inference, and actionable diagnostic suggestion generation.
 */

import {
  ASTNode,
  Attribute,
  AttributeType,
  CartesianProductNode,
  ComparisonPredicateNode,
  Diagnostic,
  DiagnosticSuggestion,
  DifferenceNode,
  DivisionNode,
  FullOuterJoinNode,
  IdentifierPredicateNode,
  IntersectionNode,
  LeftOuterJoinNode,
  LiteralPredicateNode,
  LogicalBinaryPredicateNode,
  LogicalUnaryPredicateNode,
  NaturalJoinNode,
  NullCheckPredicateNode,
  PredicateNode,
  ProjectionNode,
  RelationNode,
  RelationSchema,
  RenameAttributesNode,
  RenameRelationNode,
  RightOuterJoinNode,
  SelectionNode,
  SourceRange,
  ThetaJoinNode,
  UnionNode,
} from './types';
import {
  checkDivisionCompatibility,
  checkUnionCompatibility,
  inferNaturalJoinSchema,
  inferOuterJoinSchema,
  inferRenameSchema,
} from './contract';

export interface AnalysisResult {
  typedAST: ASTNode;
  inferredSchema?: RelationSchema;
  diagnostics: Diagnostic[];
}

export class SemanticAnalyzer {
  private schemaMap = new Map<string, RelationSchema>();
  private diagnostics: Diagnostic[] = [];

  constructor(schemas: Record<string, RelationSchema> | RelationSchema[]) {
    if (Array.isArray(schemas)) {
      for (const s of schemas) {
        this.schemaMap.set(s.name, s);
      }
    } else if (schemas && typeof schemas === 'object') {
      for (const [name, s] of Object.entries(schemas)) {
        this.schemaMap.set(name, s);
      }
    }
  }

  public analyze(rootNode: ASTNode): AnalysisResult {
    if (!rootNode) {
      return {
        typedAST: rootNode,
        diagnostics: this.diagnostics,
      };
    }

    const typedAST = this.analyzeNode(rootNode);
    return {
      typedAST,
      inferredSchema: typedAST.inferredSchema,
      diagnostics: this.diagnostics,
    };
  }

  private analyzeNode(node: ASTNode): ASTNode {
    switch (node.type) {
      case 'relation':
        return this.analyzeRelation(node);
      case 'projection':
        return this.analyzeProjection(node);
      case 'selection':
        return this.analyzeSelection(node);
      case 'rename_relation':
      case 'rename':
        return this.analyzeRenameRelation(node);
      case 'rename_attributes':
        return this.analyzeRenameAttributes(node);
      case 'cartesian_product':
        return this.analyzeCartesianProduct(node);
      case 'natural_join':
        return this.analyzeNaturalJoin(node);
      case 'theta_join':
        return this.analyzeThetaJoin(node);
      case 'left_join':
      case 'right_join':
      case 'full_join':
        return this.analyzeOuterJoin(node);
      case 'union':
      case 'difference':
      case 'intersection':
        return this.analyzeSetOperation(node);
      case 'division':
        return this.analyzeDivision(node);
      default:
        return node;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Relation Node
  // ---------------------------------------------------------------------------

  private analyzeRelation(node: RelationNode): RelationNode {
    if (!node.relationName) {
      return node;
    }

    const schema = this.schemaMap.get(node.relationName);
    if (!schema) {
      const candidates = Array.from(this.schemaMap.keys());
      const suggestion = this.findClosestSuggestion(
        node.relationName,
        candidates,
        node.range
      );

      this.diagnostics.push({
        code: 'E_UNRESOLVED_RELATION',
        severity: 'error',
        message: `Relation '${node.relationName}' does not exist in the active schema. Available relations: ${candidates.join(', ') || 'none'}.`,
        range: node.range,
        suggestion,
      });

      node.inferredSchema = {
        name: node.relationName,
        attributes: [],
      };
      return node;
    }

    // Attach inferred schema with sourceRelation tags
    node.inferredSchema = {
      name: schema.name,
      primaryKey: schema.primaryKey,
      attributes: schema.attributes.map((a) => ({
        ...a,
        sourceRelation: a.sourceRelation || schema.name,
        originalName: a.originalName || a.name,
      })),
    };

    return node;
  }

  // ---------------------------------------------------------------------------
  // 2. Projection (π)
  // ---------------------------------------------------------------------------

  private analyzeProjection(node: ProjectionNode): ProjectionNode {
    node.child = this.analyzeNode(node.child);
    const childSchema = node.child.inferredSchema || {
      name: 'anonymous',
      attributes: [],
    };

    const childAttrs = childSchema.attributes;
    const outputAttrs: Attribute[] = [];
    const seenNames = new Set<string>();

    for (const rawName of node.attributes) {
      // Check duplicate attribute in projection list
      if (seenNames.has(rawName)) {
        this.diagnostics.push({
          code: 'E_DUPLICATE_ATTRIBUTE',
          severity: 'warning',
          message: `Duplicate attribute '${rawName}' in projection list.`,
          range: node.range,
        });
      }
      seenNames.add(rawName);

      // Resolve attribute
      const resolved = this.resolveAttributeInSchema(rawName, childAttrs);
      if (!resolved) {
        const availableNames = childAttrs.map((a) => a.name);
        const suggestion = this.findClosestSuggestion(rawName, availableNames, node.range);

        this.diagnostics.push({
          code: 'E_UNRESOLVED_ATTRIBUTE',
          severity: 'error',
          message: `Attribute '${rawName}' not found in relation '${childSchema.name}'. Available attributes: ${availableNames.join(', ') || 'none'}.`,
          range: node.range,
          suggestion,
        });
      } else {
        outputAttrs.push(resolved);
      }
    }

    node.inferredSchema = {
      name: `π_${childSchema.name}`,
      attributes: outputAttrs,
    };

    return node;
  }

  // ---------------------------------------------------------------------------
  // 3. Selection (σ)
  // ---------------------------------------------------------------------------

  private analyzeSelection(node: SelectionNode): SelectionNode {
    node.child = this.analyzeNode(node.child);
    const childSchema = node.child.inferredSchema || {
      name: 'anonymous',
      attributes: [],
    };

    if (node.predicate && typeof node.predicate !== 'string') {
      this.typeCheckPredicate(node.predicate, childSchema.attributes, childSchema.name);
    }

    node.inferredSchema = {
      name: `σ_${childSchema.name}`,
      attributes: [...childSchema.attributes],
      primaryKey: childSchema.primaryKey,
    };

    return node;
  }

  // ---------------------------------------------------------------------------
  // 4. Rename (ρ)
  // ---------------------------------------------------------------------------

  private analyzeRenameRelation(node: RenameRelationNode): RenameRelationNode {
    node.child = this.analyzeNode(node.child);
    const childSchema = node.child.inferredSchema || {
      name: 'anonymous',
      attributes: [],
    };

    const positionalAttributes: string[] | undefined = (
      node as RenameRelationNode & { positionalAttributes?: string[] }
    ).positionalAttributes;

    if (positionalAttributes && positionalAttributes.length > 0) {
      if (positionalAttributes.length !== childSchema.attributes.length) {
        this.diagnostics.push({
          code: 'E_INVALID_RENAME_ARITY',
          severity: 'error',
          message: `Positional rename expects ${childSchema.attributes.length} attributes, but received ${positionalAttributes.length}.`,
          range: node.range,
        });
      }

      // Check duplicates in positional attributes
      const seen = new Set<string>();
      for (const attrName of positionalAttributes) {
        if (seen.has(attrName)) {
          this.diagnostics.push({
            code: 'E_DUPLICATE_ATTRIBUTE',
            severity: 'error',
            message: `Duplicate attribute '${attrName}' in positional rename list.`,
            range: node.range,
          });
        }
        seen.add(attrName);
      }

      const renamedAttrs: Attribute[] = childSchema.attributes.map((attr, idx) => ({
        ...attr,
        name: positionalAttributes[idx] || attr.name,
        sourceRelation: node.newRelationName || attr.sourceRelation,
        originalName: attr.originalName || attr.name,
      }));

      node.inferredSchema = {
        name: node.newRelationName || childSchema.name,
        attributes: renamedAttrs,
        primaryKey: childSchema.primaryKey,
      };
      return node;
    }

    // Relation alias rename
    const renamedAttrs: Attribute[] = childSchema.attributes.map((attr) => ({
      ...attr,
      sourceRelation: node.newRelationName || attr.sourceRelation,
    }));

    node.inferredSchema = {
      name: node.newRelationName || childSchema.name,
      attributes: renamedAttrs,
      primaryKey: childSchema.primaryKey,
    };

    return node;
  }

  private analyzeRenameAttributes(node: RenameAttributesNode): RenameAttributesNode {
    node.child = this.analyzeNode(node.child);
    const childSchema = node.child.inferredSchema || {
      name: 'anonymous',
      attributes: [],
    };

    const childAttrs = childSchema.attributes;
    const existingAttrNames = new Set(childAttrs.map((a) => a.name));

    // Check that target attributes exist in child schema
    for (const fromName of Object.keys(node.attributeMap)) {
      if (!existingAttrNames.has(fromName)) {
        const available = Array.from(existingAttrNames);
        const suggestion = this.findClosestSuggestion(fromName, available, node.range);

        this.diagnostics.push({
          code: 'E_UNRESOLVED_ATTRIBUTE',
          severity: 'error',
          message: `Attribute '${fromName}' to rename does not exist in relation '${childSchema.name}'. Available: ${available.join(', ')}.`,
          range: node.range,
          suggestion,
        });
      }
    }

    // Check collision in new attribute names
    const newNamesSeen = new Set<string>();
    for (const toName of Object.values(node.attributeMap)) {
      if (newNamesSeen.has(toName)) {
        this.diagnostics.push({
          code: 'E_DUPLICATE_ATTRIBUTE',
          severity: 'error',
          message: `Duplicate rename target attribute name '${toName}'.`,
          range: node.range,
        });
      }
      newNamesSeen.add(toName);
    }

    const renamedSchema = inferRenameSchema(
      childSchema,
      node.newRelationName,
      node.attributeMap
    );

    node.inferredSchema = renamedSchema;
    return node;
  }

  // ---------------------------------------------------------------------------
  // 5. Binary Operations: Cartesian Product, Joins, Sets, Division
  // ---------------------------------------------------------------------------

  private analyzeCartesianProduct(node: CartesianProductNode): CartesianProductNode {
    node.left = this.analyzeNode(node.left);
    node.right = this.analyzeNode(node.right);

    const s1 = node.left.inferredSchema || { name: 'left', attributes: [] };
    const s2 = node.right.inferredSchema || { name: 'right', attributes: [] };

    // Check duplicate attribute names across cross product
    const s1Names = new Set(s1.attributes.map((a: Attribute) => a.name));
    const duplicates = s2.attributes.filter((a: Attribute) => s1Names.has(a.name));
    if (duplicates.length > 0) {
      this.diagnostics.push({
        code: 'W_CROSS_PRODUCT_DUPLICATE_NAMES',
        severity: 'info',
        message: `Cartesian product creates duplicate attribute names (${duplicates.map((d: Attribute) => `'${d.name}'`).join(', ')}). Qualify with relation names or rename.`,
        range: node.range,
      });
    }

    node.inferredSchema = {
      name: `${s1.name}_⨯_${s2.name}`,
      attributes: [...s1.attributes, ...s2.attributes],
    };

    return node;
  }

  private analyzeNaturalJoin(node: NaturalJoinNode): NaturalJoinNode {
    node.left = this.analyzeNode(node.left);
    node.right = this.analyzeNode(node.right);

    const s1 = node.left.inferredSchema || { name: 'left', attributes: [] };
    const s2 = node.right.inferredSchema || { name: 'right', attributes: [] };

    const { schema, commonAttributes } = inferNaturalJoinSchema(s1, s2);
    node.commonAttributes = commonAttributes;

    // Check type compatibility of common attributes
    const s2Map = new Map(s2.attributes.map((a: Attribute) => [a.name, a.type]));
    for (const a1 of s1.attributes) {
      const t2 = s2Map.get(a1.name);
      if (t2 && t2 !== a1.type && a1.type !== 'null' && t2 !== 'null') {
        this.diagnostics.push({
          code: 'E_TYPE_MISMATCH',
          severity: 'error',
          message: `Natural join type mismatch on common attribute '${a1.name}': '${a1.type}' vs '${t2}'.`,
          range: node.range,
        });
      }
    }

    node.inferredSchema = schema;
    return node;
  }

  private analyzeThetaJoin(node: ThetaJoinNode): ThetaJoinNode {
    node.left = this.analyzeNode(node.left);
    node.right = this.analyzeNode(node.right);

    const s1 = node.left.inferredSchema || { name: 'left', attributes: [] };
    const s2 = node.right.inferredSchema || { name: 'right', attributes: [] };

    const combinedAttrs = [...s1.attributes, ...s2.attributes];

    if (node.predicate && typeof node.predicate !== 'string') {
      this.typeCheckPredicate(
        node.predicate,
        combinedAttrs,
        `${s1.name} ⋈ ${s2.name}`,
        s1,
        s2
      );
    }

    node.inferredSchema = {
      name: `${s1.name}_⋈_${s2.name}`,
      attributes: combinedAttrs,
    };

    return node;
  }

  private analyzeOuterJoin(
    node: LeftOuterJoinNode | RightOuterJoinNode | FullOuterJoinNode
  ): LeftOuterJoinNode | RightOuterJoinNode | FullOuterJoinNode {
    node.left = this.analyzeNode(node.left);
    node.right = this.analyzeNode(node.right);

    const s1 = node.left.inferredSchema || { name: 'left', attributes: [] };
    const s2 = node.right.inferredSchema || { name: 'right', attributes: [] };

    const joinType =
      node.type === 'left_join'
        ? 'left'
        : node.type === 'right_join'
        ? 'right'
        : 'full';

    const combinedAttrs = [...s1.attributes, ...s2.attributes];

    if (node.predicate && typeof node.predicate !== 'string') {
      this.typeCheckPredicate(
        node.predicate,
        combinedAttrs,
        `${s1.name} outer ${s2.name}`,
        s1,
        s2
      );
    }

    node.inferredSchema = inferOuterJoinSchema(s1, s2, joinType);
    return node;
  }

  private analyzeSetOperation(
    node: UnionNode | DifferenceNode | IntersectionNode
  ): UnionNode | DifferenceNode | IntersectionNode {
    node.left = this.analyzeNode(node.left);
    node.right = this.analyzeNode(node.right);

    const s1 = node.left.inferredSchema || { name: 'left', attributes: [] };
    const s2 = node.right.inferredSchema || { name: 'right', attributes: [] };

    const compat = checkUnionCompatibility(s1, s2);
    if (!compat.compatible) {
      this.diagnostics.push({
        code: compat.diagnostic || 'E_UNION_INCOMPATIBLE_ARITY',
        severity: 'error',
        message: compat.error || 'Union compatibility check failed.',
        range: node.range,
      });
    }

    const opSymbol =
      node.type === 'union' ? '∪' : node.type === 'intersection' ? '∩' : '−';

    node.inferredSchema = {
      name: `${s1.name}_${opSymbol}_${s2.name}`,
      attributes: [...s1.attributes],
    };

    return node;
  }

  private analyzeDivision(node: DivisionNode): DivisionNode {
    node.left = this.analyzeNode(node.left);
    node.right = this.analyzeNode(node.right);

    const dividend = node.left.inferredSchema || { name: 'dividend', attributes: [] };
    const divisor = node.right.inferredSchema || { name: 'divisor', attributes: [] };

    const compat = checkDivisionCompatibility(dividend, divisor);
    if (!compat.compatible) {
      this.diagnostics.push({
        code: compat.diagnostic || 'E_DIVISION_NOT_SUBSET',
        severity: 'error',
        message: compat.error || 'Relational division validation failed.',
        range: node.range,
      });
    }

    if (divisor.attributes.length === 0) {
      this.diagnostics.push({
        code: 'W_VACUOUS_EMPTY_DIVISOR',
        severity: 'warning',
        message: 'Relational division by empty divisor yields universal dividend schema.',
        range: node.range,
      });
    }

    node.quotientAttributes = compat.quotientAttributes.map((a) => a.name);
    node.inferredSchema = {
      name: `${dividend.name}_÷_${divisor.name}`,
      attributes: compat.quotientAttributes,
    };

    return node;
  }

  // ---------------------------------------------------------------------------
  // 6. Predicate Type Checking & Ambiguity Detection
  // ---------------------------------------------------------------------------

  private typeCheckPredicate(
    pred: PredicateNode,
    availableAttrs: Attribute[],
    relationName: string,
    leftSchema?: RelationSchema,
    rightSchema?: RelationSchema
  ): AttributeType {
    if (!pred) return 'null';

    switch (pred.type) {
      case 'literal': {
        const lit = pred as LiteralPredicateNode;
        return lit.dataType;
      }

      case 'identifier': {
        const id = pred as IdentifierPredicateNode;
        const attrName = id.attributeName;
        const qualifier = id.relationQualifier;

        // Check ambiguity if joining two schemas without qualifier
        if (!qualifier && leftSchema && rightSchema) {
          const inLeft = leftSchema.attributes.some((a) => a.name === attrName);
          const inRight = rightSchema.attributes.some((a) => a.name === attrName);

          if (inLeft && inRight) {
            this.diagnostics.push({
              code: 'E_AMBIGUOUS_ATTRIBUTE',
              severity: 'error',
              message: `Attribute '${attrName}' is ambiguous across relations '${leftSchema.name}' and '${rightSchema.name}'. Qualify with relation name (e.g. '${leftSchema.name}.${attrName}').`,
              range: id.range,
              suggestion: {
                title: `Qualify with '${leftSchema.name}.${attrName}'`,
                replacement: `${leftSchema.name}.${attrName}`,
                range: id.range,
              },
            });
          }
        }

        const resolved = this.resolveAttributeInSchema(
          qualifier ? `${qualifier}.${attrName}` : attrName,
          availableAttrs
        );

        if (!resolved) {
          const availableNames = availableAttrs.map((a) =>
            a.sourceRelation ? `${a.sourceRelation}.${a.name}` : a.name
          );
          const suggestion = this.findClosestSuggestion(
            attrName,
            availableAttrs.map((a) => a.name),
            id.range
          );

          this.diagnostics.push({
            code: 'E_UNRESOLVED_ATTRIBUTE',
            severity: 'error',
            message: `Attribute '${qualifier ? `${qualifier}.${attrName}` : attrName}' not found in relation '${relationName}'. Available attributes: ${availableNames.join(', ') || 'none'}.`,
            range: id.range,
            suggestion,
          });
          return 'null';
        }

        return resolved.type;
      }

      case 'comparison': {
        const comp = pred as ComparisonPredicateNode;
        const leftType = this.typeCheckPredicate(
          comp.left,
          availableAttrs,
          relationName,
          leftSchema,
          rightSchema
        );
        const rightType = this.typeCheckPredicate(
          comp.right,
          availableAttrs,
          relationName,
          leftSchema,
          rightSchema
        );

        // Check for NULL comparison: salary = NULL
        if (
          (comp.left.type === 'literal' && (comp.left as LiteralPredicateNode).dataType === 'null') ||
          (comp.right.type === 'literal' && (comp.right as LiteralPredicateNode).dataType === 'null')
        ) {
          this.diagnostics.push({
            code: 'W_POSSIBLE_NULL_FILTER',
            severity: 'warning',
            message: "Comparison with NULL produces UNKNOWN under 3VL. Use 'IS NULL' or 'IS NOT NULL' instead.",
            range: comp.range,
          });
        }

        // Incompatible types
        if (
          leftType !== rightType &&
          leftType !== 'null' &&
          rightType !== 'null'
        ) {
          this.diagnostics.push({
            code: 'E_TYPE_MISMATCH',
            severity: 'error',
            message: `Cannot compare incompatible types '${leftType}' and '${rightType}' with operator '${comp.operator}'.`,
            range: comp.range,
          });
        }

        // Relational ordering (<, <=, >, >=) on boolean
        if (
          (comp.operator === '<' ||
            comp.operator === '<=' ||
            comp.operator === '>' ||
            comp.operator === '>=') &&
          (leftType === 'boolean' || rightType === 'boolean')
        ) {
          this.diagnostics.push({
            code: 'E_TYPE_MISMATCH',
            severity: 'error',
            message: `Ordering operator '${comp.operator}' cannot be applied to type 'boolean'.`,
            range: comp.range,
          });
        }

        return 'boolean';
      }

      case 'logical_binary': {
        const bin = pred as LogicalBinaryPredicateNode;
        this.typeCheckPredicate(bin.left, availableAttrs, relationName, leftSchema, rightSchema);
        this.typeCheckPredicate(bin.right, availableAttrs, relationName, leftSchema, rightSchema);
        return 'boolean';
      }

      case 'logical_unary': {
        const un = pred as LogicalUnaryPredicateNode;
        this.typeCheckPredicate(un.operand, availableAttrs, relationName, leftSchema, rightSchema);
        return 'boolean';
      }

      case 'null_check': {
        const nc = pred as NullCheckPredicateNode;
        this.typeCheckPredicate(nc.operand, availableAttrs, relationName, leftSchema, rightSchema);
        return 'boolean';
      }

      default:
        return 'boolean';
    }
  }

  private resolveAttributeInSchema(
    rawName: string,
    attributes: Attribute[]
  ): Attribute | undefined {
    // 1. Direct name match
    const exact = attributes.find((a) => a.name === rawName);
    if (exact) return exact;

    // 2. Qualified name match: "Employees.salary" -> sourceRelation="Employees", name="salary"
    if (rawName.includes('.')) {
      const [rel, col] = rawName.split('.');
      return attributes.find(
        (a) =>
          (a.name === col && a.sourceRelation === rel) ||
          a.name === rawName ||
          (a.originalName === col && a.sourceRelation === rel)
      );
    }

    // 3. Match originalName or column name
    return attributes.find(
      (a) => a.name === rawName || a.originalName === rawName
    );
  }

  // ---------------------------------------------------------------------------
  // 7. Suggestions & Levenshtein Edit Distance
  // ---------------------------------------------------------------------------

  private findClosestSuggestion(
    target: string,
    candidates: string[],
    range: SourceRange
  ): DiagnosticSuggestion | undefined {
    if (!target || candidates.length === 0) return undefined;

    let minDistance = Infinity;
    let closestCandidate = '';

    const targetLower = target.toLowerCase();

    for (const cand of candidates) {
      const candLower = cand.toLowerCase();
      const dist = this.levenshteinDistance(targetLower, candLower);
      if (dist < minDistance) {
        minDistance = dist;
        closestCandidate = cand;
      }
    }

    // Threshold: only suggest if distance is small
    const threshold = Math.max(1, Math.floor(target.length / 2));
    if (minDistance <= threshold && minDistance > 0) {
      return {
        title: `Did you mean '${closestCandidate}'?`,
        replacement: closestCandidate,
        range,
      };
    }

    return undefined;
  }

  private levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      new Array(n + 1).fill(0)
    );

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return dp[m][n];
  }
}

export function analyze(
  ast: ASTNode,
  schemas: Record<string, RelationSchema> | RelationSchema[]
): AnalysisResult {
  const analyzer = new SemanticAnalyzer(schemas);
  return analyzer.analyze(ast);
}
