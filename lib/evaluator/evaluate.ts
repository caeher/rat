/**
 * Pure TypeScript relational algebra evaluator (independent from SQL execution).
 */
import {
  checkDivisionCompatibility,
  checkUnionCompatibility,
  deduplicateTuples,
  inferNaturalJoinSchema,
  inferOuterJoinSchema,
  inferProjectionSchema,
  inferRenameSchema,
  tupleToKey,
} from '@/lib/engine/contract';
import type {
  ASTNode,
  Diagnostic,
  EvaluationOptions,
  EvaluationStep,
  QueryExecutionResult,
  RelationData,
  RelationNode,
  RelationSchema,
  RenameRelationNode,
  SourceRange,
  Tuple,
  TupleValue,
} from '@/lib/engine/types';
import { CONTRACT_VERSION } from '@/lib/engine/types';
import {
  assertIntermediateSize,
  assertOutputSize,
  checkAbort,
  createEvaluationContext,
  markCancelled,
  recordRowOperations,
  type EvaluationContextState,
} from './context';
import {
  evaluatePredicate,
  joinKeysMatch,
  mergeTupleSchemas,
  mergeTupleForJoinPredicate,
  mergeTupleSchemasConcat,
  padNullTuple,
} from './predicate';
import { EvaluationRuntimeError } from './runtimeError';
import { appendTraceStep } from './trace';

export { markCancelled, createEvaluationContext };

let activeEvaluationContext: EvaluationContextState | null = null;

/** Called from the worker when the UI requests cancellation. */
export function cancelActiveEvaluation(): void {
  if (activeEvaluationContext) {
    markCancelled(activeEvaluationContext);
  }
}

export interface EvaluateInput {
  ast: ASTNode;
  relations: Record<string, RelationData>;
  options?: EvaluationOptions;
}

function emptyRange(): SourceRange {
  return {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 1, offset: 0 },
  };
}

function runtimeDiagnostic(err: EvaluationRuntimeError): Diagnostic {
  return {
    code: err.code,
    severity: 'error',
    message: err.message,
    range: err.range,
  };
}

function canonicalizeTuple(tuple: Tuple, schema: RelationSchema): Tuple {
  const out: Tuple = {};
  for (const attr of schema.attributes) {
    const v = tuple[attr.name];
    out[attr.name] = v !== undefined ? v : null;
  }
  return out;
}

function finalizeRelation(
  data: RelationData,
  ctx: EvaluationContextState,
  nodeId: string,
  range: SourceRange,
  isRoot: boolean
): RelationData {
  const before = data.tuples.length;
  const deduped = deduplicateTuples(data.tuples, data.schema);
  if (isRoot) {
    assertOutputSize(ctx, deduped.length, nodeId, range);
  } else {
    assertIntermediateSize(ctx, deduped.length, nodeId, range, data.schema.name);
  }
  if (deduped.length < before) {
    // informational only at root via steps if needed
  }
  return {
    schema: data.schema,
    tuples: deduped.map((t) => canonicalizeTuple(t, data.schema)),
  };
}

function evaluateNode(
  node: ASTNode,
  relations: Record<string, RelationData>,
  ctx: EvaluationContextState,
  steps: EvaluationStep[],
  isRoot: boolean
): RelationData {
  checkAbort(ctx, node.id, node.range);
  const started = Date.now();

  let result: RelationData;

  switch (node.type) {
    case 'relation':
      result = evaluateRelation(node as RelationNode, relations, ctx);
      break;
    case 'selection':
      result = evaluateSelection(node, relations, ctx, steps);
      break;
    case 'projection':
      result = evaluateProjection(node, relations, ctx, steps);
      break;
    case 'rename_relation':
    case 'rename':
      result = evaluateRenameRelation(node as RenameRelationNode, relations, ctx, steps);
      break;
    case 'rename_attributes':
      result = evaluateRenameAttributes(node, relations, ctx, steps);
      break;
    case 'cartesian_product':
      result = evaluateCartesian(node, relations, ctx, steps);
      break;
    case 'natural_join':
      result = evaluateNaturalJoin(node, relations, ctx, steps);
      break;
    case 'theta_join':
      result = evaluateThetaJoin(node, relations, ctx, steps);
      break;
    case 'left_join':
    case 'right_join':
    case 'full_join':
      result = evaluateOuterJoin(node, relations, ctx, steps);
      break;
    case 'union':
      result = evaluateUnion(node, relations, ctx, steps);
      break;
    case 'difference':
      result = evaluateDifference(node, relations, ctx, steps);
      break;
    case 'intersection':
      result = evaluateIntersection(node, relations, ctx, steps);
      break;
    case 'division':
      result = evaluateDivision(node, relations, ctx, steps);
      break;
    default: {
      const unknown = node as ASTNode;
      throw new EvaluationRuntimeError(`Unsupported operator '${unknown.type}'.`, {
        code: 'E_RUNTIME_ERROR',
        nodeId: unknown.id,
        range: unknown.range,
      });
    }
  }

  const tuplesBeforeDeduplication = result.tuples.length;
  result = finalizeRelation(result, ctx, node.id, node.range, isRoot);

  if (ctx.captureTrace) {
    const pending = ctx.pendingTrace;
    const pendingCapture = pending
      ? {
          ...pending,
          tuplesBeforeDeduplication:
            tuplesBeforeDeduplication !== result.tuples.length
              ? tuplesBeforeDeduplication
              : pending.tuplesBeforeDeduplication,
        }
      : undefined;
    appendTraceStep(
      steps,
      node,
      pending?.inputs ?? [],
      result,
      ctx.tracePreviewRows,
      started,
      pendingCapture
    );
    ctx.pendingTrace = undefined;
  }

  return result;
}

function evaluateRelation(
  node: RelationNode,
  relations: Record<string, RelationData>,
  ctx: EvaluationContextState
): RelationData {
  checkAbort(ctx, node.id, node.range);
  const base = relations[node.relationName];
  if (!base) {
    throw new EvaluationRuntimeError(
      `Relation '${node.relationName}' is not present in the active snapshot.`,
      { code: 'E_RUNTIME_ERROR', nodeId: node.id, range: node.range }
    );
  }
  const data = {
    schema: structuredClone(base.schema),
    tuples: base.tuples.map((t) => ({ ...t })),
  };
  ctx.pendingTrace = { inputs: [] };
  return data;
}

function evaluateSelection(
  node: ASTNode & { child: ASTNode; predicate?: unknown },
  relations: Record<string, RelationData>,
  ctx: EvaluationContextState,
  steps: EvaluationStep[]
): RelationData {
  const child = evaluateNode(node.child, relations, ctx, steps, false);
  const schema = node.inferredSchema ?? child.schema;
  if (!node.predicate || typeof node.predicate === 'string') {
    throw new EvaluationRuntimeError('Selection requires a parsed predicate.', {
      code: 'E_RUNTIME_ERROR',
      nodeId: node.id,
      range: node.range,
    });
  }

  const kept: Tuple[] = [];
  const droppedInputRowIndices: number[] = [];
  for (let i = 0; i < child.tuples.length; i++) {
    const tuple = child.tuples[i];
    recordRowOperations(ctx, 1, node.id, node.range, 'selection');
    const truth = evaluatePredicate(
      node.predicate as import('@/lib/engine/types').PredicateNode,
      tuple,
      child.schema
    );
    if (truth === true) {
      kept.push({ ...tuple });
    } else {
      droppedInputRowIndices.push(i);
    }
  }

  ctx.pendingTrace = {
    inputs: [child],
    highlights: {
      droppedInputRowIndices,
      outputRowIndices: kept.map((_, index) => index),
    },
  };

  return { schema, tuples: kept };
}

function evaluateProjection(
  node: ASTNode & { child: ASTNode; attributes: string[] },
  relations: Record<string, RelationData>,
  ctx: EvaluationContextState,
  steps: EvaluationStep[]
): RelationData {
  const child = evaluateNode(node.child, relations, ctx, steps, false);
  const { schema, missingAttributes } = inferProjectionSchema(
    child.schema,
    node.attributes
  );
  if (missingAttributes.length > 0) {
    throw new EvaluationRuntimeError(
      `Projection references missing attributes: ${missingAttributes.join(', ')}.`,
      { code: 'E_RUNTIME_ERROR', nodeId: node.id, range: node.range }
    );
  }

  const projected = child.tuples.map((tuple) => {
    recordRowOperations(ctx, 1, node.id, node.range, 'projection');
    const out: Tuple = {};
    for (const attr of schema.attributes) {
      out[attr.name] = tuple[attr.name] ?? null;
    }
    return out;
  });

  ctx.pendingTrace = {
    inputs: [child],
    highlights: {
      emphasizedColumns: schema.attributes.map((a) => a.name),
    },
  };

  return { schema, tuples: projected };
}

function evaluateRenameRelation(
  node: RenameRelationNode & { positionalAttributes?: string[] },
  relations: Record<string, RelationData>,
  ctx: EvaluationContextState,
  steps: EvaluationStep[]
): RelationData {
  const child = evaluateNode(node.child, relations, ctx, steps, false);
  const schema = node.inferredSchema ?? inferRenameSchema(child.schema, node.newRelationName);

  const tuples = child.tuples.map((tuple) => {
    const out: Tuple = {};
    for (let i = 0; i < schema.attributes.length; i++) {
      const outAttr = schema.attributes[i];
      const inAttr = child.schema.attributes[i];
      const key = inAttr?.name ?? outAttr.name;
      out[outAttr.name] = tuple[key] ?? null;
    }
    return out;
  });

  ctx.pendingTrace = { inputs: [child] };

  return { schema, tuples };
}

function evaluateRenameAttributes(
  node: ASTNode & { child: ASTNode; attributeMap: Record<string, string>; newRelationName?: string },
  relations: Record<string, RelationData>,
  ctx: EvaluationContextState,
  steps: EvaluationStep[]
): RelationData {
  const child = evaluateNode(node.child, relations, ctx, steps, false);
  const schema =
    node.inferredSchema ??
    inferRenameSchema(child.schema, node.newRelationName, node.attributeMap);

  const tuples = child.tuples.map((tuple) => {
    const out: Tuple = {};
    for (const attr of schema.attributes) {
      const sourceName = attr.originalName ?? attr.name;
      const fromKey =
        Object.entries(node.attributeMap).find(([, to]) => to === attr.name)?.[0] ?? sourceName;
      out[attr.name] = tuple[fromKey] ?? tuple[attr.name] ?? null;
    }
    return out;
  });

  ctx.pendingTrace = {
    inputs: [child],
    highlights: {
      emphasizedColumns: Object.values(node.attributeMap),
    },
  };

  return { schema, tuples };
}

function evaluateCartesian(
  node: ASTNode & { left: ASTNode; right: ASTNode },
  relations: Record<string, RelationData>,
  ctx: EvaluationContextState,
  steps: EvaluationStep[]
): RelationData {
  const left = evaluateNode(node.left, relations, ctx, steps, false);
  const right = evaluateNode(node.right, relations, ctx, steps, false);
  const schema = node.inferredSchema ?? {
    name: `${left.schema.name}_⨯_${right.schema.name}`,
    attributes: [...left.schema.attributes, ...right.schema.attributes],
  };

  const estimated = left.tuples.length * right.tuples.length;
  assertIntermediateSize(ctx, estimated, node.id, node.range, 'Cartesian product');

  const tuples: Tuple[] = [];
  for (const lt of left.tuples) {
    for (const rt of right.tuples) {
      recordRowOperations(ctx, 1, node.id, node.range, 'Cartesian product');
      tuples.push(
        mergeTupleSchemasConcat(lt, rt, schema.attributes, left.schema, right.schema)
      );
    }
  }

  ctx.pendingTrace = { inputs: [left, right] };

  return { schema, tuples };
}

function evaluateNaturalJoin(
  node: ASTNode & { left: ASTNode; right: ASTNode; commonAttributes?: string[] },
  relations: Record<string, RelationData>,
  ctx: EvaluationContextState,
  steps: EvaluationStep[]
): RelationData {
  const left = evaluateNode(node.left, relations, ctx, steps, false);
  const right = evaluateNode(node.right, relations, ctx, steps, false);
  const { schema, commonAttributes } = inferNaturalJoinSchema(left.schema, right.schema);
  const commons = node.commonAttributes ?? commonAttributes;

  if (commons.length === 0) {
    return evaluateCartesian(
      { ...node, type: 'cartesian_product', left: node.left, right: node.right },
      relations,
      ctx,
      steps
    );
  }

  const tuples: Tuple[] = [];
  for (const lt of left.tuples) {
    for (const rt of right.tuples) {
      recordRowOperations(ctx, 1, node.id, node.range, 'natural join');
      if (joinKeysMatch(lt, rt, commons, left.schema, right.schema)) {
        tuples.push(
          mergeTupleSchemas(
            lt,
            rt,
            schema.attributes,
            left.schema,
            right.schema,
            commons
          )
        );
      }
    }
  }

  ctx.pendingTrace = {
    inputs: [left, right],
    highlights: {
      emphasizedColumns: schema.attributes.map((a) => a.name),
    },
  };

  return { schema, tuples };
}

function evaluateThetaJoin(
  node: ASTNode & {
    left: ASTNode;
    right: ASTNode;
    predicate?: unknown;
  },
  relations: Record<string, RelationData>,
  ctx: EvaluationContextState,
  steps: EvaluationStep[]
): RelationData {
  const left = evaluateNode(node.left, relations, ctx, steps, false);
  const right = evaluateNode(node.right, relations, ctx, steps, false);
  const schema = node.inferredSchema ?? {
    name: `${left.schema.name}_⋈_${right.schema.name}`,
    attributes: [...left.schema.attributes, ...right.schema.attributes],
  };

  if (
    node.predicate === undefined ||
    node.predicate === null ||
    (typeof node.predicate === 'string' && node.predicate.length === 0)
  ) {
    return evaluateCartesian(
      { ...node, type: 'cartesian_product', left: node.left, right: node.right },
      relations,
      ctx,
      steps
    );
  }

  const tuples: Tuple[] = [];
  for (const lt of left.tuples) {
    for (const rt of right.tuples) {
      recordRowOperations(ctx, 1, node.id, node.range, 'theta join');
      const merged = mergeTupleForJoinPredicate(lt, rt, left.schema, right.schema);
      const truth = evaluatePredicate(
        node.predicate as import('@/lib/engine/types').PredicateNode,
        merged,
        schema,
        left.schema,
        right.schema
      );
      if (truth === true) {
        tuples.push(
          mergeTupleSchemasConcat(lt, rt, schema.attributes, left.schema, right.schema)
        );
      }
    }
  }

  ctx.pendingTrace = {
    inputs: [left, right],
    highlights: { emphasizedColumns: schema.attributes.map((a) => a.name) },
  };

  return { schema, tuples };
}

function evaluateOuterJoin(
  node: ASTNode & {
    type: 'left_join' | 'right_join' | 'full_join';
    left: ASTNode;
    right: ASTNode;
    predicate?: unknown;
  },
  relations: Record<string, RelationData>,
  ctx: EvaluationContextState,
  steps: EvaluationStep[]
): RelationData {
  const left = evaluateNode(node.left, relations, ctx, steps, false);
  const right = evaluateNode(node.right, relations, ctx, steps, false);
  const joinSide =
    node.type === 'left_join' ? 'left' : node.type === 'right_join' ? 'right' : 'full';
  const schema =
    node.inferredSchema ?? inferOuterJoinSchema(left.schema, right.schema, joinSide);

  const hasPredicate = node.predicate && typeof node.predicate !== 'string';
  const { commonAttributes } = inferNaturalJoinSchema(left.schema, right.schema);

  const matchedLeft = new Set<number>();
  const matchedRight = new Set<number>();
  const tuples: Tuple[] = [];

  const tryMatch = (lt: Tuple, rt: Tuple): boolean => {
    if (hasPredicate) {
      const merged = mergeTupleSchemasConcat(lt, rt, schema.attributes, left.schema, right.schema);
      return (
        evaluatePredicate(
          node.predicate as import('@/lib/engine/types').PredicateNode,
          merged,
          schema,
          left.schema,
          right.schema
        ) === true
      );
    }
    if (commonAttributes.length === 0) {
      return false;
    }
    return joinKeysMatch(lt, rt, commonAttributes, left.schema, right.schema);
  };

  for (let li = 0; li < left.tuples.length; li++) {
    for (let ri = 0; ri < right.tuples.length; ri++) {
      recordRowOperations(ctx, 1, node.id, node.range, 'outer join');
      if (tryMatch(left.tuples[li], right.tuples[ri])) {
        matchedLeft.add(li);
        matchedRight.add(ri);
        tuples.push(
          mergeTupleSchemasConcat(
            left.tuples[li],
            right.tuples[ri],
            schema.attributes,
            left.schema,
            right.schema
          )
        );
      }
    }
  }

  const nullRight = padNullTuple(right.schema);
  const nullLeft = padNullTuple(left.schema);

  if (joinSide === 'left' || joinSide === 'full') {
    for (let li = 0; li < left.tuples.length; li++) {
      if (!matchedLeft.has(li)) {
        tuples.push(
          mergeTupleSchemasConcat(
            left.tuples[li],
            nullRight,
            schema.attributes,
            left.schema,
            right.schema
          )
        );
      }
    }
  }

  if (joinSide === 'right' || joinSide === 'full') {
    for (let ri = 0; ri < right.tuples.length; ri++) {
      if (!matchedRight.has(ri)) {
        tuples.push(
          mergeTupleSchemasConcat(
            nullLeft,
            right.tuples[ri],
            schema.attributes,
            left.schema,
            right.schema
          )
        );
      }
    }
  }

  ctx.pendingTrace = {
    inputs: [left, right],
    highlights: { emphasizedColumns: schema.attributes.map((a) => a.name) },
  };

  return { schema, tuples };
}

function evaluateUnion(
  node: ASTNode & { left: ASTNode; right: ASTNode },
  relations: Record<string, RelationData>,
  ctx: EvaluationContextState,
  steps: EvaluationStep[]
): RelationData {
  const left = evaluateNode(node.left, relations, ctx, steps, false);
  const right = evaluateNode(node.right, relations, ctx, steps, false);
  const compat = checkUnionCompatibility(left.schema, right.schema);
  if (!compat.compatible) {
    throw new EvaluationRuntimeError(compat.error ?? 'Union incompatible.', {
      code: 'E_RUNTIME_ERROR',
      nodeId: node.id,
      range: node.range,
    });
  }

  const outSchema = node.inferredSchema ?? {
    name: `${left.schema.name}_∪_${right.schema.name}`,
    attributes: [...left.schema.attributes],
  };

  const tuples: Tuple[] = [];
  for (const t of left.tuples) {
    recordRowOperations(ctx, 1, node.id, node.range, 'union');
    tuples.push(canonicalizeTuple(t, left.schema));
  }
  for (const t of right.tuples) {
    recordRowOperations(ctx, 1, node.id, node.range, 'union');
    const mapped: Tuple = {};
    for (let i = 0; i < outSchema.attributes.length; i++) {
      const name = outSchema.attributes[i].name;
      const src = right.schema.attributes[i];
      mapped[name] = t[src.name] ?? null;
    }
    tuples.push(mapped);
  }

  ctx.pendingTrace = { inputs: [left, right] };

  return { schema: outSchema, tuples };
}

function evaluateDifference(
  node: ASTNode & { left: ASTNode; right: ASTNode },
  relations: Record<string, RelationData>,
  ctx: EvaluationContextState,
  steps: EvaluationStep[]
): RelationData {
  const left = evaluateNode(node.left, relations, ctx, steps, false);
  const right = evaluateNode(node.right, relations, ctx, steps, false);
  const compat = checkUnionCompatibility(left.schema, right.schema);
  if (!compat.compatible) {
    throw new EvaluationRuntimeError(compat.error ?? 'Difference incompatible.', {
      code: 'E_RUNTIME_ERROR',
      nodeId: node.id,
      range: node.range,
    });
  }

  const outSchema = node.inferredSchema ?? {
    name: `${left.schema.name}_−_${right.schema.name}`,
    attributes: [...left.schema.attributes],
  };

  const rightKeys = new Set(
    right.tuples.map((t) => {
      const mapped: Tuple = {};
      for (let i = 0; i < outSchema.attributes.length; i++) {
        mapped[outSchema.attributes[i].name] = t[right.schema.attributes[i].name] ?? null;
      }
      return tupleToKey(mapped, outSchema);
    })
  );

  const tuples: Tuple[] = [];
  for (const t of left.tuples) {
    recordRowOperations(ctx, 1, node.id, node.range, 'difference');
    const key = tupleToKey(canonicalizeTuple(t, left.schema), outSchema);
    if (!rightKeys.has(key)) {
      tuples.push(canonicalizeTuple(t, left.schema));
    }
  }

  ctx.pendingTrace = { inputs: [left, right] };

  return { schema: outSchema, tuples };
}

function evaluateIntersection(
  node: ASTNode & { left: ASTNode; right: ASTNode },
  relations: Record<string, RelationData>,
  ctx: EvaluationContextState,
  steps: EvaluationStep[]
): RelationData {
  const left = evaluateNode(node.left, relations, ctx, steps, false);
  const right = evaluateNode(node.right, relations, ctx, steps, false);
  const compat = checkUnionCompatibility(left.schema, right.schema);
  if (!compat.compatible) {
    throw new EvaluationRuntimeError(compat.error ?? 'Intersection incompatible.', {
      code: 'E_RUNTIME_ERROR',
      nodeId: node.id,
      range: node.range,
    });
  }

  const outSchema = node.inferredSchema ?? {
    name: `${left.schema.name}_∩_${right.schema.name}`,
    attributes: [...left.schema.attributes],
  };

  const rightKeys = new Set(
    right.tuples.map((t) => {
      const mapped: Tuple = {};
      for (let i = 0; i < outSchema.attributes.length; i++) {
        mapped[outSchema.attributes[i].name] = t[right.schema.attributes[i].name] ?? null;
      }
      return tupleToKey(mapped, outSchema);
    })
  );

  const tuples: Tuple[] = [];
  for (const t of left.tuples) {
    recordRowOperations(ctx, 1, node.id, node.range, 'intersection');
    const canon = canonicalizeTuple(t, left.schema);
    if (rightKeys.has(tupleToKey(canon, outSchema))) {
      tuples.push(canon);
    }
  }

  ctx.pendingTrace = { inputs: [left, right] };

  return { schema: outSchema, tuples };
}

function evaluateDivision(
  node: ASTNode & { left: ASTNode; right: ASTNode },
  relations: Record<string, RelationData>,
  ctx: EvaluationContextState,
  steps: EvaluationStep[]
): RelationData {
  const dividend = evaluateNode(node.left, relations, ctx, steps, false);
  const divisor = evaluateNode(node.right, relations, ctx, steps, false);
  const compat = checkDivisionCompatibility(dividend.schema, divisor.schema);
  if (!compat.compatible) {
    throw new EvaluationRuntimeError(compat.error ?? 'Division failed.', {
      code: 'E_RUNTIME_ERROR',
      nodeId: node.id,
      range: node.range,
    });
  }

  const quotientSchema = node.inferredSchema ?? {
    name: `${dividend.schema.name}_÷_${divisor.schema.name}`,
    attributes: compat.quotientAttributes,
  };

  if (divisor.tuples.length === 0) {
    const projected = projectToSchema(dividend, quotientSchema);
    ctx.pendingTrace = {
      inputs: [dividend, divisor],
      explanationDetail: 'Empty divisor: division returns π_quotient(dividend).',
    };
    return { schema: quotientSchema, tuples: projected };
  }

  if (dividend.tuples.length === 0) {
    ctx.pendingTrace = { inputs: [dividend, divisor] };
    return { schema: quotientSchema, tuples: [] };
  }

  const divisorAttrNames = divisor.schema.attributes.map((a) => a.name);
  const quotientNames = quotientSchema.attributes.map((a) => a.name);

  const candidateTuples = projectToSchema(dividend, quotientSchema);
  const result: Tuple[] = [];

  for (const candidate of candidateTuples) {
    recordRowOperations(ctx, divisor.tuples.length, node.id, node.range, 'division');
    let satisfiesAll = true;
    for (const s of divisor.tuples) {
      const exists = dividend.tuples.some((r) => {
        for (const q of quotientNames) {
          if (!areCellEqual(r[q] ?? null, candidate[q] ?? null)) {
            return false;
          }
        }
        for (const b of divisorAttrNames) {
          if (!areCellEqual(r[b] ?? null, s[b] ?? null)) {
            return false;
          }
        }
        return true;
      });
      if (!exists) {
        satisfiesAll = false;
        break;
      }
    }
    if (satisfiesAll) {
      result.push(candidate);
    }
  }

  ctx.pendingTrace = { inputs: [dividend, divisor] };

  return { schema: quotientSchema, tuples: result };
}

function areCellEqual(a: TupleValue | undefined, b: TupleValue | undefined): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a === b;
}

function projectToSchema(source: RelationData, targetSchema: RelationSchema): Tuple[] {
  const seen = new Set<string>();
  const out: Tuple[] = [];
  for (const t of source.tuples) {
    const row: Tuple = {};
    for (const attr of targetSchema.attributes) {
      row[attr.name] = t[attr.name] ?? null;
    }
    const key = tupleToKey(row, targetSchema);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(row);
    }
  }
  return out;
}

export function evaluateRaAst(input: EvaluateInput): QueryExecutionResult {
  const ctx = createEvaluationContext(input.options);
  activeEvaluationContext = ctx;
  const steps: EvaluationStep[] = [];
  const started = Date.now();

  try {
    const relation = evaluateNode(input.ast, input.relations, ctx, steps, true);
    return {
      version: CONTRACT_VERSION,
      success: true,
      rootNodeId: input.ast.id,
      ast: input.ast,
      schema: relation.schema,
      relation,
      steps: ctx.captureTrace ? steps : undefined,
      diagnostics: [],
      executionTimeMs: Date.now() - started,
    };
  } catch (err) {
    if (err instanceof EvaluationRuntimeError) {
      return {
        version: CONTRACT_VERSION,
        success: false,
        rootNodeId: input.ast.id,
        nodeId: err.nodeId,
        ast: input.ast,
        steps: ctx.captureTrace && steps.length > 0 ? steps : undefined,
        diagnostics: [runtimeDiagnostic(err)],
        error: err.message,
        executionTimeMs: Date.now() - started,
      };
    }
    const message = err instanceof Error ? err.message : 'Unknown evaluation error';
    return {
      version: CONTRACT_VERSION,
      success: false,
      rootNodeId: input.ast.id,
      ast: input.ast,
      steps: ctx.captureTrace && steps.length > 0 ? steps : undefined,
      diagnostics: [
        {
          code: 'E_RUNTIME_ERROR',
          severity: 'error',
          message,
          range: input.ast.range ?? emptyRange(),
        },
      ],
      error: message,
      executionTimeMs: Date.now() - started,
    };
  } finally {
    activeEvaluationContext = null;
  }
}

export { evaluateNode };
