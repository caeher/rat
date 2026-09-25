import type {
  ComparisonPredicateNode,
  IdentifierPredicateNode,
  LiteralPredicateNode,
  NullCheckPredicateNode,
  PredicateNode,
  RelationSchema,
} from '@/lib/engine/types';
import { formatIdentifier } from './quote';
import type { SqlParameterBinder } from './parameters';

export interface PredicateSqlContext {
  binder: SqlParameterBinder;
  /** Map relation / alias names from RA qualifiers to SQL table aliases */
  qualifierToAlias: Map<string, string>;
  defaultAlias?: string;
  leftSchema?: RelationSchema;
  rightSchema?: RelationSchema;
}

export function compilePredicate(
  predicate: PredicateNode,
  ctx: PredicateSqlContext
): string {
  switch (predicate.type) {
    case 'literal':
      return compileLiteralPredicate(predicate, ctx);
    case 'identifier':
      return compileIdentifierRef(predicate, ctx);
    case 'comparison':
      return compileComparison(predicate, ctx);
    case 'logical_binary':
      return `(${compilePredicate(predicate.left, ctx)} ${predicate.operator} ${compilePredicate(predicate.right, ctx)})`;
    case 'logical_unary':
      return `(NOT ${compilePredicate(predicate.operand, ctx)})`;
    case 'null_check':
      return compileNullCheck(predicate, ctx);
    default: {
      const _exhaustive: never = predicate;
      return String(_exhaustive);
    }
  }
}

function compileLiteralPredicate(node: LiteralPredicateNode, ctx: PredicateSqlContext): string {
  if (node.dataType === 'boolean' && typeof node.value === 'boolean') {
    return node.value ? '1' : '0';
  }
  return ctx.binder.bind(node.value);
}

function resolveQualifierAlias(
  qualifier: string | undefined,
  ctx: PredicateSqlContext
): string | undefined {
  if (!qualifier) {
    return ctx.defaultAlias;
  }
  const direct = ctx.qualifierToAlias.get(qualifier);
  if (direct) {
    return direct;
  }
  if (ctx.leftSchema?.name === qualifier) {
    return ctx.qualifierToAlias.get(ctx.leftSchema.name);
  }
  if (ctx.rightSchema?.name === qualifier) {
    return ctx.qualifierToAlias.get(ctx.rightSchema.name);
  }
  for (const [key, alias] of ctx.qualifierToAlias.entries()) {
    if (key.toLowerCase() === qualifier.toLowerCase()) {
      return alias;
    }
  }
  return ctx.defaultAlias;
}

function compileIdentifierRef(node: IdentifierPredicateNode, ctx: PredicateSqlContext): string {
  const alias = resolveQualifierAlias(node.relationQualifier, ctx);
  const col = formatIdentifier(node.attributeName);
  if (alias) {
    return `${alias}.${col}`;
  }
  return col;
}

function compileComparison(node: ComparisonPredicateNode, ctx: PredicateSqlContext): string {
  const left = compilePredicateSide(node.left, ctx);
  const right = compilePredicateSide(node.right, ctx);
  const op = node.operator === '!=' ? '<>' : node.operator;
  return `(${left} ${op} ${right})`;
}

function compilePredicateSide(node: PredicateNode, ctx: PredicateSqlContext): string {
  if (node.type === 'literal') {
    return compileLiteralPredicate(node as LiteralPredicateNode, ctx);
  }
  if (node.type === 'identifier') {
    return compileIdentifierRef(node as IdentifierPredicateNode, ctx);
  }
  return compilePredicate(node, ctx);
}

function compileNullCheck(node: NullCheckPredicateNode, ctx: PredicateSqlContext): string {
  const operand = compilePredicateSide(node.operand, ctx);
  if (node.operator === 'IS NULL') {
    return `(${operand} IS NULL)`;
  }
  return `(${operand} IS NOT NULL)`;
}
