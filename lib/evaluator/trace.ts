import { OPERATOR_CONTRACTS } from '@/lib/engine/contract';
import type {
  ASTNode,
  ASTNodeType,
  EvaluationStep,
  EvaluationStepHighlights,
  EvaluationStepInputSummary,
  RelationData,
  SourceRange,
} from '@/lib/engine/types';
import { EVALUATION_LIMITS } from './limits';

export const DEFAULT_TRACE_PREVIEW_ROWS = EVALUATION_LIMITS.maxTracePreviewRows;

export interface PendingTraceCapture {
  inputs: RelationData[];
  highlights?: EvaluationStepHighlights;
  tuplesBeforeDeduplication?: number;
  explanationDetail?: string;
}

export function operatorSymbolFor(type: ASTNodeType): string {
  if (type === 'relation') {
    return 'R';
  }
  const contract = OPERATOR_CONTRACTS[type as keyof typeof OPERATOR_CONTRACTS];
  return contract?.symbol ?? type;
}

export function boundRelationForTrace(
  relation: RelationData,
  previewLimit: number
): { relation: RelationData; tupleCount: number; previewLimited: boolean } {
  const tupleCount = relation.tuples.length;
  if (tupleCount <= previewLimit) {
    return {
      relation: {
        schema: relation.schema,
        tuples: relation.tuples.map((t) => ({ ...t })),
      },
      tupleCount,
      previewLimited: false,
    };
  }
  return {
    relation: {
      schema: relation.schema,
      tuples: relation.tuples.slice(0, previewLimit).map((t) => ({ ...t })),
    },
    tupleCount,
    previewLimited: true,
  };
}

function summarizeInput(
  relation: RelationData,
  previewLimit: number
): EvaluationStepInputSummary {
  const bounded = boundRelationForTrace(relation, previewLimit);
  return {
    schema: bounded.relation.schema,
    tupleCount: bounded.tupleCount,
    previewTuples: bounded.relation.tuples,
    previewLimited: bounded.previewLimited,
  };
}

export function buildStepExplanation(
  node: ASTNode,
  inputs: RelationData[],
  outputCount: number,
  _detail?: string
): string {
  const symbol = operatorSymbolFor(node.type);
  switch (node.type) {
    case 'relation': {
      const rel = node as { relationName: string };
      return `Read base relation ${rel.relationName} (${outputCount} tuple${outputCount === 1 ? '' : 's'}) from the run snapshot.`;
    }
    case 'selection':
      return `${symbol} keeps tuples that satisfy the predicate (${outputCount} of ${inputs[0]?.tuples.length ?? 0} input tuple${inputs[0]?.tuples.length === 1 ? '' : 's'}).`;
    case 'projection': {
      const attrs = (node as { attributes: string[] }).attributes;
      return `${symbol} projects ${attrs.join(', ')} and removes duplicate tuples (${outputCount} distinct).`;
    }
    case 'rename_relation':
    case 'rename': {
      const name = (node as { newRelationName: string }).newRelationName;
      return `${symbol} renames the intermediate result to ${name} without changing tuple values.`;
    }
    case 'rename_attributes':
      return `${symbol} renames attributes on each tuple; row count stays ${outputCount}.`;
    case 'cartesian_product':
      return `${symbol} pairs every left tuple with every right tuple (${outputCount} combined).`;
    case 'natural_join':
      return `${symbol} joins on common attribute names (${outputCount} matching pair${outputCount === 1 ? '' : 's'}).`;
    case 'theta_join':
      return `${symbol} joins tuples that satisfy the join predicate (${outputCount} result${outputCount === 1 ? '' : 's'}).`;
    case 'left_join':
      return `⟕ preserves unmatched left tuples with NULL padding (${outputCount} rows).`;
    case 'right_join':
      return `⟖ preserves unmatched right tuples with NULL padding (${outputCount} rows).`;
    case 'full_join':
      return `⟗ preserves unmatched tuples from both sides (${outputCount} rows).`;
    case 'union':
      return `∪ unions compatible relations and eliminates duplicates (${outputCount} distinct).`;
    case 'difference':
      return `− removes right-hand tuples from the left (${outputCount} remaining).`;
    case 'intersection':
      return `∩ keeps tuples present in both inputs (${outputCount} shared).`;
    case 'division':
      return `÷ relational division (${outputCount} quotient tuple${outputCount === 1 ? '' : 's'}).`;
    default:
      return `${symbol} produced ${outputCount} tuple${outputCount === 1 ? '' : 's'}.`;
  }
}

export function appendTraceStep(
  steps: EvaluationStep[],
  node: ASTNode,
  inputs: RelationData[],
  output: RelationData,
  previewLimit: number,
  startedMs: number,
  pending?: PendingTraceCapture
): void {
  const boundedOutput = boundRelationForTrace(output, previewLimit);
  const inputSummaries = inputs.map((input) => summarizeInput(input, previewLimit));
  const explanation = buildStepExplanation(
    node,
    inputs,
    boundedOutput.tupleCount,
    pending?.explanationDetail
  );

  steps.push({
    stepIndex: steps.length,
    nodeId: node.id,
    range: node.range,
    operator: node.type,
    operatorSymbol: operatorSymbolFor(node.type),
    description: `${operatorSymbolFor(node.type)} → ${boundedOutput.tupleCount.toLocaleString()} tuple(s)`,
    explanation,
    inputSchemas: inputs.map((i) => i.schema),
    inputSummaries,
    outputSchema: output.schema,
    outputTupleCount: boundedOutput.tupleCount,
    outputRelation: boundedOutput.relation,
    outputPreviewLimited: boundedOutput.previewLimited,
    tuplesBeforeDeduplication: pending?.tuplesBeforeDeduplication,
    executionTimeMs: Date.now() - startedMs,
    highlights: pending?.highlights,
  });
}

export function sliceExpressionAtRange(expression: string, range: SourceRange): string {
  const start = Math.max(0, range.start.offset);
  const end = Math.min(expression.length, range.end.offset);
  if (start >= end) return expression.trim();
  return expression.slice(start, end).trim();
}

/** Returns step indices in postorder (children before parents). */
export function postorderStepNodeIds(steps: EvaluationStep[]): string[] {
  return steps.map((s) => s.nodeId);
}

export function stepAtIndex(steps: EvaluationStep[], index: number): EvaluationStep | undefined {
  if (index < 0 || index >= steps.length) return undefined;
  return steps[index];
}

export function emptyStepExplanation(step: EvaluationStep): string {
  if (step.outputTupleCount === 0) {
    return `${step.explanation} The intermediate result is empty — later operators still run, but may produce an empty answer.`;
  }
  return step.explanation;
}
