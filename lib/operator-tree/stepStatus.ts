import type { ASTNode, EvaluationStep } from '@/lib/engine/types';
import { buildStepIndexByNodeId } from './sync';

export type NodeStepStatus =
  | 'active'
  | 'completed'
  | 'failed'
  | 'unevaluated'
  | 'structural';

export function nodeStepStatus(
  node: ASTNode,
  options: {
    activeNodeId?: string;
    failedNodeId?: string;
    steps?: EvaluationStep[];
    hasRunSnapshot: boolean;
    traceStale: boolean;
  }
): NodeStepStatus {
  if (options.activeNodeId && node.id === options.activeNodeId) {
    return 'active';
  }
  if (!options.hasRunSnapshot || options.traceStale) {
    return 'structural';
  }
  const stepByNode = buildStepIndexByNodeId(options.steps);
  if (!stepByNode.has(node.id)) {
    return 'unevaluated';
  }
  if (options.failedNodeId && node.id === options.failedNodeId) {
    return 'failed';
  }
  return 'completed';
}
