import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { QueryResultTable } from '@/components/sandbox/QueryResultTable';
import type { Diagnostic, EvaluationStep, RelationData } from '@/lib/engine/types';
import { emptyStepExplanation, sliceExpressionAtRange } from '@/lib/evaluator/trace';
import {
  activeTraceStep,
  createTraceNavigation,
  traceGoFinish,
  traceGoNext,
  traceGoPrevious,
  traceGoStart,
  type TraceNavigationState,
} from '@/lib/evaluator/traceNavigation';
import {
  AlertTriangle,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Footprints,
} from 'lucide-react';

export interface EvaluationTracePanelProps {
  expression: string;
  steps?: EvaluationStep[];
  failedNodeId?: string;
  errorDiagnostic?: Diagnostic;
  isStale: boolean;
  staleReason?: string;
  hasRunSnapshot: boolean;
  /** Controlled step index (kept in sync with operator-tree selection). */
  stepIndex?: number;
  onStepIndexChange?: (index: number) => void;
}

function inputRelationFromSummary(
  step: EvaluationStep,
  inputIndex: number
): RelationData | null {
  const summary = step.inputSummaries?.[inputIndex];
  if (!summary) return null;
  return {
    schema: summary.schema,
    tuples: summary.previewTuples,
  };
}

export function EvaluationTracePanel({
  expression,
  steps,
  failedNodeId,
  errorDiagnostic,
  isStale,
  staleReason,
  hasRunSnapshot,
  stepIndex: controlledStepIndex,
  onStepIndexChange,
}: EvaluationTracePanelProps) {
  const totalSteps = steps?.length ?? 0;
  const [nav, setNav] = useState<TraceNavigationState>(() => createTraceNavigation(totalSteps));

  useEffect(() => {
    const initial = totalSteps > 0 ? totalSteps - 1 : 0;
    setNav(createTraceNavigation(totalSteps, initial));
    onStepIndexChange?.(initial);
  }, [steps, totalSteps]);

  useEffect(() => {
    if (controlledStepIndex === undefined) return;
    setNav(createTraceNavigation(totalSteps, controlledStepIndex));
  }, [controlledStepIndex, totalSteps]);

  const effectiveIndex = controlledStepIndex ?? nav.stepIndex;

  const setStepIndex = useCallback(
    (nextIndex: number) => {
      const clamped = createTraceNavigation(totalSteps, nextIndex);
      setNav(clamped);
      onStepIndexChange?.(clamped.stepIndex);
    },
    [onStepIndexChange, totalSteps]
  );

  const step = useMemo(
    () => activeTraceStep(steps, effectiveIndex),
    [steps, effectiveIndex]
  );

  const subexpression = step ? sliceExpressionAtRange(expression, step.range) : '';

  const stepFailed = Boolean(step && failedNodeId && step.nodeId === failedNodeId);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!steps?.length) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setStepIndex(traceGoPrevious(nav).stepIndex);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setStepIndex(traceGoNext(nav).stepIndex);
      } else if (event.key === 'Home') {
        event.preventDefault();
        setStepIndex(traceGoStart(totalSteps).stepIndex);
      } else if (event.key === 'End') {
        event.preventDefault();
        setStepIndex(traceGoFinish(totalSteps).stepIndex);
      }
    },
    [nav, setStepIndex, steps, totalSteps]
  );

  if (!hasRunSnapshot) {
    return (
      <div className="rounded-[4px] border border-dashed border-[var(--color-outline)]/60 p-4 text-[12px] text-[var(--color-driftwood)]">
        Run a query to capture a postorder evaluation trace against the frozen snapshot.
      </div>
    );
  }

  if (!steps?.length) {
    return (
      <div className="rounded-[4px] border border-[var(--color-outline)]/50 p-4 text-[12px] text-[var(--color-driftwood)]">
        No trace steps were recorded for the last run. Re-run after a successful evaluation.
      </div>
    );
  }

  const positionLabel = `Step ${effectiveIndex + 1} of ${totalSteps}`;

  return (
    <div
      className="space-y-3"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Step-by-step evaluation trace"
    >
      {isStale ? (
        <div
          className="flex items-start gap-2 rounded-[4px] border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 px-3 py-2 text-[12px] text-[var(--color-text)]"
          role="status"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--color-amber)] mt-0.5" />
          <div>
            <span className="font-medium">Trace is stale.</span>{' '}
            {staleReason ?? 'Expression or snapshot changed since this run.'} Re-run to refresh the
            trace; navigation below shows the last captured run only.
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-text)]">
          <Footprints className="w-4 h-4 text-[var(--color-forest)]" />
          Step-by-step evaluation
        </div>
        <Tag variant={stepFailed ? 'amber' : 'forest'}>{positionLabel}</Tag>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label="Go to first step"
          disabled={effectiveIndex === 0 || totalSteps === 0}
          onClick={() => setStepIndex(traceGoStart(totalSteps).stepIndex)}
          className="gap-1"
        >
          <ChevronFirst className="w-3.5 h-3.5" />
          Start
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label="Previous step"
          disabled={effectiveIndex === 0 || totalSteps === 0}
          onClick={() => setStepIndex(traceGoPrevious(createTraceNavigation(totalSteps, effectiveIndex)).stepIndex)}
          className="gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label="Next step"
          disabled={effectiveIndex >= totalSteps - 1 || totalSteps === 0}
          onClick={() => setStepIndex(traceGoNext(createTraceNavigation(totalSteps, effectiveIndex)).stepIndex)}
          className="gap-1"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label="Go to final step"
          disabled={effectiveIndex >= totalSteps - 1 || totalSteps === 0}
          onClick={() => setStepIndex(traceGoFinish(totalSteps).stepIndex)}
          className="gap-1"
        >
          Finish
          <ChevronLast className="w-3.5 h-3.5" />
        </Button>
        <span className="text-[11px] text-[var(--color-driftwood)] ml-1">
          ← → Home End
        </span>
      </div>

      {step ? (
        <div className="space-y-2 rounded-[4px] border border-[var(--color-outline)]/50 p-3 bg-[var(--color-card)]/40">
          <div className="flex flex-wrap items-center gap-2">
            <Tag variant="default">{step.operatorSymbol}</Tag>
            <span className="text-[12px] font-mono text-[var(--color-text)]">{step.description}</span>
          </div>
          <p className="text-[12px] text-[var(--color-driftwood)] leading-relaxed">
            {emptyStepExplanation(step)}
          </p>
          {subexpression ? (
            <div>
              <div className="text-[11px] font-medium text-[var(--color-text)] mb-1">
                Active subexpression
              </div>
              <pre
                className="text-[11px] font-mono whitespace-pre-wrap break-all rounded-[3px] border border-[var(--color-outline)]/40 bg-[var(--color-background)] px-2 py-1.5"
              >
                {subexpression}
              </pre>
            </div>
          ) : null}
          {step.outputPreviewLimited ? (
            <p className="text-[11px] text-[var(--color-amber)]">
              Output preview shows the first {step.outputRelation.tuples.length} of{' '}
              {step.outputTupleCount.toLocaleString()} tuples. Counts and the final result remain
              exact.
            </p>
          ) : null}
          {stepFailed && errorDiagnostic ? (
            <div
              className="rounded-[3px] border border-[var(--color-ember)]/40 bg-[var(--color-ember)]/10 px-2 py-1.5 text-[12px] text-[var(--color-text)]"
              role="alert"
            >
              {errorDiagnostic.message}
            </div>
          ) : null}
        </div>
      ) : null}

      {step?.inputSummaries?.map((summary, index) => {
        const inputRel = inputRelationFromSummary(step, index);
        if (!inputRel) return null;
        const dropped =
          index === 0 ? step.highlights?.droppedInputRowIndices : undefined;
        return (
          <div key={`input-${index}`} className="space-y-1">
            <div className="text-[12px] font-medium text-[var(--color-text)]">
              Input {index + 1}: {summary.schema.name}{' '}
              <span className="text-[var(--color-driftwood)] font-normal">
                ({summary.tupleCount.toLocaleString()} row
                {summary.tupleCount === 1 ? '' : 's'}
                {summary.previewLimited ? ', preview limited' : ''})
              </span>
            </div>
            <QueryResultTable
              schema={inputRel.schema}
              rows={inputRel.tuples}
              compact
              emphasizedRowIndices={dropped}
              emphasizedRowVariant="dropped"
              className="max-h-48 overflow-auto"
            />
          </div>
        );
      })}

      {step ? (
        <div className="space-y-1">
          <div className="text-[12px] font-medium text-[var(--color-text)]">
            Output: {step.outputSchema.name}{' '}
            <span className="text-[var(--color-driftwood)] font-normal">
              ({step.outputTupleCount.toLocaleString()} row
              {step.outputTupleCount === 1 ? '' : 's'})
            </span>
          </div>
          <QueryResultTable
            schema={step.outputRelation.schema}
            rows={step.outputRelation.tuples}
            compact
            emphasizedRowIndices={step.highlights?.outputRowIndices}
            emphasizedColumns={step.highlights?.emphasizedColumns}
            emphasizedRowVariant="kept"
            className="max-h-56 overflow-auto"
          />
        </div>
      ) : null}
    </div>
  );
}
