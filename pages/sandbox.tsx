import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { QueryResultPanel } from '@/components/sandbox/QueryResultPanel';
import { EvaluationStepsWorkspace } from '@/components/sandbox/EvaluationStepsWorkspace';
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
import { SandboxReferencePanel } from '@/components/sandbox/SandboxReferencePanel';
import {
  EditorShortcutsDialog,
  useEditorShortcutsDialog,
} from '@/components/sandbox/EditorShortcutsDialog';
import { ExpressionDiagnosticList } from '@/components/sandbox/ExpressionDiagnosticList';
import { SqlTranslationPanel } from '@/components/sandbox/SqlTranslationPanel';
import { AlgebraSqlComparisonPanel } from '@/components/sandbox/AlgebraSqlComparisonPanel';
import { useDebouncedValidation } from '@/lib/editor/useDebouncedValidation';
import { STARTER_EXAMPLES } from '@/lib/reference/examples';
import {
  enrichDiagnosticsWithReference,
  getExecutableExample,
  applyReferenceExampleToSandbox,
  sandboxNeedsExampleConfirm,
} from '@/lib/reference';
import { applyExerciseToSandbox, getExercise } from '@/lib/exercises';
import type { ReferenceExecutableExample } from '@/lib/reference/types';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { ClientOnly } from '@/components/common/ClientOnly';
import { SchemaDesigner } from '@/components/sandbox/SchemaDesigner';
import { useSandboxState } from '@/lib/sandbox';
import { useRaEvaluator } from '@/lib/evaluator/useRaEvaluator';
import { useSqlExecutor } from '@/lib/sql/runtime/useSqlExecutor';
import { compareAlgebraAndSql } from '@/lib/sql/runtime/compare';
import { transpileRaAst } from '@/lib/sql';
import type { DualPathComparison, SqlExecutionOutcome } from '@/lib/sql/runtime';
import { resolveAssetPath } from '@/lib/paths';
import type {
  Diagnostic,
  EvaluationStep,
  RelationSchema,
  SourceRange,
  TupleValue,
} from '@/lib/engine/types';
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  Table as TableIcon,
  Code,
  Sparkles,
  Share2,
  Eraser,
  BookOpen,
  Footprints,
} from 'lucide-react';

const DEFAULT_EXPRESSION = 'π name, dept_name ( Employees ⋈ Departments )';

export default function SandboxPage() {
  const router = useRouter();
  const { state, dispatch, snapshot, relationNames, attributeNames, activeSchemaSet, dataVersion } =
    useSandboxState();

  const [expression, setExpression] = useState(DEFAULT_EXPRESSION);
  const [pendingExample, setPendingExample] = useState<ReferenceExecutableExample | null>(null);
  const [pendingExerciseId, setPendingExerciseId] = useState<string | null>(null);
  const appliedExampleQueryRef = useRef<string | null>(null);
  const appliedExerciseQueryRef = useRef<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<RelationalAlgebraEditorHandle>(null);
  const paletteRef = useRef<OperatorPaletteHandle>(null);
  const { open: shortcutsOpen, setOpen: setShortcutsOpen, openShortcuts } = useEditorShortcutsDialog();
  const [activeSubexpressionRange, setActiveSubexpressionRange] = useState<SourceRange | null>(null);

  const [executedSnapshot, setExecutedSnapshot] = useState<{
    expression: string;
    dataVersion: number;
    requestId: number;
    result: {
      columns: { key: string; header: string; type: 'string' | 'number' | 'boolean' | 'date' }[];
      rows: Record<string, TupleValue>[];
      schema?: RelationSchema;
      rowCount?: number;
      executionTimeMs?: number;
    };
    runtimeDiagnostics: Diagnostic[];
    sqlOutcome?: SqlExecutionOutcome;
    translationError?: string;
    comparison?: DualPathComparison;
    algebraError?: string;
    evaluationSteps?: EvaluationStep[];
    failedStepNodeId?: string;
  } | null>(null);

  const { runEvaluation, cancel, latestRequestIdRef } = useRaEvaluator();
  const {
    runSqlVerification,
    cancel: cancelSql,
    latestRequestIdRef: latestSqlRequestIdRef,
  } = useSqlExecutor();

  const wasmLocateUrl = useMemo(
    () => resolveAssetPath('/sql-wasm/sql-wasm.wasm'),
    []
  );

  const engineSchemas = useMemo(() => {
    if (!snapshot) return {};
    return { ...snapshot.schemas };
  }, [snapshot]);

  const validation = useDebouncedValidation(expression, engineSchemas, dataVersion);

  const validationDiagnostics = useMemo(
    () => enrichDiagnosticsWithReference(validation.diagnostics),
    [validation.diagnostics]
  );

  const isEmptyExpression = expression.trim().length === 0;

  const editorDiffersFromExecuted =
    executedSnapshot !== null && executedSnapshot.expression !== expression;

  const schemaDiffersFromExecuted =
    executedSnapshot !== null && executedSnapshot.dataVersion !== dataVersion;

  const resultsStale = editorDiffersFromExecuted || schemaDiffersFromExecuted;

  const lastRunResult = executedSnapshot?.result ?? null;
  const staleReason = editorDiffersFromExecuted
    ? 'Editor text changed since the last run.'
    : schemaDiffersFromExecuted
      ? 'Schema or relation data changed since the last run.'
      : undefined;

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

  const commitLoadExample = useCallback(
    (example: ReferenceExecutableExample) => {
      applyReferenceExampleToSandbox(dispatch, example);
      setExpression(example.expression);
      setExecutedSnapshot(null);
      editorRef.current?.focus();
    },
    [dispatch]
  );

  const commitLoadExercise = useCallback(
    (exerciseId: string) => {
      const exercise = getExercise(exerciseId);
      if (!exercise) return;
      applyExerciseToSandbox(dispatch, exercise);
      setExpression('');
      setExecutedSnapshot(null);
      editorRef.current?.focus();
    },
    [dispatch]
  );

  const handleRequestLoadExample = useCallback(
    (exampleId: string) => {
      const example = getExecutableExample(exampleId);
      if (!example) return;
      if (sandboxNeedsExampleConfirm(expression, dataVersion)) {
        setPendingExample(example);
        return;
      }
      commitLoadExample(example);
    },
    [commitLoadExample, dataVersion, expression]
  );

  const handleLoadExampleExpression = (exampleExpression: string) => {
    const match = STARTER_EXAMPLES.find((ex) => ex.expression === exampleExpression);
    if (match) {
      handleRequestLoadExample(match.id);
      return;
    }
    setExpression(exampleExpression);
    editorRef.current?.focus();
  };

  const handleJumpToDiagnostic = useCallback(
    (diagnostic: { range: { start: { offset: number } } }) => {
      editorRef.current?.scrollToOffset(diagnostic.range.start.offset);
    },
    []
  );

  useEffect(() => {
    const raw = router.query.example;
    const exampleId = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
    if (!exampleId || appliedExampleQueryRef.current === exampleId) return;
    if (!getExecutableExample(exampleId)) return;
    appliedExampleQueryRef.current = exampleId;
    handleRequestLoadExample(exampleId);
  }, [router.query.example, handleRequestLoadExample]);

  const handleRequestLoadExercise = useCallback(
    (exerciseId: string) => {
      if (!getExercise(exerciseId)) return;
      if (sandboxNeedsExampleConfirm(expression, dataVersion)) {
        setPendingExerciseId(exerciseId);
        return;
      }
      commitLoadExercise(exerciseId);
    },
    [commitLoadExercise, dataVersion, expression]
  );

  useEffect(() => {
    const raw = router.query.exercise;
    const exerciseId = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
    if (!exerciseId || appliedExerciseQueryRef.current === exerciseId) return;
    if (!getExercise(exerciseId)) return;
    appliedExerciseQueryRef.current = exerciseId;
    handleRequestLoadExercise(exerciseId);
  }, [router.query.exercise, handleRequestLoadExercise]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(expression);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const handleRun = useCallback(async () => {
    if (isEmptyExpression || !validation.valid || !validation.ast || !snapshot) return;

    setIsEvaluating(true);
    setExecutedSnapshot(null);

    const transpiled = transpileRaAst(validation.ast, snapshot.schemas);
    const translationReady =
      transpiled.success &&
      Boolean(transpiled.sql) &&
      !transpiled.diagnostics.some((d) => d.severity === 'error');
    const translationError = translationReady
      ? undefined
      : transpiled.diagnostics.find((d) => d.severity === 'error')?.message ??
        'SQL could not be generated for this expression.';

    const algebraOutcome = await runEvaluation({
      ast: validation.ast,
      relations: snapshot.relations,
      options: { captureTrace: true },
    });

    if (algebraOutcome.requestId !== latestRequestIdRef.current) {
      setIsEvaluating(false);
      return;
    }

    const algebraSuccess = algebraOutcome.result.success && Boolean(algebraOutcome.result.schema);
    const algebraSchema = algebraOutcome.result.schema;
    const algebraRelation = algebraOutcome.result.relation;
    const algebraError = algebraSuccess
      ? undefined
      : algebraOutcome.result.error ??
        algebraOutcome.result.diagnostics.find((d) => d.severity === 'error')?.message ??
        'Algebra evaluation failed.';

    let sqlOutcome: SqlExecutionOutcome = {
      success: false,
      failureKind: 'execution',
      message: translationError ?? 'SQL was not executed.',
      diagnostics: transpiled.diagnostics,
    };

    if (translationReady && transpiled.sql) {
      const normalizeSchema =
        algebraSchema ??
        ({
          name: 'sql_result',
          attributes: [],
        } satisfies RelationSchema);

      const sqlResult = await runSqlVerification({
        snapshot,
        sql: transpiled.sql,
        parameters: transpiled.parameters,
        expectedSchema: normalizeSchema,
        wasmLocateUrl,
      });

      if (sqlResult.requestId !== latestSqlRequestIdRef.current) {
        setIsEvaluating(false);
        return;
      }
      sqlOutcome = sqlResult.outcome;
    }

    setIsEvaluating(false);

    const comparison = compareAlgebraAndSql(
      algebraRelation,
      sqlOutcome.relation,
      {
        algebraReady: algebraSuccess,
        sqlReady: translationReady && sqlOutcome.success,
        failureStage: !algebraSuccess
          ? 'algebra'
          : !translationReady
            ? 'sql_translation'
            : !sqlOutcome.success
              ? 'sql_runtime'
              : undefined,
        message:
          !translationReady
            ? translationError
            : !sqlOutcome.success
              ? sqlOutcome.message
              : !algebraSuccess
                ? algebraError
                : undefined,
      }
    );

    const schema = algebraSchema;
    const columns =
      schema?.attributes.map((a) => ({
        key: a.name,
        header: a.name,
        type: (a.type === 'null' ? 'string' : a.type) as 'string' | 'number' | 'boolean' | 'date',
      })) ?? [];
    const rows = algebraRelation?.tuples ?? [];

    setExecutedSnapshot({
      expression,
      dataVersion,
      requestId: algebraOutcome.requestId,
      result: {
        columns,
        rows,
        schema,
        rowCount: rows.length,
        executionTimeMs: algebraOutcome.result.executionTimeMs,
      },
      runtimeDiagnostics: algebraOutcome.result.diagnostics,
      sqlOutcome,
      translationError: translationReady ? undefined : translationError,
      comparison,
      algebraError,
      evaluationSteps: algebraOutcome.result.steps,
      failedStepNodeId: algebraOutcome.result.nodeId,
    });
  }, [
    dataVersion,
    expression,
    isEmptyExpression,
    latestRequestIdRef,
    latestSqlRequestIdRef,
    runEvaluation,
    runSqlVerification,
    snapshot,
    validation.ast,
    validation.valid,
    wasmLocateUrl,
  ]);

  useEffect(() => {
    return () => {
      cancel();
      cancelSql();
    };
  }, [cancel, cancelSql]);

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
              onClick={() => handleLoadExampleExpression(DEFAULT_EXPRESSION)}
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

        <SandboxReferencePanel onLoadExample={handleRequestLoadExample} />

        <AlertDialog open={pendingExample !== null} onOpenChange={(open) => !open && setPendingExample(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Replace sandbox content?</AlertDialogTitle>
              <AlertDialogDescription>
                Loading “{pendingExample?.title}” will switch to the example dataset and replace your current
                expression. Your schema sets remain in the sidebar history, but unsaved edits on the active set may
                no longer match the example.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep current work</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingExample) commitLoadExample(pendingExample);
                  setPendingExample(null);
                }}
              >
                Load example
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={pendingExerciseId !== null}
          onOpenChange={(open) => !open && setPendingExerciseId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Load exercise dataset?</AlertDialogTitle>
              <AlertDialogDescription>
                Loading exercise “{pendingExerciseId ? getExercise(pendingExerciseId)?.title : ''}” will attach
                the exercise snapshot and clear the editor. Your other schema sets stay in the sidebar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep current work</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingExerciseId) commitLoadExercise(pendingExerciseId);
                  setPendingExerciseId(null);
                }}
              >
                Load exercise
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
                  activeSubexpressionRange={
                    validation.valid && !validation.isValidating ? activeSubexpressionRange : null
                  }
                  id="sandbox-expression-editor"
                  aria-label="Relational algebra expression editor"
                  aria-describedby="sandbox-diagnostics sandbox-attribute-hints sandbox-shortcuts-summary"
                  placeholder="Enter relational algebra expression, e.g. σ salary > 50000 ( Employees )"
                />
              </ClientOnly>

              <ExpressionDiagnosticList
                id="sandbox-diagnostics"
                diagnostics={validationDiagnostics}
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
                          onSelect={() => handleRequestLoadExample(ex.id)}
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
              <Tabs defaultValue="results">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                  <TabsList>
                    <TabsTrigger value="results" className="gap-1.5">
                      <TableIcon className="w-3.5 h-3.5" />
                      Results
                    </TabsTrigger>
                    <TabsTrigger value="steps" className="gap-1.5">
                      <Footprints className="w-3.5 h-3.5" />
                      Steps
                    </TabsTrigger>
                    <TabsTrigger value="sql" className="gap-1.5">
                      <Code className="w-3.5 h-3.5" />
                      SQL (preview)
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="results" className="space-y-3">
                  {executedSnapshot?.runtimeDiagnostics.length ? (
                    <ExpressionDiagnosticList
                      diagnostics={executedSnapshot.runtimeDiagnostics}
                      onSelectDiagnostic={handleJumpToDiagnostic}
                    />
                  ) : null}
                  <QueryResultPanel
                    schema={lastRunResult?.schema}
                    rows={lastRunResult?.rows ?? []}
                    executionTimeMs={lastRunResult?.executionTimeMs}
                    algebraError={executedSnapshot?.algebraError}
                    isEvaluating={isEvaluating}
                    hasRunSnapshot={executedSnapshot !== null}
                    isStale={resultsStale}
                    staleReason={staleReason}
                    hideTableWhenComparison={Boolean(executedSnapshot?.comparison && lastRunResult?.schema)}
                  />
                  {lastRunResult?.schema && executedSnapshot?.comparison && (
                    <AlgebraSqlComparisonPanel
                      algebraSchema={lastRunResult.schema}
                      algebraRows={lastRunResult.rows}
                      algebraTimeMs={lastRunResult.executionTimeMs}
                      algebraError={executedSnapshot.algebraError}
                      sqlOutcome={executedSnapshot.sqlOutcome}
                      translationError={executedSnapshot.translationError}
                      comparison={executedSnapshot.comparison}
                      loading={isEvaluating}
                    />
                  )}
                </TabsContent>

                <TabsContent value="steps" className="space-y-3">
                  <EvaluationStepsWorkspace
                    expression={expression}
                    ast={validation.ast}
                    expressionValid={validation.valid && !validation.isValidating}
                    steps={executedSnapshot?.evaluationSteps}
                    failedNodeId={executedSnapshot?.failedStepNodeId}
                    errorDiagnostic={executedSnapshot?.runtimeDiagnostics.find(
                      (d) => d.severity === 'error'
                    )}
                    isStale={resultsStale}
                    staleReason={staleReason}
                    hasRunSnapshot={executedSnapshot !== null}
                    onActiveRangeChange={setActiveSubexpressionRange}
                  />
                </TabsContent>

                <TabsContent value="sql" className="space-y-3">
                  <SqlTranslationPanel
                    expression={expression}
                    schemas={engineSchemas}
                    schemaLabel={activeSchemaSet?.name}
                    valid={validation.valid && !validation.isValidating}
                  />
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
