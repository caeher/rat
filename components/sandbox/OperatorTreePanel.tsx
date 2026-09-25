import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { ASTNode, EvaluationStep } from '@/lib/engine/types';
import {
  accessibilityLabelForNode,
  flattenOperatorTreeRows,
  layoutOperatorTree,
  nodeStepStatus,
  type NodeStepStatus,
} from '@/lib/operator-tree';
import { Focus, ListTree, Maximize2, Minus, Plus, Workflow } from 'lucide-react';

export interface OperatorTreePanelProps {
  ast: ASTNode;
  steps?: EvaluationStep[];
  failedNodeId?: string;
  hasRunSnapshot: boolean;
  traceStale: boolean;
  selectedNodeId: string | undefined;
  onSelectNodeId: (nodeId: string) => void;
}

const STATUS_LABEL: Record<NodeStepStatus, string> = {
  active: 'Active step',
  completed: 'Evaluated',
  failed: 'Failed',
  unevaluated: 'Not reached',
  structural: 'Re-run to sync',
};

function statusBadge(status: NodeStepStatus): string {
  switch (status) {
    case 'active':
      return '▶ Active';
    case 'completed':
      return '✓ Done';
    case 'failed':
      return '✗ Fail';
    case 'unevaluated':
      return '… Pending';
    case 'structural':
      return '○ Structure';
    default:
      return '';
  }
}

function nodeBorderClass(status: NodeStepStatus, selected: boolean): string {
  const base = 'transition-[box-shadow,outline]';
  const ring = selected ? 'outline outline-2 outline-offset-2 outline-[var(--color-ink)]' : '';
  const statusOutline =
    status === 'failed'
      ? 'shadow-[inset_0_0_0_2px_var(--color-ember)]'
      : status === 'active'
        ? 'shadow-[inset_0_0_0_2px_var(--color-forest)]'
        : 'shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-outline)_70%,transparent)]';
  return `${base} ${ring} ${statusOutline}`;
}

function OperatorTreeGraph({
  ast,
  steps,
  failedNodeId,
  hasRunSnapshot,
  traceStale,
  selectedNodeId,
  onSelectNodeId,
}: OperatorTreePanelProps) {
  const layout = useMemo(() => layoutOperatorTree(ast), [ast]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 16, y: 16 });
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const fitToView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const pad = 24;
    const sx = (el.clientWidth - pad * 2) / layout.bounds.width;
    const sy = (el.clientHeight - pad * 2) / layout.bounds.height;
    const next = Math.min(1.4, Math.max(0.35, Math.min(sx, sy)));
    setScale(next);
    setPan({ x: pad, y: pad });
  }, [layout.bounds.height, layout.bounds.width]);

  useEffect(() => {
    fitToView();
  }, [fitToView, ast.id]);

  const statusOptions = useMemo(
    () => ({
      failedNodeId,
      steps,
      hasRunSnapshot,
      traceStale,
      activeNodeId: selectedNodeId,
    }),
    [failedNodeId, steps, hasRunSnapshot, traceStale, selectedNodeId]
  );

  const nodeById = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout.nodes]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const onWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    setScale((s) => Math.min(2.5, Math.max(0.25, s + delta)));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button type="button" variant="secondary" size="sm" aria-label="Zoom in" onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
        <Button type="button" variant="secondary" size="sm" aria-label="Zoom out" onClick={() => setScale((s) => Math.max(0.25, s - 0.15))}>
          <Minus className="w-3.5 h-3.5" />
        </Button>
        <Button type="button" variant="secondary" size="sm" className="gap-1" onClick={fitToView}>
          <Maximize2 className="w-3.5 h-3.5" />
          Fit
        </Button>
        <span className="text-[11px] text-[var(--color-driftwood)]">Drag background to pan · scroll to zoom</span>
      </div>
      <div
        ref={containerRef}
        className="relative h-[min(42vh,320px)] min-h-[200px] w-full rounded-[4px] border border-[var(--color-outline)]/50 bg-[var(--color-background)] overflow-hidden touch-none"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="application"
        aria-label="Operator tree diagram. Use the textual tree for full keyboard navigation."
      >
        <svg width="100%" height="100%" className="select-none">
          <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}>
            {layout.edges.map((edge) => {
              const from = nodeById.get(edge.fromId);
              const to = nodeById.get(edge.toId);
              if (!from || !to) return null;
              const x1 = from.x + from.width / 2;
              const y1 = from.y + from.height;
              const x2 = to.x + to.width / 2;
              const y2 = to.y;
              const midY = (y1 + y2) / 2;
              return (
                <path
                  key={`${edge.fromId}-${edge.toId}-${edge.inputIndex}`}
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke="var(--color-outline)"
                  strokeWidth={1.5}
                  markerEnd="none"
                />
              );
            })}
            {layout.nodes.map((node) => {
              const status = nodeStepStatus(node.ast, statusOptions);
              const selected = selectedNodeId === node.id;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x} ${node.y})`}
                  role="button"
                  tabIndex={-1}
                  aria-label={accessibilityLabelForNode(node.ast, status)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNodeId(node.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectNodeId(node.id);
                    }
                  }}
                  className="cursor-pointer"
                >
                  <foreignObject width={node.width} height={node.height}>
                    <div
                      className={`h-full w-full rounded-[4px] bg-[var(--color-card)] px-2 py-1.5 flex flex-col justify-center gap-0.5 ${nodeBorderClass(status, selected)}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[15px] font-semibold text-[var(--color-ember)] leading-none">
                          {node.label.symbol}
                        </span>
                        <span className="text-[9px] font-mono text-[var(--color-driftwood)] uppercase tracking-tight">
                          {statusBadge(status)}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-[var(--color-text)] truncate leading-tight">
                        {node.label.title}
                      </span>
                      {node.label.subtitle ? (
                        <span className="text-[9px] text-[var(--color-driftwood)] truncate leading-tight">
                          {node.label.subtitle}
                        </span>
                      ) : null}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

function OperatorTreeTextList({
  ast,
  steps,
  failedNodeId,
  hasRunSnapshot,
  traceStale,
  selectedNodeId,
  onSelectNodeId,
}: OperatorTreePanelProps) {
  const rows = useMemo(() => flattenOperatorTreeRows(ast), [ast]);
  const listId = useId();
  const [focusIndex, setFocusIndex] = useState(0);

  useEffect(() => {
    const idx = rows.findIndex((r) => r.nodeId === selectedNodeId);
    if (idx >= 0) setFocusIndex(idx);
  }, [rows, selectedNodeId]);

  const statusOptions = useMemo(
    () => ({
      failedNodeId,
      steps,
      hasRunSnapshot,
      traceStale,
      activeNodeId: selectedNodeId,
    }),
    [failedNodeId, steps, hasRunSnapshot, traceStale, selectedNodeId]
  );

  const onKeyDown = (event: React.KeyboardEvent, rowIndex: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = Math.min(rows.length - 1, rowIndex + 1);
      setFocusIndex(next);
      onSelectNodeId(rows[next].nodeId);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = Math.max(0, rowIndex - 1);
      setFocusIndex(prev);
      onSelectNodeId(rows[prev].nodeId);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setFocusIndex(0);
      onSelectNodeId(rows[0].nodeId);
    } else if (event.key === 'End') {
      event.preventDefault();
      const last = rows.length - 1;
      setFocusIndex(last);
      onSelectNodeId(rows[last].nodeId);
    }
  };

  return (
    <div className="space-y-1">
      <p className="text-[11px] text-[var(--color-driftwood)]">
        Textual tree: ↑ ↓ to move, Enter to select. Status is shown as text, not color alone.
      </p>
      <ul
        id={listId}
        role="tree"
        aria-label="Relational operator tree"
        className="max-h-56 overflow-auto rounded-[4px] border border-[var(--color-outline)]/50 bg-[var(--color-card)]/40 p-1"
      >
        {rows.map((row, rowIndex) => {
          const status = nodeStepStatus(row.ast, statusOptions);
          const selected = selectedNodeId === row.nodeId;
          return (
            <li key={row.nodeId} role="none">
              <button
                type="button"
                role="treeitem"
                aria-selected={selected}
                aria-level={row.depth + 1}
                aria-label={accessibilityLabelForNode(row.ast, status)}
                tabIndex={rowIndex === focusIndex ? 0 : -1}
                className={`w-full text-left rounded-[3px] px-2 py-1.5 text-[12px] font-mono flex items-start gap-2 hover:bg-[var(--color-elevated)] ${
                  selected ? 'bg-[var(--color-elevated)] ring-1 ring-[var(--color-ink)]' : ''
                }`}
                style={{ paddingLeft: `${8 + row.depth * 14}px` }}
                onClick={() => {
                  setFocusIndex(rowIndex);
                  onSelectNodeId(row.nodeId);
                }}
                onKeyDown={(e) => onKeyDown(e, rowIndex)}
                onFocus={() => setFocusIndex(rowIndex)}
              >
                <span className="shrink-0 text-[var(--color-ember)] w-6">{row.label.symbol}</span>
                <span className="flex-1 min-w-0">
                  <span className="text-[var(--color-text)]">{row.label.title}</span>
                  {row.label.subtitle ? (
                    <span className="text-[var(--color-driftwood)]"> · {row.label.subtitle}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-[10px] text-[var(--color-driftwood)]">
                  {statusBadge(status)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function OperatorTreeInspector({
  ast,
  steps,
  selectedNodeId,
  failedNodeId,
  hasRunSnapshot,
  traceStale,
}: Omit<OperatorTreePanelProps, 'onSelectNodeId'>) {
  const node = useMemo(() => {
    if (!selectedNodeId) return undefined;
    const rows = flattenOperatorTreeRows(ast);
    return rows.find((r) => r.nodeId === selectedNodeId)?.ast;
  }, [ast, selectedNodeId]);

  const step = steps?.find((s) => s.nodeId === selectedNodeId);
  const status = node
    ? nodeStepStatus(node, {
        activeNodeId: selectedNodeId,
        failedNodeId,
        steps,
        hasRunSnapshot,
        traceStale,
      })
    : undefined;

  if (!node) {
    return (
      <p className="text-[12px] text-[var(--color-driftwood)]">
        Select an operator or relation node to inspect its inferred schema and intermediate output.
      </p>
    );
  }

  const schema = node.inferredSchema ?? step?.outputSchema;

  return (
    <div className="space-y-2 rounded-[4px] border border-[var(--color-outline)]/50 p-3 bg-[var(--color-card)]/40">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="font-medium text-[var(--color-text)]">Inspector</span>
        {status ? (
          <span className="font-mono text-[11px] text-[var(--color-driftwood)]">
            {STATUS_LABEL[status]} ({statusBadge(status)})
          </span>
        ) : null}
      </div>
      {schema ? (
        <div>
          <div className="text-[11px] font-medium text-[var(--color-text)] mb-1">Inferred schema</div>
          <p className="text-[11px] font-mono text-[var(--color-driftwood)]">
            {schema.name}(
            {schema.attributes.map((a) => `${a.name}:${a.type}`).join(', ')})
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-[var(--color-driftwood)]">No schema inferred for this node.</p>
      )}
      {step ? (
        <div className="text-[11px] text-[var(--color-driftwood)]">
          Last run output:{' '}
          <span className="text-[var(--color-text)]">
            {step.outputTupleCount.toLocaleString()} row{step.outputTupleCount === 1 ? '' : 's'}
          </span>
          {traceStale ? ' (from stale trace)' : ''}
        </div>
      ) : hasRunSnapshot && !traceStale ? (
        <p className="text-[11px] text-[var(--color-driftwood)]">
          This node was not evaluated in the last run (evaluation may have stopped earlier).
        </p>
      ) : null}
    </div>
  );
}

export function OperatorTreePanel(props: OperatorTreePanelProps) {
  const [viewMode, setViewMode] = useState<'diagram' | 'text'>('diagram');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-text)]">
          <Workflow className="w-4 h-4 text-[var(--color-forest)]" />
          Operator tree
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant={viewMode === 'diagram' ? 'primary' : 'secondary'}
            size="sm"
            className="gap-1"
            onClick={() => setViewMode('diagram')}
            aria-pressed={viewMode === 'diagram'}
          >
            <Focus className="w-3.5 h-3.5" />
            Diagram
          </Button>
          <Button
            type="button"
            variant={viewMode === 'text' ? 'primary' : 'secondary'}
            size="sm"
            className="gap-1"
            onClick={() => setViewMode('text')}
            aria-pressed={viewMode === 'text'}
          >
            <ListTree className="w-3.5 h-3.5" />
            Text tree
          </Button>
        </div>
      </div>

      {viewMode === 'diagram' ? <OperatorTreeGraph {...props} /> : <OperatorTreeTextList {...props} />}
      <OperatorTreeInspector {...props} />
    </div>
  );
}
