import {
  areCellValuesEqual,
  evaluate3VLAnd,
  evaluate3VLNot,
  evaluate3VLOr,
} from '@/lib/engine/contract';
import type {
  Attribute,
  ComparisonPredicateNode,
  IdentifierPredicateNode,
  LiteralPredicateNode,
  LogicalBinaryPredicateNode,
  LogicalUnaryPredicateNode,
  NullCheckPredicateNode,
  PredicateNode,
  RelationSchema,
  Tuple,
  TupleValue,
} from '@/lib/engine/types';

function resolveAttributeValue(
  attrName: string,
  qualifier: string | undefined,
  tuple: Tuple,
  schema: RelationSchema,
  leftSchema?: RelationSchema,
  rightSchema?: RelationSchema
): TupleValue | undefined {
  if (qualifier && leftSchema && rightSchema) {
    const leftMatch = leftSchema.name === qualifier || leftSchema.attributes.some(
      (a) => a.sourceRelation === qualifier
    );
    const rightMatch = rightSchema.name === qualifier || rightSchema.attributes.some(
      (a) => a.sourceRelation === qualifier
    );
    if (leftMatch && !rightMatch) {
      const qualified = `${qualifier}.${attrName}`;
      if (qualified in tuple) {
        return tuple[qualified];
      }
      return tuple[attrName] ?? findInSchema(tuple, leftSchema, attrName);
    }
    if (rightMatch && !leftMatch) {
      const qualified = `${qualifier}.${attrName}`;
      if (qualified in tuple) {
        return tuple[qualified];
      }
      return tuple[attrName] ?? findInSchema(tuple, rightSchema, attrName);
    }
  }

  if (qualifier) {
    const qualified = `${qualifier}.${attrName}`;
    if (qualified in tuple) {
      return tuple[qualified];
    }
  }

  const direct = tuple[attrName];
  if (direct !== undefined) {
    return direct;
  }

  return findInSchema(tuple, schema, attrName);
}

function findInSchema(
  tuple: Tuple,
  schema: RelationSchema,
  attrName: string
): TupleValue | undefined {
  const attr = schema.attributes.find(
    (a) => a.name === attrName || a.originalName === attrName
  );
  if (attr) {
    return tuple[attr.name];
  }
  return undefined;
}

function compareValues(
  op: ComparisonPredicateNode['operator'],
  left: TupleValue,
  right: TupleValue
): boolean | null {
  if (left === null || right === null) {
    return null;
  }

  if (typeof left !== typeof right) {
    return null;
  }

  switch (op) {
    case '=':
      return left === right;
    case '!=':
    case '<>':
      return left !== right;
    case '<':
      return left < right;
    case '<=':
      return left <= right;
    case '>':
      return left > right;
    case '>=':
      return left >= right;
    default:
      return null;
  }
}

export function evaluatePredicate(
  pred: PredicateNode,
  tuple: Tuple,
  schema: RelationSchema,
  leftSchema?: RelationSchema,
  rightSchema?: RelationSchema
): boolean | null {
  switch (pred.type) {
    case 'literal': {
      const lit = pred as LiteralPredicateNode;
      if (lit.dataType === 'boolean' && typeof lit.value === 'boolean') {
        return lit.value;
      }
      return null;
    }
    case 'identifier': {
      const id = pred as IdentifierPredicateNode;
      const value = resolveAttributeValue(
        id.attributeName,
        id.relationQualifier,
        tuple,
        schema,
        leftSchema,
        rightSchema
      );
      if (value === undefined) {
        return null;
      }
      if (typeof value === 'boolean') {
        return value;
      }
      return null;
    }
    case 'comparison': {
      const comp = pred as ComparisonPredicateNode;
      const leftVal = evaluateValueExpr(comp.left, tuple, schema, leftSchema, rightSchema);
      const rightVal = evaluateValueExpr(comp.right, tuple, schema, leftSchema, rightSchema);
      if (leftVal === undefined || rightVal === undefined) {
        return null;
      }
      return compareValues(comp.operator, leftVal, rightVal);
    }
    case 'logical_binary': {
      const bin = pred as LogicalBinaryPredicateNode;
      const l = evaluatePredicate(bin.left, tuple, schema, leftSchema, rightSchema);
      const r = evaluatePredicate(bin.right, tuple, schema, leftSchema, rightSchema);
      return bin.operator === 'AND' ? evaluate3VLAnd(l, r) : evaluate3VLOr(l, r);
    }
    case 'logical_unary': {
      const un = pred as LogicalUnaryPredicateNode;
      const v = evaluatePredicate(un.operand, tuple, schema, leftSchema, rightSchema);
      return evaluate3VLNot(v);
    }
    case 'null_check': {
      const nc = pred as NullCheckPredicateNode;
      const v = evaluateValueExpr(nc.operand, tuple, schema, leftSchema, rightSchema);
      if (v === undefined) {
        return null;
      }
      const isNull = v === null;
      return nc.operator === 'IS NULL' ? isNull : !isNull;
    }
    default:
      return null;
  }
}

function evaluateValueExpr(
  node: PredicateNode,
  tuple: Tuple,
  schema: RelationSchema,
  leftSchema?: RelationSchema,
  rightSchema?: RelationSchema
): TupleValue | undefined {
  if (node.type === 'literal') {
    return (node as LiteralPredicateNode).value;
  }
  if (node.type === 'identifier') {
    const id = node as IdentifierPredicateNode;
    return resolveAttributeValue(
      id.attributeName,
      id.relationQualifier,
      tuple,
      schema,
      leftSchema,
      rightSchema
    );
  }
  return undefined;
}

/** Natural join / outer join key match (NULL keys do not match). */
export function joinKeysMatch(
  left: Tuple,
  right: Tuple,
  commonAttributes: string[],
  leftSchema: RelationSchema,
  rightSchema: RelationSchema
): boolean {
  for (const key of commonAttributes) {
    const lv = findInSchema(left, leftSchema, key);
    const rv = findInSchema(right, rightSchema, key);
    if (lv === undefined || rv === undefined || lv === null || rv === null) {
      return false;
    }
    if (!areCellValuesEqual(lv, rv, false)) {
      return false;
    }
  }
  return true;
}

export function mergeTupleSchemas(
  left: Tuple,
  right: Tuple,
  outAttributes: Attribute[],
  leftSchema: RelationSchema,
  rightSchema: RelationSchema,
  commonAttributes?: string[]
): Tuple {
  const commons = new Set(commonAttributes ?? []);
  const leftOnly = new Set(
    leftSchema.attributes.map((a) => a.name).filter((n) => !commons.has(n))
  );

  const out: Tuple = {};
  for (const attr of outAttributes) {
    if (commons.has(attr.name)) {
      const lv = findInSchema(left, leftSchema, attr.name);
      out[attr.name] = lv !== undefined ? lv : findInSchema(right, rightSchema, attr.name) ?? null;
      continue;
    }
    if (leftOnly.has(attr.name)) {
      out[attr.name] = findInSchema(left, leftSchema, attr.name) ?? null;
      continue;
    }
    out[attr.name] = findInSchema(right, rightSchema, attr.name) ?? null;
  }
  return out;
}

/** Cartesian / theta join row merge; adds relation-qualified keys for predicates. */
export function mergeTupleForJoinPredicate(
  left: Tuple,
  right: Tuple,
  leftSchema: RelationSchema,
  rightSchema: RelationSchema
): Tuple {
  const merged = mergeTupleSchemasConcat(
    left,
    right,
    [...leftSchema.attributes, ...rightSchema.attributes],
    leftSchema,
    rightSchema
  );
  for (const attr of leftSchema.attributes) {
    merged[`${leftSchema.name}.${attr.name}`] = left[attr.name] ?? null;
  }
  for (const attr of rightSchema.attributes) {
    merged[`${rightSchema.name}.${attr.name}`] = right[attr.name] ?? null;
  }
  return merged;
}

/** Cartesian / theta join: left attributes then right attributes in order. */
export function mergeTupleSchemasConcat(
  left: Tuple,
  right: Tuple,
  outAttributes: Attribute[],
  leftSchema: RelationSchema,
  rightSchema: RelationSchema
): Tuple {
  const out: Tuple = {};
  const leftLen = leftSchema.attributes.length;
  for (let i = 0; i < outAttributes.length; i++) {
    const attr = outAttributes[i];
    if (i < leftLen) {
      const src = leftSchema.attributes[i];
      out[attr.name] = left[src.name] ?? null;
    } else {
      const src = rightSchema.attributes[i - leftLen];
      out[attr.name] = right[src.name] ?? null;
    }
  }
  return out;
}

export function padNullTuple(schema: RelationSchema): Tuple {
  const t: Tuple = {};
  for (const attr of schema.attributes) {
    t[attr.name] = null;
  }
  return t;
}
