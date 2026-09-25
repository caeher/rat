import React from 'react';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WindowFrame } from '@/components/ui/WindowFrame';
import { TerminalSnippet } from '@/components/ui/TerminalSnippet';
import { Tag } from '@/components/ui/Tag';
import { DataTable } from '@/components/ui/Table';
import { ArrowRight, Terminal, BookOpen, Layers, CheckCircle2, Cpu, Zap, Share2 } from 'lucide-react';

export default function HomePage() {
  const resultColumns = [
    { key: 'name', header: 'name', mono: false },
    { key: 'department', header: 'department', mono: false },
    { key: 'salary', header: 'salary', mono: true },
  ];

  const resultData = [
    { name: 'Alice Smith', department: 'Engineering', salary: '$92,000' },
    { name: 'Carlos Ortiz', department: 'Design', salary: '$84,000' },
    { name: 'Diana Prince', department: 'Research', salary: '$98,500' },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="pt-8 pb-16">
        <div className="max-w-[860px]">
          <div className="flex items-center gap-2 mb-4">
            <Tag variant="ember">v0.1.0 Foundation</Tag>
            <span className="text-[13px] text-[var(--color-driftwood)]">·</span>
            <span className="text-[13px] text-[var(--color-driftwood)]">
              Client-Side Relational Algebra Compiler
            </span>
          </div>

          <h1 className="text-[32px] sm:text-[52px] md:text-[64px] font-normal tracking-[-0.03em] leading-[1.1] sm:leading-[1.08] text-[var(--color-text)] mb-6">
            The modern interactive canvas for relational algebra.
          </h1>

          <p className="text-[16px] sm:text-[19px] text-[var(--color-driftwood)] font-serif leading-relaxed mb-8 max-w-[700px]">
            Write formal relational algebra expressions, inspect step-by-step evaluation trees,
            translate to optimized SQL, and master relational calculus directly inside your browser.
          </p>

          {/* Action CTA Stack */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 mb-12">
            <Link href="/sandbox" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto gap-2 justify-center">
                Launch Sandbox
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/exercises" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto gap-2 justify-center">
                Explore Exercises
              </Button>
            </Link>
            <Link href="/reference" className="w-full sm:w-auto">
              <Button variant="ghost" size="lg" className="w-full sm:w-auto justify-center">
                Operator Reference →
              </Button>
            </Link>
          </div>
        </div>

        {/* Product Showcase Window Mockup */}
        <div className="mt-4">
          <WindowFrame
            title="RAT Workspace — Selection & Join Evaluation"
            tabs={[
              { id: 'query', label: 'expression.ra', active: true },
              { id: 'sql', label: 'translated.sql' },
              { id: 'tree', label: 'ast-tree.json' },
            ]}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-2">
              {/* Left query editor mockup */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--color-outline)]/60">
                  <span className="font-mono text-[12px] text-[var(--color-ash)]">
                    Query Expression:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] px-1.5 py-0.5 bg-[var(--color-card)] text-[var(--color-forest)] rounded-[2px] border border-[var(--color-outline)]/50">
                      Valid Syntax
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-[var(--color-card)] border border-[var(--color-outline)]/70 rounded-[4px] font-mono text-[14px] text-[var(--color-text)] leading-relaxed">
                  <span className="text-[var(--color-ember)] font-semibold">π</span>
                  <sub className="text-[11px] text-[var(--color-ash)]">name, department, salary</sub>
                  (
                  <span className="text-[var(--color-forest)] font-semibold">σ</span>
                  <sub className="text-[11px] text-[var(--color-ash)]">salary &gt; 75000</sub>
                  (Employees <span className="text-[var(--color-amber)] font-semibold">⋈</span> Departments)
                  )
                </div>

                <div className="space-y-2">
                  <span className="font-mono text-[12px] text-[var(--color-ash)]">
                    Compiled SQL Equivalent:
                  </span>
                  <TerminalSnippet
                    command="SELECT e.name, d.department, e.salary FROM Employees e NATURAL JOIN Departments d WHERE e.salary > 75000;"
                    prompt="SQL >"
                  />
                </div>
              </div>

              {/* Right relation output table mockup */}
              <div className="lg:col-span-5 bg-[var(--color-card)] border border-[var(--color-outline)]/60 rounded-[4px] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] font-mono font-medium text-[var(--color-text)]">
                      Result Relation (3 tuples)
                    </span>
                    <span className="text-[11px] font-mono text-[var(--color-ash)]">
                      0.42 ms
                    </span>
                  </div>

                  <DataTable columns={resultColumns} data={resultData} />
                </div>

                <div className="pt-3 border-t border-[var(--color-outline)]/50 flex items-center justify-between text-[11px] text-[var(--color-driftwood)] mt-4">
                  <span>Execution: Pure Client JS</span>
                  <span className="text-[var(--color-forest)] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Schema Verified
                  </span>
                </div>
              </div>
            </div>
          </WindowFrame>
        </div>
      </section>

      {/* Feature Section Cards */}
      <section className="py-12 border-t border-[var(--color-outline)]/60">
        <div className="mb-8">
          <span className="text-[12px] font-mono text-[var(--color-ember)] uppercase tracking-wider">
            Foundational Features
          </span>
          <h2 className="text-[26px] font-normal tracking-[-0.012em] text-[var(--color-text)] mt-1">
            Built for rigorous computer science education
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="w-8 h-8 rounded-[4px] bg-[var(--color-elevated)] flex items-center justify-center mb-4 text-[var(--color-text)]">
              <Terminal className="w-4 h-4" />
            </div>
            <h3 className="text-[16px] font-medium text-[var(--color-text)] mb-2">
              Interactive Expression Sandbox
            </h3>
            <p className="text-[14px] text-[var(--color-driftwood)] leading-relaxed mb-4">
              Write, validate, and evaluate relational algebra queries against live tables with immediate visual feedback and schema inspection.
            </p>
            <Link href="/sandbox" className="text-[13px] text-[var(--color-ember)] hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)]">
              Open sandbox →
            </Link>
          </Card>

          <Card>
            <div className="w-8 h-8 rounded-[4px] bg-[var(--color-elevated)] flex items-center justify-center mb-4 text-[var(--color-text)]">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-[16px] font-medium text-[var(--color-text)] mb-2">
              Curated Practice Exercises
            </h3>
            <p className="text-[14px] text-[var(--color-driftwood)] leading-relaxed mb-4">
              Progressive problem sets from basic projections and selections to multi-way joins, set operations, and division queries.
            </p>
            <Link href="/exercises" className="text-[13px] text-[var(--color-ember)] hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)]">
              Browse exercises →
            </Link>
          </Card>

          <Card>
            <div className="w-8 h-8 rounded-[4px] bg-[var(--color-elevated)] flex items-center justify-center mb-4 text-[var(--color-text)]">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-[16px] font-medium text-[var(--color-text)] mb-2">
              Formal Operator Reference
            </h3>
            <p className="text-[14px] text-[var(--color-driftwood)] leading-relaxed mb-4">
              Comprehensive reference sheet documenting mathematical definitions, algebraic laws, operator precedence, and SQL translations.
            </p>
            <Link href="/reference" className="text-[13px] text-[var(--color-ember)] hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)]">
              View operator guide →
            </Link>
          </Card>
        </div>
      </section>

      {/* Architectural Principles Section */}
      <section className="py-12 border-t border-[var(--color-outline)]/60">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5">
            <span className="text-[12px] font-mono text-[var(--color-ash)] uppercase tracking-wider">
              Zero-Server Architecture
            </span>
            <h2 className="text-[26px] font-normal tracking-[-0.012em] text-[var(--color-text)] mt-1 mb-4">
              Everything runs locally in your browser
            </h2>
            <p className="text-[15px] text-[var(--color-driftwood)] font-serif leading-relaxed mb-6">
              RAT is designed as a standalone static application deployable to GitHub Pages. All parsing, validation, query tree generation, and relation execution happen client-side without any server roundtrips.
            </p>

            <div className="space-y-3 text-[14px] text-[var(--color-text)]">
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-[var(--color-amber)]" />
                <span>Instant sub-millisecond query evaluation</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-[var(--color-forest)]" />
                <span>Offline capable with zero tracking or telemetry</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Share2 className="w-4 h-4 text-[var(--color-ember)]" />
                <span>Deterministic query sharing via URL fragments</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <Card elevated className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-outline)]/60">
                <span className="text-[13px] font-medium text-[var(--color-text)]">
                  Architectural Boundaries
                </span>
                <Tag variant="forest">GitHub Pages Ready</Tag>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
                <div className="p-3 bg-[var(--color-canvas)] rounded-[4px] border border-[var(--color-outline)]/60">
                  <div className="font-mono font-medium text-[var(--color-text)] mb-1">
                    Frontend Layer
                  </div>
                  <p className="text-[12px] text-[var(--color-driftwood)]">
                    Next.js 16.3.6 (Pages Router), Radix UI primitives, Tailwind v4 tokens
                  </p>
                </div>

                <div className="p-3 bg-[var(--color-canvas)] rounded-[4px] border border-[var(--color-outline)]/60">
                  <div className="font-mono font-medium text-[var(--color-text)] mb-1">
                    Compiler Engine
                  </div>
                  <p className="text-[12px] text-[var(--color-driftwood)]">
                    Client-side lexer, recursive-descent parser, AST optimizer
                  </p>
                </div>

                <div className="p-3 bg-[var(--color-canvas)] rounded-[4px] border border-[var(--color-outline)]/60">
                  <div className="font-mono font-medium text-[var(--color-text)] mb-1">
                    Relational Storage
                  </div>
                  <p className="text-[12px] text-[var(--color-driftwood)]">
                    In-memory relation tables, browser LocalStorage persistence
                  </p>
                </div>

                <div className="p-3 bg-[var(--color-canvas)] rounded-[4px] border border-[var(--color-outline)]/60">
                  <div className="font-mono font-medium text-[var(--color-text)] mb-1">
                    Deployment
                  </div>
                  <p className="text-[12px] text-[var(--color-driftwood)]">
                    Static export (out/) hosted seamlessly on root or /rat path
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </Layout>
  );
}
