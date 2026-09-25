import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EvaluationTracePanel } from '@/components/sandbox/EvaluationTracePanel';
import { OperatorTreePanel } from '@/components/sandbox/OperatorTreePanel';
import type { ASTNode, Diagnostic, EvaluationStep } from '@/lib/engine/types';
import {
  buildStepIndexByNodeId,
  findAstNodeById,
  nodeIdForStepIndex,
  stepIndexForNodeId,
} from '@/lib/operator-tree';

export interface EvaluationStepsWorkspaceProps {
  expression: string;
  ast?: ASTNode;
  expressionValid: boolean;
  steps?: EvaluationStep[];
  failedNodeId?: string;
  errorDiagnostic?: Diagnostic;
  isStale: boolean;
  staleReason?: string;
  hasRunSnapshot: boolean;
  onActiveRangeChange?: (range: import('@/lib/engine/types').SourceRange | null) => void;
}

export function EvaluationStepsWorkspace({
  expression,
  ast,
  expressionValid,
  steps,
  failedNodeId,
  errorDiagnostic,
  isStale,
  staleReason,
  hasRunSnapshot,
  onActiveRangeChange,
}: EvaluationStepsWorkspaceProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();

  const stepByNodeId = useMemo(() => buildStepIndexByNodeId(steps), [steps]);

  useEffect(() => {
    if (!ast) {
      setSelectedNodeId(undefined);
      return;
    }
    setSelectedNodeId((current) => {
      if (!current || !findAstNodeById(ast, current)) return ast.id;
      return current;
    });
  }, [ast]);

  useEffect(() => {
    if (!steps?.length) {
      setStepIndex(0);
      setSelectedNodeId(undefined);
      return;
    }
    const last = steps.length - 1;
    setStepIndex(last);
    setSelectedNodeId(steps[last].nodeId);
  }, [steps]);

  const handleStepIndexChange = useCallback(
    (index: number) => {
      setStepIndex(index);
      const nodeId = nodeIdForStepIndex(steps, index);
      if (nodeId) setSelectedNodeId(nodeId);
    },
    [steps]
  );

  const handleSelectNodeId = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      const idx = stepIndexForNodeId(nodeId, stepByNodeId);
      if (idx !== undefined) {
        setStepIndex(idx);
      }
    },
    [stepByNodeId]
  );

  const activeNode = useMemo(() => {
    if (!ast || !selectedNodeId) return undefined;
    return findAstNodeById(ast, selectedNodeId);
  }, [ast, selectedNodeId]);

  useEffect(() => {
    if (!expressionValid || !activeNode) {
      onActiveRangeChange?.(null);
      return;
    }
    onActiveRangeChange?.(activeNode.range);
  }, [activeNode, expressionValid, onActiveRangeChange]);

  return (
    <div className="space-y-4">
      {expressionValid && ast ? (
        <OperatorTreePanel
          ast={ast}
          steps={steps}
          failedNodeId={failedNodeId}
          hasRunSnapshot={hasRunSnapshot}
          traceStale={isStale}
          selectedNodeId={selectedNodeId}
          onSelectNodeId={handleSelectNodeId}
        />
      ) : (
        <div
          className="rounded-[4px] border border-dashed border-[var(--color-outline)]/60 p-4 text-[12px] text-[var(--color-driftwood)]"
          role="status"
        >
          Fix syntax errors or finish typing to show the operator tree. The diagram always reflects
          the current validated expression — it is hidden while the parse is invalid so it cannot
          mislead you.
        </div>
      )}

      <EvaluationTracePanel
        expression={expression}
        steps={steps}
        failedNodeId={failedNodeId}
        errorDiagnostic={errorDiagnostic}
        isStale={isStale}
        staleReason={staleReason}
        hasRunSnapshot={hasRunSnapshot}
        stepIndex={stepIndex}
        onStepIndexChange={handleStepIndexChange}
      />
    </div>
  );
}
