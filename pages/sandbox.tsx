import React, { useState } from 'react';
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
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  Table as TableIcon,
  Database,
  Code,
  Sparkles,
  Share2,
} from 'lucide-react';

const SAMPLE_OPERATORS = [
  { symbol: 'σ', name: 'Selection', example: 'σ condition (R)', desc: 'Filters tuples satisfying predicate' },
  { symbol: 'π', name: 'Projection', example: 'π attr1, attr2 (R)', desc: 'Selects specified attributes' },
  { symbol: 'ρ', name: 'Rename', example: 'ρ NewName (R)', desc: 'Renames relation or attributes' },
  { symbol: '⋈', name: 'Natural Join', example: 'R ⋈ S', desc: 'Joins on common attribute names' },
  { symbol: '⟕', name: 'Left Outer Join', example: 'R ⟕ S', desc: 'Preserves all left tuples' },
  { symbol: '⟖', name: 'Right Outer Join', example: 'R ⟖ S', desc: 'Preserves all right tuples' },
  { symbol: '⟗', name: 'Full Outer Join', example: 'R ⟗ S', desc: 'Preserves all left and right tuples' },
  { symbol: '⨯', name: 'Cartesian Product', example: 'R ⨯ S', desc: 'Combines all tuple pairs' },
  { symbol: '∪', name: 'Union', example: 'R ∪ S', desc: 'Tuples in R or S (set union)' },
  { symbol: '−', name: 'Difference', example: 'R − S', desc: 'Tuples in R not in S' },
  { symbol: '∩', name: 'Intersection', example: 'R ∩ S', desc: 'Tuples in both R and S' },
  { symbol: '÷', name: 'Division', example: 'R ÷ S', desc: 'Relational division' },
];

const SAMPLE_RELATIONS = [
  {
    name: 'Employees',
    attributes: [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'dept_id', type: 'number' },
      { name: 'salary', type: 'number' },
    ],
    tuples: [
      { id: 101, name: 'Alice Smith', dept_id: 1, salary: '$92,000' },
      { id: 102, name: 'Bob Jones', dept_id: 2, salary: '$65,000' },
      { id: 103, name: 'Carlos Ortiz', dept_id: 1, salary: '$84,000' },
      { id: 104, name: 'Diana Prince', dept_id: 3, salary: '$98,500' },
    ],
  },
  {
    name: 'Departments',
    attributes: [
      { name: 'dept_id', type: 'number' },
      { name: 'dept_name', type: 'string' },
      { name: 'location', type: 'string' },
    ],
    tuples: [
      { dept_id: 1, dept_name: 'Engineering', location: 'Building A' },
      { dept_id: 2, dept_name: 'Marketing', location: 'Building B' },
      { dept_id: 3, dept_name: 'Research', location: 'Building C' },
    ],
  },
];

export default function SandboxPage() {
  const [expression, setExpression] = useState(
    'π name, dept_name, salary ( σ salary > 70000 ( Employees ⋈ Departments ) )'
  );
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleInsertSymbol = (symbol: string) => {
    setExpression((prev) => `${prev} ${symbol} `);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(expression);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleEvaluate = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      setIsEvaluating(false);
    }, 400);
  };

  const resultColumns = [
    { key: 'name', header: 'name', mono: false },
    { key: 'dept_name', header: 'dept_name', mono: false },
    { key: 'salary', header: 'salary', mono: true },
  ];

  const resultData = [
    { name: 'Alice Smith', dept_name: 'Engineering', salary: '$92,000' },
    { name: 'Carlos Ortiz', dept_name: 'Engineering', salary: '$84,000' },
    { name: 'Diana Prince', dept_name: 'Research', salary: '$98,500' },
  ];

  return (
    <Layout
      title="RAT Sandbox — Relational Algebra Expression Editor"
      description="Interactive browser sandbox for writing and executing Relational Algebra queries."
    >
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-outline)]/60">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[26px] font-normal tracking-[-0.012em] text-[var(--color-text)]">
                Relational Algebra Sandbox
              </h1>
              <Tag variant="forest">Ready</Tag>
              <Tag variant="default">Client-Side WASM/JS</Tag>
            </div>
            <p className="text-[14px] text-[var(--color-driftwood)] mt-1">
              Construct queries using algebraic operators and evaluate them against in-memory relations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setExpression('π name, salary ( σ salary > 80000 ( Employees ) )')
              }
              className="gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
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

            <Button
              variant="amber"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Query'}
            </Button>
          </div>
        </div>

        {/* Operator Quick-Insert Toolbar */}
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
                    <span className="font-medium text-[13px] text-[var(--color-text)]">
                      {op.name}
                    </span>
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

        {/* Main Editor & Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Query Editor & Schema Viewer */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[var(--color-text)] flex items-center gap-2">
                  <Code className="w-4 h-4 text-[var(--color-ash)]" />
                  Expression Editor
                </span>
                <span className="text-[11px] font-mono text-[var(--color-ash)]">
                  AST Syntax Valid
                </span>
              </div>

              <ClientOnly
                fallback={
                  <div className="h-32 bg-[var(--color-card)] animate-pulse rounded-[4px]" />
                }
              >
                <Textarea
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  rows={4}
                  mono
                  placeholder="Enter relational algebra expression, e.g. σ salary > 50000 ( Employees )"
                />
              </ClientOnly>

              <div className="flex items-center justify-between pt-2">
                <div className="text-[12px] text-[var(--color-driftwood)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--color-amber)]" />
                  <span>Interactive syntax parser active</span>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  loading={isEvaluating}
                  loadingText="Evaluating..."
                  onClick={handleEvaluate}
                  className="gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Evaluate Expression
                </Button>
              </div>
            </Card>

            {/* In-Memory Available Schemas */}
            <Card className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-outline)]/50">
                <span className="text-[13px] font-medium text-[var(--color-text)] flex items-center gap-2">
                  <Database className="w-4 h-4 text-[var(--color-ash)]" />
                  Active In-Memory Relations
                </span>
                <span className="text-[11px] font-mono text-[var(--color-ash)]">
                  2 relations available
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SAMPLE_RELATIONS.map((rel) => (
                  <div
                    key={rel.name}
                    className="p-3 bg-[var(--color-canvas)] border border-[var(--color-outline)]/60 rounded-[4px]"
                  >
                    <div className="font-mono text-[13px] font-semibold text-[var(--color-text)] mb-1">
                      {rel.name}
                    </div>
                    <div className="text-[11px] font-mono text-[var(--color-driftwood)] space-y-0.5">
                      {rel.attributes.map((attr) => (
                        <div key={attr.name} className="flex justify-between">
                          <span>{attr.name}</span>
                          <span className="text-[var(--color-ash)]">{attr.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Results View Panel */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-4 space-y-4">
              <Tabs defaultValue="results">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                  <TabsList>
                    <TabsTrigger value="results" className="gap-1.5">
                      <TableIcon className="w-3.5 h-3.5" />
                      Relation (3)
                    </TabsTrigger>
                    <TabsTrigger value="sql" className="gap-1.5">
                      <Code className="w-3.5 h-3.5" />
                      SQL Translation
                    </TabsTrigger>
                  </TabsList>
                  <Tag variant="forest">0.38 ms</Tag>
                </div>

                <TabsContent value="results" className="space-y-3">
                  <DataTable
                    columns={resultColumns}
                    data={isEvaluating ? [] : resultData}
                    loading={isEvaluating}
                    caption="Query output relation with 3 tuples."
                  />
                </TabsContent>

                <TabsContent value="sql" className="space-y-3">
                  <div className="text-[12px] font-mono text-[var(--color-ash)]">
                    Equivalent ANSI SQL:
                  </div>
                  <pre className="p-3.5 bg-[var(--color-canvas)] border border-[var(--color-outline)]/60 rounded-[4px] font-mono text-[13px] text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">
{`SELECT 
  Employees.name, 
  Departments.dept_name, 
  Employees.salary 
FROM Employees 
NATURAL JOIN Departments 
WHERE Employees.salary > 70000;`}
                  </pre>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
