import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { DataTable } from '@/components/ui/Table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
  RelationalAlgebraEditor,
  type RelationalAlgebraEditorHandle,
} from '@/components/sandbox/RelationalAlgebraEditor';
import { OperatorPalette, type OperatorPaletteHandle } from '@/components/sandbox/OperatorPalette';
import {
  EditorShortcutsDialog,
  useEditorShortcutsDialog,
} from '@/components/sandbox/EditorShortcutsDialog';
import { ExpressionDiagnosticList } from '@/components/sandbox/ExpressionDiagnosticList';
import { useDebouncedValidation } from '@/lib/editor/useDebouncedValidation';
import { STARTER_EXAMPLES } from '@/lib/editor/examples';
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
  Eraser,
  BookOpen,
} from 'lucide-react';

const DEFAULT_EXPRESSION = 'π name, dept_name ( Employees ⋈ Departments )';

export default function SandboxPage() {
  const { state, dispatch, snapshot, relationNames, attributeNames, activeSchemaSet, dataVersion } =
    useSandboxState();

  const [expression, setExpression] = useState(DEFAULT_EXPRESSION);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<RelationalAlgebraEditorHandle>(null);
  const paletteRef = useRef<OperatorPaletteHandle>(null);
  const { open: shortcutsOpen, setOpen: setShortcutsOpen, openShortcuts } = useEditorShortcutsDialog();
  const [executedSnapshot, setExecutedSnapshot] = useState<{
    expression: string;
    dataVersion: number;
    result: {
      columns: { key: string; header: string; type: 'string' | 'number' | 'boolean' | 'date' }[];
      rows: Record<string, TupleValue>[];
      schema?: RelationSchema;
    };
  } | null>(null);

  const engineSchemas = useMemo(() => {
    if (!snapshot) return {};
    return { ...snapshot.schemas };
  }, [snapshot]);

  const validation = useDebouncedValidation(expression, engineSchemas, dataVersion);

  const isEmptyExpression = expression.trim().length === 0;

  const editorDiffersFromExecuted =
    executedSnapshot !== null && executedSnapshot.expression !== expression;

  const schemaDiffersFromExecuted =
    executedSnapshot !== null && executedSnapshot.dataVersion !== dataVersion;

  const resultsStale = editorDiffersFromExecuted || schemaDiffersFromExecuted;

  const displayedResult = resultsStale ? null : executedSnapshot?.result ?? null;

  const handleInsertTemplate = useCallback((template: string) => {
    editorRef.current?.insertTemplate(template);
  }, []);

  const handleFocusPalette = useCallback(() => {
    paletteRef.current?.focus();
  }, []);

  const handleClear = () => {
    setExpression('');
    editorRef.current?.focus();
  };

  const handleLoadExample = (exampleExpression: string) => {
    setExpression(exampleExpression);
    editorRef.current?.focus();
  };

  const handleJumpToDiagnostic = useCallback(
    (diagnostic: { range: { start: { offset: number } } }) => {
      editorRef.current?.scrollToOffset(diagnostic.range.start.offset);
    },
    []
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(expression);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const handleRun = useCallback(() => {
    if (isEmptyExpression || !validation.valid) return;

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
        setExecutedSnapshot({
          expression,
          dataVersion,
          result: {
            columns,
            rows: [],
            schema: result.schema,
          },
        });
      }
    }, 200);
  }, [dataVersion, engineSchemas, expression, isEmptyExpression, validation.valid]);

  const resultColumns = displayedResult?.columns ?? [];
  const resultData = displayedResult?.rows ?? [];

  const syntaxLabel = isEmptyExpression
    ? 'Empty — enter an expression to validate'
    : validation.isValidating
      ? 'Checking expression…'
      : validation.valid
        ? 'Expression valid'
        : validation.isIncomplete
          ? 'Incomplete expression'
          : 'Syntax / schema errors';

  const runDisabled = isEmptyExpression || !validation.valid || validation.isValidating;

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
              onClick={() => handleLoadExample(DEFAULT_EXPRESSION)}
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

        <OperatorPalette ref={paletteRef} onInsertTemplate={handleInsertTemplate} />

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
                <div className="flex items-center gap-2 flex-wrap">
                  <EditorShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
                  <span
                    className={`text-[11px] font-mono ${validation.valid ? 'text-[var(--color-forest)]' : 'text-[var(--color-ember)]'}`}
                  >
                    {syntaxLabel}
                  </span>
                </div>
              </div>

              <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
              >
                {syntaxLabel}
              </div>

              <ClientOnly
                fallback={<div className="h-32 bg-[var(--color-card)] animate-pulse rounded-[4px]" />}
              >
                <RelationalAlgebraEditor
                  ref={editorRef}
                  value={expression}
                  onChange={setExpression}
                  validation={validation}
                  schemas={engineSchemas}
                  onFocusOperatorPalette={handleFocusPalette}
                  onOpenShortcutsHelp={openShortcuts}
                  id="sandbox-expression-editor"
                  aria-label="Relational algebra expression editor"
                  aria-describedby="sandbox-diagnostics sandbox-attribute-hints sandbox-shortcuts-summary"
                  placeholder="Enter relational algebra expression, e.g. σ salary > 50000 ( Employees )"
                />
              </ClientOnly>

              <ExpressionDiagnosticList
                id="sandbox-diagnostics"
                diagnostics={validation.diagnostics}
                onSelectDiagnostic={handleJumpToDiagnostic}
                emptyMessage={
                  isEmptyExpression
                    ? 'Expression is empty. Type a query or choose a starter example.'
                    : validation.valid
                      ? 'No issues found for the current snapshot.'
                      : validation.isIncomplete
                        ? 'Keep typing — incomplete expressions are expected while editing.'
                        : undefined
                }
              />

              <p id="sandbox-attribute-hints" className="text-[11px] text-[var(--color-ash)] font-mono">
                Relations: {relationNames.join(', ') || 'none'} · Attributes:{' '}
                {attributeNames.slice(0, 12).join(', ')}
                {attributeNames.length > 12 ? '…' : ''}
              </p>
              <p id="sandbox-shortcuts-summary" className="sr-only">
                Press Control Space for autocomplete, Control Shift O to focus the operator palette, or
                Control slash to open keyboard shortcuts help.
              </p>

              <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
                <div className="text-[12px] text-[var(--color-driftwood)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--color-amber)]" />
                  <span>
                    {validation.isValidating
                      ? 'Validating…'
                      : `Live validation against snapshot v${dataVersion}`}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleClear}
                    className="gap-1.5"
                    aria-label="Clear expression editor"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    Clear
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="md" className="gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        Examples
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72">
                      <DropdownMenuLabel>Starter expressions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {STARTER_EXAMPLES.map((ex) => (
                        <DropdownMenuItem
                          key={ex.id}
                          onSelect={() => handleLoadExample(ex.expression)}
                          className="flex flex-col items-start gap-0.5 py-2"
                        >
                          <span className="font-medium text-[13px]">{ex.title}</span>
                          <span className="text-[11px] text-[var(--color-driftwood)] leading-snug">
                            {ex.description}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="primary"
                    size="md"
                    loading={isEvaluating}
                    loadingText="Running..."
                    onClick={handleRun}
                    className="gap-2"
                    disabled={runDisabled}
                    aria-disabled={runDisabled}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Run
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <Card className="p-4 space-y-4">
              {resultsStale && executedSnapshot && (
                <div
                  className="flex items-start gap-2 p-2 rounded-[4px] bg-[var(--color-elevated)]/80 text-[12px] text-[var(--color-driftwood)]"
                  role="status"
                >
                  <AlertTriangle className="w-4 h-4 text-[var(--color-amber)] shrink-0 mt-0.5" />
                  {editorDiffersFromExecuted
                    ? 'Editor text changed since the last run — results are hidden until you run again.'
                    : 'Schema or data changed — run again to refresh results against the new snapshot.'}
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
                  {displayedResult?.schema && (
                    <Tag variant="forest">{displayedResult.schema.attributes.length} attrs</Tag>
                  )}
                </div>

                <TabsContent value="results" className="space-y-3">
                  {displayedResult?.schema ? (
                    <DataTable
                      columns={resultColumns}
                      data={resultData}
                      loading={isEvaluating}
                      emptyMessage="Evaluation produced a schema; tuple execution ships in a later milestone."
                      caption={`Output schema for: ${displayedResult.schema.name}`}
                    />
                  ) : (
                    <div className="text-[13px] text-[var(--color-driftwood)] py-6 text-center">
                      {isEmptyExpression
                        ? 'Enter an expression, then run to see the inferred result schema.'
                        : 'Run a valid expression to see the inferred result schema.'}
                    </div>
                  )}
                  {displayedResult?.schema && (
                    <div className="flex flex-wrap gap-2">
                      {displayedResult.schema.attributes.map((a) => (
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
