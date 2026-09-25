import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Textarea } from '@/components/ui/Textarea';
import { DataTable } from '@/components/ui/Table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/Dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { ClientOnly } from '@/components/common/ClientOnly';
import { SchemaDesigner } from '@/components/sandbox/SchemaDesigner';
import { useSandboxState } from '@/lib/sandbox';
import { validateExpression } from '@/lib/engine/validator';
import type { RelationSchema, TupleValue } from '@/lib/engine/types';
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  Table as TableIcon,
  Code,
  Sparkles,
  Share2,
  AlertTriangle,
} from 'lucide-react';

const SAMPLE_OPERATORS = [
  { symbol: 'σ', name: 'Selection', example: 'σ condition (R)', desc: 'Filters tuples satisfying predicate' },
  { symbol: 'π', name: 'Projection', example: 'π attr1, attr2 (R)', desc: 'Selects specified attributes' },
  { symbol: 'ρ', name: 'Rename', example: 'ρ NewName (R)', desc: 'Renames relation or attributes' },
  { symbol: '⋈', name: 'Natural Join', example: 'R ⋈ S', desc: 'Joins on common attribute names' },
  { symbol: '⨯', name: 'Cartesian Product', example: 'R ⨯ S', desc: 'Combines all tuple pairs' },
  { symbol: '∪', name: 'Union', example: 'R ∪ S', desc: 'Tuples in R or S (set union)' },
  { symbol: '−', name: 'Difference', example: 'R − S', desc: 'Tuples in R not in S' },
  { symbol: '∩', name: 'Intersection', example: 'R ∩ S', desc: 'Tuples in both R and S' },
  { symbol: '÷', name: 'Division', example: 'R ÷ S', desc: 'Relational division' },
];

const DEFAULT_EXPRESSION = 'π name, dept_name ( Employees ⋈ Departments )';

export default function SandboxPage() {
  const { state, dispatch, snapshot, relationNames, attributeNames, activeSchemaSet, dataVersion } =
    useSandboxState();

  const [expression, setExpression] = useState(DEFAULT_EXPRESSION);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [evaluatedVersion, setEvaluatedVersion] = useState<number | null>(null);
  const [lastValidResult, setLastValidResult] = useState<{
    columns: { key: string; header: string; type: 'string' | 'number' | 'boolean' | 'date' }[];
    rows: Record<string, TupleValue>[];
    schema?: RelationSchema;
  } | null>(null);

  const engineSchemas = useMemo(() => {
    if (!snapshot) return {};
    return { ...snapshot.schemas };
  }, [snapshot]);

  const validation = useMemo(
    () => validateExpression(expression, engineSchemas),
    [expression, engineSchemas]
  );

  const resultsStale = evaluatedVersion !== null && evaluatedVersion !== dataVersion;

  useEffect(() => {
    if (resultsStale) {
      setLastValidResult(null);
    }
  }, [resultsStale, dataVersion]);

  const handleInsertSymbol = (symbol: string) => {
    setExpression((prev) => `${prev} ${symbol} `);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(expression);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const handleEvaluate = useCallback(() => {
    setIsEvaluating(true);
    const result = validateExpression(expression, engineSchemas);
    window.setTimeout(() => {
      setIsEvaluating(false);
      if (result.valid && result.schema) {
        const columns = result.schema.attributes.map((a) => ({
          key: a.name,
          header: a.name,
          type: a.type === 'null' ? 'string' : a.type,
        }));
        setLastValidResult({
          columns,
          rows: [],
          schema: result.schema,
        });
        setEvaluatedVersion(dataVersion);
      }
    }, 200);
  }, [dataVersion, engineSchemas, expression]);

  const resultColumns = lastValidResult?.columns ?? [];
  const resultData = lastValidResult?.rows ?? [];

  const syntaxLabel = validation.valid
    ? 'Expression valid'
    : validation.isIncomplete
      ? 'Incomplete expression'
      : 'Syntax / schema errors';

  return (
    <Layout
      title="RAT Sandbox — Relational Algebra Expression Editor"
      description="Interactive browser sandbox for writing and executing Relational Algebra queries."
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-outline)]/60">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[26px] font-normal tracking-[-0.012em] text-[var(--color-text)]">
                Relational Algebra Sandbox
              </h1>
              <Tag variant={validation.valid ? 'forest' : 'default'}>
                {validation.valid ? 'Valid' : 'Check query'}
              </Tag>
              <Tag variant="default">Snapshot v{dataVersion}</Tag>
            </div>
            <p className="text-[14px] text-[var(--color-driftwood)] mt-1">
              Design schemas below, then evaluate expressions against the active snapshot (
              {activeSchemaSet?.name ?? 'none'}).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setExpression(DEFAULT_EXPRESSION)}
              className="gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset query
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-1.5">
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Relational Algebra Expression</DialogTitle>
                  <DialogDescription>
                    Copy a deterministic URL link containing your expression state to share with peers or students.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="p-3 bg-[var(--color-card)] border border-[var(--color-outline)]/70 rounded-[4px] font-mono text-[12px] text-[var(--color-text)] break-all select-all">
                    https://caeher.github.io/rat/sandbox?q={encodeURIComponent(expression)}
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="secondary">Done</Button>
                  </DialogClose>
                  <Button variant="primary" onClick={handleCopy}>
                    {copied ? 'Copied Link' : 'Copy Share URL'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="amber" size="sm" onClick={handleCopy} className="gap-1.5">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Query'}
            </Button>
          </div>
        </div>

        <div className="p-3 bg-[var(--color-card)] border border-[var(--color-outline)]/60 rounded-[4px] flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-[12px] font-mono text-[var(--color-ash)] mr-2 select-none w-full sm:w-auto mb-1 sm:mb-0">
            Insert Operator:
          </span>
          {SAMPLE_OPERATORS.map((op) => (
            <Popover key={op.symbol}>
              <PopoverTrigger asChild>
                <button
                  onClick={() => handleInsertSymbol(op.symbol)}
                  aria-label={`Insert ${op.name} operator (${op.symbol})`}
                  className="min-w-[32px] h-[32px] px-2.5 py-1 bg-[var(--color-canvas)] hover:bg-[var(--color-elevated)] border border-[var(--color-outline)]/70 rounded-[3px] font-mono text-[14px] text-[var(--color-text)] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)] cursor-pointer flex items-center justify-center"
                >
                  {op.symbol}
                </button>
              </PopoverTrigger>
              <PopoverContent sideOffset={6} className="w-64">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[14px] font-bold text-[var(--color-ember)]">
                      {op.symbol}
                    </span>
                    <span className="font-medium text-[13px] text-[var(--color-text)]">{op.name}</span>
                  </div>
                  <p className="text-[12px] text-[var(--color-driftwood)]">{op.desc}</p>
                  <div className="font-mono text-[11px] bg-[var(--color-elevated)] px-1.5 py-0.5 rounded-[2px] text-[var(--color-ash)] mt-1 inline-block">
                    {op.example}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ))}
        </div>

        <SchemaDesigner
          state={state}
          dispatch={dispatch}
          activeSchemaSet={activeSchemaSet}
          dataVersion={dataVersion}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <Card className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[13px] font-medium text-[var(--color-text)] flex items-center gap-2">
                  <Code className="w-4 h-4 text-[var(--color-ash)]" />
                  Expression Editor
                </span>
                <span
                  className={`text-[11px] font-mono ${validation.valid ? 'text-[var(--color-forest)]' : 'text-[var(--color-ember)]'}`}
                >
                  {syntaxLabel}
                </span>
              </div>

              <ClientOnly
                fallback={<div className="h-32 bg-[var(--color-card)] animate-pulse rounded-[4px]" />}
              >
                <Textarea
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  rows={4}
                  mono
                  placeholder="Enter relational algebra expression, e.g. σ salary > 50000 ( Employees )"
                  aria-describedby="sandbox-attribute-hints"
                />
              </ClientOnly>

              {validation.diagnostics.length > 0 && (
                <ul className="text-[12px] text-[var(--color-ember)] space-y-1 font-mono" role="alert">
                  {validation.diagnostics
                    .filter((d) => d.severity === 'error')
                    .slice(0, 4)
                    .map((d, i) => (
                      <li key={i}>{d.message}</li>
                    ))}
                </ul>
              )}

              <p id="sandbox-attribute-hints" className="text-[11px] text-[var(--color-ash)] font-mono">
                Relations: {relationNames.join(', ') || 'none'} · Attributes:{' '}
                {attributeNames.slice(0, 12).join(', ')}
                {attributeNames.length > 12 ? '…' : ''}
              </p>

              <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                <div className="text-[12px] text-[var(--color-driftwood)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--color-amber)]" />
                  <span>Live validation against snapshot v{dataVersion}</span>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  loading={isEvaluating}
                  loadingText="Evaluating..."
                  onClick={handleEvaluate}
                  className="gap-2"
                  disabled={!validation.valid}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Evaluate Expression
                </Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <Card className="p-4 space-y-4">
              {resultsStale && (
                <div
                  className="flex items-start gap-2 p-2 rounded-[4px] bg-[var(--color-elevated)]/80 text-[12px] text-[var(--color-driftwood)]"
                  role="status"
                >
                  <AlertTriangle className="w-4 h-4 text-[var(--color-amber)] shrink-0 mt-0.5" />
                  Schema or data changed — previous results were cleared. Re-evaluate to refresh.
                </div>
              )}

              <Tabs defaultValue="results">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                  <TabsList>
                    <TabsTrigger value="results" className="gap-1.5">
                      <TableIcon className="w-3.5 h-3.5" />
                      Inferred schema
                    </TabsTrigger>
                    <TabsTrigger value="sql" className="gap-1.5">
                      <Code className="w-3.5 h-3.5" />
                      SQL (preview)
                    </TabsTrigger>
                  </TabsList>
                  {lastValidResult?.schema && (
                    <Tag variant="forest">{lastValidResult.schema.attributes.length} attrs</Tag>
                  )}
                </div>

                <TabsContent value="results" className="space-y-3">
                  {lastValidResult?.schema ? (
                    <DataTable
                      columns={resultColumns}
                      data={resultData}
                      loading={isEvaluating}
                      emptyMessage="Evaluation produced a schema; tuple execution ships in a later milestone."
                      caption={`Output schema for: ${lastValidResult.schema.name}`}
                    />
                  ) : (
                    <div className="text-[13px] text-[var(--color-driftwood)] py-6 text-center">
                      Run a valid expression to see the inferred result schema.
                    </div>
                  )}
                  {lastValidResult?.schema && (
                    <div className="flex flex-wrap gap-2">
                      {lastValidResult.schema.attributes.map((a) => (
                        <span
                          key={a.name}
                          className="text-[11px] font-mono px-2 py-0.5 rounded-[3px] bg-[var(--color-canvas)] border border-[var(--color-outline)]/60"
                        >
                          {a.name}: {a.type}
                          {a.nullable ? '?' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="sql" className="space-y-3">
                  <div className="text-[12px] font-mono text-[var(--color-ash)]">
                    SQL transpilation preview (static placeholder).
                  </div>
                  <pre className="p-3.5 bg-[var(--color-canvas)] border border-[var(--color-outline)]/60 rounded-[4px] font-mono text-[13px] text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">
                    {validation.valid
                      ? `-- Valid against ${activeSchemaSet?.name}\n-- Relations: ${relationNames.join(', ')}`
                      : '-- Fix expression errors to generate SQL.'}
                  </pre>
                </TabsContent>
              </Tabs>
            </Card>

            {snapshot && (
              <Card className="p-3 space-y-2">
                <div className="text-[12px] font-medium text-[var(--color-text)]">Active snapshot</div>
                <p className="text-[11px] text-[var(--color-driftwood)]">
                  Immutable copy v{snapshot.version} · {Object.keys(snapshot.relations).length} relations
                </p>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {Object.values(snapshot.relations).map((rel) => (
                    <div
                      key={rel.schema.name}
                      className="text-[11px] font-mono text-[var(--color-driftwood)] border border-[var(--color-outline)]/40 rounded-[3px] px-2 py-1"
                    >
                      {rel.schema.name} ({rel.tuples.length} rows)
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
