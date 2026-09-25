import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ReferenceSearchField } from '@/components/reference/ReferenceSearchField';
import { OperatorDocCard } from '@/components/reference/OperatorDocCard';
import { ConceptGuideCard } from '@/components/reference/ConceptGuideCard';
import {
  filterOperatorDocs,
  listConceptGuides,
  listExecutableExamples,
  searchReference,
} from '@/lib/reference';
import { exampleAnchorId, sandboxExampleQuery } from '@/lib/reference/paths';

export default function ReferencePage() {
  const [query, setQuery] = useState('');
  const concepts = listConceptGuides();
  const examples = listExecutableExamples();

  const operators = useMemo(() => filterOperatorDocs(query), [query]);
  const globalHits = useMemo(() => (query.trim() ? searchReference(query) : []), [query]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash?.replace(/^#/, '');
    if (!hash) return;
    const el = document.getElementById(hash);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <Layout
      title="RAT Reference — Operators & Learning Guides"
      description="Searchable relational algebra cheat sheet with syntax, semantics, common errors, and sandbox examples."
    >
      <div className="space-y-10">
        <header className="pb-4 border-b border-[var(--color-outline)]/60 space-y-4">
          <div>
            <p className="font-mono text-[12px] text-[var(--color-ember)] uppercase tracking-wider mb-2">
              Learning guides &amp; operator cheat sheet
            </p>
            <h1 className="text-[26px] font-normal tracking-[-0.012em] text-[var(--color-text)]">
              Relational algebra reference
            </h1>
            <p className="text-[15px] text-[var(--color-driftwood)] font-serif mt-1 max-w-2xl leading-relaxed">
              Concise syntax for every operator and join variant, conceptual notes on set semantics and NULLs, and
              examples you can run in the sandbox.
            </p>
          </div>
          <ReferenceSearchField value={query} onChange={setQuery} />
          {globalHits.length > 0 ? (
            <nav aria-label="Search matches" className="rounded-[4px] border border-[var(--color-outline)]/60 p-3 bg-[var(--color-card)]">
              <p className="text-[11px] font-mono text-[var(--color-ash)] mb-2">Jump to match</p>
              <ul className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                {globalHits.slice(0, 12).map((hit) => (
                  <li key={`${hit.kind}-${hit.id}`}>
                    <Link
                      href={hit.href}
                      className="text-[13px] text-[var(--color-text)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)] rounded-[2px]"
                    >
                      <span className="font-mono text-[11px] text-[var(--color-ash)] uppercase mr-2">
                        {hit.kind}
                      </span>
                      {hit.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </header>

        <section aria-labelledby="concept-guides-heading" className="space-y-4">
          <h2 id="concept-guides-heading" className="text-[20px] font-medium text-[var(--color-text)]">
            Conceptual guides
          </h2>
          <p className="text-[14px] text-[var(--color-driftwood)] max-w-2xl">
            Core ideas that show up across many queries—read these when diagnostics mention compatibility, NULLs, or
            join choice.
          </p>
          <div className="space-y-6">
            {concepts.map((concept) => (
              <ConceptGuideCard key={concept.id} concept={concept} />
            ))}
          </div>
        </section>

        <section aria-labelledby="operators-heading" className="space-y-4">
          <h2 id="operators-heading" className="text-[20px] font-medium text-[var(--color-text)]">
            Operator cheat sheet
          </h2>
          <p className="text-[14px] text-[var(--color-driftwood)]">
            {operators.length} operator{operators.length === 1 ? '' : 's'} shown
            {query.trim() ? ` matching “${query.trim()}”` : ''}.
          </p>
          <div className="space-y-6">
            {operators.map((op) => (
              <OperatorDocCard key={op.id} operator={op} />
            ))}
          </div>
        </section>

        <section aria-labelledby="examples-heading" className="space-y-4">
          <h2 id="examples-heading" className="text-[20px] font-medium text-[var(--color-text)]">
            Executable examples
          </h2>
          <p className="text-[14px] text-[var(--color-driftwood)] max-w-2xl">
            Each example loads the matching bundled dataset in the sandbox. Your current expression and schema edits
            are preserved until you confirm replacing them.
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4" role="list">
            {examples.map((ex) => (
              <li key={ex.id}>
                <Card id={exampleAnchorId(ex.id)} className="scroll-mt-24 h-full flex flex-col">
                  <h3 className="text-[16px] font-medium text-[var(--color-text)]">{ex.title}</h3>
                  <p className="text-[13px] text-[var(--color-driftwood)] mt-1 flex-1">{ex.description}</p>
                  <pre className="mt-3 font-mono text-[11px] bg-[var(--color-elevated)] p-2 rounded-[3px] border border-[var(--color-outline)]/50 overflow-x-auto">
                    {ex.expression}
                  </pre>
                  <p className="text-[11px] font-mono text-[var(--color-ash)] mt-2">
                    Dataset: {ex.preset === 'lesson' ? 'Lesson (Employees / Departments)' : ex.preset}
                  </p>
                  <div className="mt-3 pt-3 border-t border-[var(--color-outline)]/40">
                    <Link href={sandboxExampleQuery(ex.id)}>
                      <Button variant="primary" size="sm">
                        Run in sandbox
                      </Button>
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Layout>
  );
}
