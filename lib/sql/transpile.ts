import {
  checkDivisionCompatibility,
  inferNaturalJoinSchema,
  OPERATOR_CONTRACTS,
} from '@/lib/engine/contract';
import type {
  ASTNode,
  Attribute,
  CartesianProductNode,
  Diagnostic,
  DivisionNode,
  FullOuterJoinNode,
  LeftOuterJoinNode,
  NaturalJoinNode,
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
  DifferenceNode,
  IntersectionNode,
} from '@/lib/engine/types';
import { AliasAllocator } from './aliases';
import { formatSql } from './format';
import { compilePredicate, type PredicateSqlContext } from './predicate';
import { SqlParameterBinder } from './parameters';
import { formatIdentifier } from './quote';
import type { AstToSqlMapping, SqlTranspilationResult } from './types';
import { SQL_DIALECT_ID, SQL_DIALECT_VERSION } from './types';

interface CompiledRelation {
  sql: string;
  alias: string;
  schema: RelationSchema;
}

interface TranspileState {
  aliases: AliasAllocator;
  binder: SqlParameterBinder;
  mappings: AstToSqlMapping[];
  baseRelations: Set<string>;
  diagnostics: Diagnostic[];
}

export function transpileRaAst(
  ast: ASTNode,
  schemas: Record<string, RelationSchema> = {}
): SqlTranspilationResult {
  const state: TranspileState = {
    aliases: new AliasAllocator(),
    binder: new SqlParameterBinder(),
    mappings: [],
    baseRelations: new Set(Object.keys(schemas)),
    diagnostics: [],
  };

  try {
    const compiled = compileNode(ast, state);
    const rawSql = compiled.sql.trim();
    const formattedSql = formatSql(rawSql);

    recordMapping(ast, state, formattedSql, operatorLabel(ast.type));

    return {
      success: state.diagnostics.every((d) => d.severity !== 'error'),
      dialect: SQL_DIALECT_ID,
      dialectVersion: SQL_DIALECT_VERSION,
      sql: rawSql,
      formattedSql,
      parameters: state.binder.getParameters(),
      mappings: state.mappings,
      diagnostics: state.diagnostics,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'SQL transpilation failed unexpectedly.';
    return {
      success: false,
      dialect: SQL_DIALECT_ID,
      dialectVersion: SQL_DIALECT_VERSION,
      parameters: state.binder.getParameters(),
      mappings: state.mappings,
      diagnostics: [
        ...state.diagnostics,
        {
          code: 'E_SQL_TRANSPILATION',
          severity: 'error',
          message,
          range: ast.range,
        },
      ],
    };
  }
}

function operatorLabel(type: ASTNode['type']): string {
  const contract = OPERATOR_CONTRACTS[type as keyof typeof OPERATOR_CONTRACTS];
  return contract?.symbol ?? type;
}

function recordMapping(
  node: ASTNode,
  state: TranspileState,
  sql: string,
  label: string,
  sqlOverride?: string
): void {
  const target = sqlOverride ?? sql;
  state.mappings.push({
    nodeId: node.id,
    operator: node.type,
    sqlStart: 0,
    sqlEnd: target.length,
    label,
  });
}

function fail(
  state: TranspileState,
  message: string,
  range: SourceRange,
  code: 'E_SQL_TRANSPILATION' | 'E_SQL_UNSUPPORTED' = 'E_SQL_UNSUPPORTED'
): never {
  state.diagnostics.push({ code, severity: 'error', message, range });
  throw new Error(message);
}

function requireSchema(node: ASTNode, state: TranspileState): RelationSchema {
  if (!node.inferredSchema) {
    fail(state, `Missing inferred schema for ${node.type} node.`, node.range);
  }
  return node.inferredSchema;
}

function wrapSelect(
  selectList: string,
  fromClause: string,
  whereClause?: string,
  distinct = true
): string {
  const distinctKw = distinct ? 'SELECT DISTINCT' : 'SELECT';
  const where = whereClause ? ` WHERE ${whereClause}` : '';
  return `${distinctKw} ${selectList} FROM ${fromClause}${where}`;
}

function compileNode(node: ASTNode, state: TranspileState): CompiledRelation {
  switch (node.type) {
    case 'relation':
      return compileRelation(node as RelationNode, state);
    case 'selection':
      return compileSelection(node as SelectionNode, state);
    case 'projection':
      return compileProjection(node as ProjectionNode, state);
    case 'rename_relation':
    case 'rename':
      return compileRenameRelation(node as RenameRelationNode, state);
    case 'rename_attributes':
      return compileRenameAttributes(node as RenameAttributesNode, state);
    case 'cartesian_product':
      return compileCartesian(node as CartesianProductNode, state);
    case 'natural_join':
      return compileNaturalJoin(node as NaturalJoinNode, state);
    case 'theta_join':
      return compileThetaJoin(node as ThetaJoinNode, state);
    case 'left_join':
      return compileOuterJoin(node as LeftOuterJoinNode, state, 'LEFT');
    case 'right_join':
      return compileOuterJoin(node as RightOuterJoinNode, state, 'RIGHT');
    case 'full_join':
      return compileOuterJoin(node as FullOuterJoinNode, state, 'FULL');
    case 'union':
      return compileSetOp(node as UnionNode, state, 'UNION');
    case 'difference':
      return compileSetOp(node as DifferenceNode, state, 'EXCEPT');
    case 'intersection':
      return compileSetOp(node as IntersectionNode, state, 'INTERSECT');
    case 'division':
      return compileDivision(node as DivisionNode, state);
    default: {
      const unsupported = node as ASTNode;
      fail(
        state,
        `Unsupported operator '${unsupported.type}' for SQL transpilation.`,
        unsupported.range
      );
    }
  }
}

function compileRelation(node: RelationNode, state: TranspileState): CompiledRelation {
  const schema = requireSchema(node, state);
  const alias = state.aliases.next('r');
  const table = formatIdentifier(node.relationName);
  const sql = wrapSelect('*', `${table} AS ${alias}`, undefined, true);
  recordMapping(node, state, sql, 'R');
  return { sql, alias, schema };
}

function asSubquery(inner: CompiledRelation, state: TranspileState): CompiledRelation {
  const alias = state.aliases.next('q');
  return {
    sql: `(${inner.sql}) AS ${alias}`,
    alias,
    schema: inner.schema,
  };
}

function compileSubquery(child: ASTNode, state: TranspileState): CompiledRelation {
  return asSubquery(compileNode(child, state), state);
}

function compileSelection(node: SelectionNode, state: TranspileState): CompiledRelation {
  const child = compileSubquery(node.child, state);
  const schema = requireSchema(node, state);

  if (!node.predicate || typeof node.predicate === 'string') {
    fail(
      state,
      'Selection predicate must be parsed before SQL can be generated.',
      node.range
    );
  }

  const predCtx: PredicateSqlContext = {
    binder: state.binder,
    qualifierToAlias: new Map([[child.schema.name, child.alias]]),
    defaultAlias: child.alias,
  };

  const where = compilePredicate(node.predicate as PredicateNode, predCtx);
  const sql = wrapSelect('*', child.sql, where, true);
  recordMapping(node, state, sql, 'σ');
  return { sql, alias: child.alias, schema };
}

function compileProjection(node: ProjectionNode, state: TranspileState): CompiledRelation {
  const child = compileSubquery(node.child, state);
  const schema = requireSchema(node, state);
  const cols = node.attributes.map((a) => formatIdentifier(a)).join(', ');
  const sql = wrapSelect(cols, child.sql, undefined, true);
  recordMapping(node, state, sql, 'π');
  return { sql, alias: child.alias, schema };
}

function compileRenameRelation(
  node: RenameRelationNode & { positionalAttributes?: string[] },
  state: TranspileState
): CompiledRelation {
  const inner = compileNode(node.child, state);
  const schema = requireSchema(node, state);
  const positional = node.positionalAttributes;
  const relAliasToken = state.aliases.next('n');
  const relAliasSql = node.newRelationName
    ? formatIdentifier(node.newRelationName)
    : relAliasToken;
  const fromClause = `(${inner.sql}) AS ${relAliasSql}`;

  let sql: string;
  if (positional && positional.length > 0) {
    const selectList = inner.schema.attributes
      .map((attr, idx) => {
        const target = positional[idx] ?? attr.name;
        return `${relAliasSql}.${formatIdentifier(attr.name)} AS ${formatIdentifier(target)}`;
      })
      .join(', ');
    sql = wrapSelect(selectList, fromClause, undefined, false);
  } else {
    sql = wrapSelect('*', fromClause, undefined, false);
  }

  const outAlias = node.newRelationName ?? relAliasToken;
  recordMapping(node, state, sql, 'ρ');
  return { sql, alias: outAlias, schema };
}

function compileRenameAttributes(node: RenameAttributesNode, state: TranspileState): CompiledRelation {
  const child = compileSubquery(node.child, state);
  const schema = requireSchema(node, state);
  const map = node.attributeMap;

  const selectList = child.schema.attributes
    .map((attr) => {
      const outName = map[attr.name] ?? attr.name;
      return `${child.alias}.${formatIdentifier(attr.name)} AS ${formatIdentifier(outName)}`;
    })
    .join(', ');

  const alias = state.aliases.next('a');
  const sql = wrapSelect(selectList, child.sql, undefined, false);
  recordMapping(node, state, sql, 'ρ');
  return { sql, alias, schema };
}

function hasDuplicateNames(attrs: Attribute[]): boolean {
  const seen = new Set<string>();
  for (const a of attrs) {
    if (seen.has(a.name)) {
      return true;
    }
    seen.add(a.name);
  }
  return false;
}

function compileCartesianPair(
  node: ASTNode,
  left: CompiledRelation,
  right: CompiledRelation,
  state: TranspileState,
  label: string
): CompiledRelation {
  const schema = requireSchema(node, state);

  if (hasDuplicateNames(schema.attributes)) {
    fail(
      state,
      'Cartesian product with duplicate attribute names cannot be expressed as executable SQL without renaming. Qualify or rename attributes first.',
      node.range
    );
  }

  const sql = wrapSelect(
    '*',
    `${left.sql} CROSS JOIN ${right.sql}`,
    undefined,
    true
  );
  recordMapping(node, state, sql, label);
  return { sql, alias: left.alias, schema };
}

function compileCartesian(node: CartesianProductNode, state: TranspileState): CompiledRelation {
  const left = compileSubquery(node.left, state);
  const right = compileSubquery(node.right, state);
  return compileCartesianPair(node, left, right, state, '⨯');
}

function compileNaturalJoin(node: NaturalJoinNode, state: TranspileState): CompiledRelation {
  const left = compileSubquery(node.left, state);
  const right = compileSubquery(node.right, state);
  const schema = requireSchema(node, state);
  const { commonAttributes } = inferNaturalJoinSchema(left.schema, right.schema);

  if (commonAttributes.length === 0) {
    return compileCartesianPair(node, left, right, state, '⨯');
  }

  const sql = wrapSelect(
    '*',
    `${left.sql} NATURAL JOIN ${right.sql}`,
    undefined,
    true
  );
  recordMapping(node, state, sql, '⋈');
  return { sql, alias: left.alias, schema };
}

function compileThetaJoin(node: ThetaJoinNode, state: TranspileState): CompiledRelation {
  const left = compileSubquery(node.left, state);
  const right = compileSubquery(node.right, state);
  const schema = requireSchema(node, state);

  if (!node.predicate || typeof node.predicate === 'string') {
    return compileCartesianPair(node, left, right, state, '⨯');
  }

  if (hasDuplicateNames(schema.attributes)) {
    fail(
      state,
      'Theta join result has duplicate attribute names; rename attributes before generating SQL.',
      node.range
    );
  }

  const predCtx: PredicateSqlContext = {
    binder: state.binder,
    qualifierToAlias: new Map([
      [left.schema.name, left.alias],
      [right.schema.name, right.alias],
    ]),
    leftSchema: left.schema,
    rightSchema: right.schema,
  };

  const on = compilePredicate(node.predicate as PredicateNode, predCtx);
  const sql = wrapSelect('*', `${left.sql} JOIN ${right.sql} ON ${on}`, undefined, true);
  recordMapping(node, state, sql, '⋈θ');
  return { sql, alias: left.alias, schema };
}

function compileOuterJoin(
  node: LeftOuterJoinNode | RightOuterJoinNode | FullOuterJoinNode,
  state: TranspileState,
  side: 'LEFT' | 'RIGHT' | 'FULL'
): CompiledRelation {
  const left = compileSubquery(node.left, state);
  const right = compileSubquery(node.right, state);
  const schema = requireSchema(node, state);
  const { commonAttributes } = inferNaturalJoinSchema(left.schema, right.schema);

  const hasPredicate = node.predicate && typeof node.predicate !== 'string';

  let joinClause: string;
  if (hasPredicate) {
    const predCtx: PredicateSqlContext = {
      binder: state.binder,
      qualifierToAlias: new Map([
        [left.schema.name, left.alias],
        [right.schema.name, right.alias],
      ]),
      leftSchema: left.schema,
      rightSchema: right.schema,
    };
    const on = compilePredicate(node.predicate as PredicateNode, predCtx);
    joinClause = `${left.sql} ${side} OUTER JOIN ${right.sql} ON ${on}`;
  } else if (commonAttributes.length > 0) {
    joinClause = `${left.sql} NATURAL ${side} OUTER JOIN ${right.sql}`;
  } else {
    fail(
      state,
      `${side} outer join requires a join predicate or common attribute names for SQL generation.`,
      node.range
    );
  }

  const sql = wrapSelect('*', joinClause, undefined, true);
  const symbol = side === 'LEFT' ? '⟕' : side === 'RIGHT' ? '⟖' : '⟗';
  recordMapping(node, state, sql, symbol);
  return { sql, alias: left.alias, schema };
}

function compileSetOp(
  node: UnionNode | DifferenceNode | IntersectionNode,
  state: TranspileState,
  op: 'UNION' | 'EXCEPT' | 'INTERSECT'
): CompiledRelation {
  const left = compileSubquery(node.left, state);
  const right = compileSubquery(node.right, state);
  const schema = requireSchema(node, state);
  const cols = schema.attributes.map((a) => formatIdentifier(a.name)).join(', ');

  const leftSelect = wrapSelect(cols, left.sql, undefined, op === 'UNION');
  const rightSelect = wrapSelect(cols, right.sql, undefined, op === 'UNION');
  const sql = `${leftSelect}\n${op}\n${rightSelect}`;
  const label = op === 'UNION' ? '∪' : op === 'INTERSECT' ? '∩' : '−';
  recordMapping(node, state, sql, label);
  return { sql, alias: left.alias, schema };
}

function compileDivision(node: DivisionNode, state: TranspileState): CompiledRelation {
  const dividendInner = compileNode(node.left, state);
  const divisorInner = compileNode(node.right, state);
  const dividendSchema = dividendInner.schema;
  const divisorSchema = divisorInner.schema;
  const schema = requireSchema(node, state);

  const compat = checkDivisionCompatibility(dividendSchema, divisorSchema);
  if (!compat.compatible) {
    fail(state, compat.error ?? 'Relational division is not compatible.', node.range);
  }

  const quotientCols = compat.quotientAttributes.map((a) => formatIdentifier(a.name));
  const quotientSelect = quotientCols.join(', ');

  if (divisorSchema.attributes.length === 0) {
    const sql = wrapSelect(quotientSelect, `(${dividendInner.sql}) AS ${state.aliases.next('d')}`, undefined, true);
    recordMapping(node, state, sql, '÷');
    return { sql, alias: dividendInner.alias, schema };
  }

  const divisorCols = divisorSchema.attributes.map((a) => a.name);
  const r1 = state.aliases.next('d1');
  const r2 = state.aliases.next('d2');
  const sAlias = state.aliases.next('s');

  const correlateQuotient = compat.quotientAttributes
    .map((a) => `${r2}.${formatIdentifier(a.name)} = ${r1}.${formatIdentifier(a.name)}`)
    .join(' AND ');

  const correlateDivisor = divisorCols
    .map((name) => `${r2}.${formatIdentifier(name)} = ${sAlias}.${formatIdentifier(name)}`)
    .join(' AND ');

  const sql = wrapSelect(
    quotientCols.map((c) => `${r1}.${c}`).join(', '),
    `(${dividendInner.sql}) AS ${r1}`,
    `NOT EXISTS (
  SELECT 1
  FROM (${divisorInner.sql}) AS ${sAlias}
  WHERE NOT EXISTS (
    SELECT 1
    FROM (${dividendInner.sql}) AS ${r2}
    WHERE ${correlateQuotient} AND ${correlateDivisor}
  )
)`,
    true
  );

  recordMapping(node, state, sql, '÷');
  return { sql, alias: r1, schema };
}
