import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { MiniRelationTable } from '@/components/reference/MiniRelationTable';
import type { ReferenceOperatorDoc } from '@/lib/reference/types';
import { exampleAnchorId, operatorAnchorId, sandboxExampleQuery } from '@/lib/reference/paths';

export interface OperatorDocCardProps {
  operator: ReferenceOperatorDoc;
  compact?: boolean;
}

export function OperatorDocCard({ operator, compact = false }: OperatorDocCardProps) {
  const anchor = operatorAnchorId(operator.id);

  return (
    <Card id={anchor} className="scroll-mt-24">
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[var(--color-outline)]/60">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className="w-9 h-9 shrink-0 rounded-[4px] bg-[var(--color-elevated)] flex items-center justify-center font-mono text-[18px] font-bold text-[var(--color-ember)]"
            aria-hidden
          >
            {operator.symbol}
          </span>
          <div className="min-w-0">
            <h2 className="text-[18px] font-medium text-[var(--color-text)]">{operator.name}</h2>
            <p className="font-mono text-[12px] text-[var(--color-ash)] mt-0.5 break-words">
              Unicode: {operator.unicodeSyntax}
            </p>
            <p className="font-mono text-[12px] text-[var(--color-driftwood)] break-words">
              ASCII: {operator.asciiSyntax}
            </p>
          </div>
        </div>
        <Tag
          variant={
            operator.classification === 'Fundamental'
              ? 'forest'
              : operator.classification === 'Derived'
                ? 'amber'
                : 'default'
          }
        >
          {operator.classification}
        </Tag>
      </header>

      <div className={`grid gap-6 mt-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
        <div className={compact ? 'space-y-4' : 'lg:col-span-7 space-y-4'}>
          <section aria-labelledby={`${anchor}-when`}>
            <h3 id={`${anchor}-when`} className="text-[13px] font-medium text-[var(--color-text)] mb-1">
              When to use it
            </h3>
            <p className="text-[14px] text-[var(--color-driftwood)] leading-relaxed">{operator.whenToUse}</p>
          </section>

          <section aria-labelledby={`${anchor}-operands`}>
            <h3 id={`${anchor}-operands`} className="text-[13px] font-medium text-[var(--color-text)] mb-1">
              Operands &amp; output schema
            </h3>
            <ul className="text-[13px] text-[var(--color-driftwood)] space-y-1 list-disc list-inside">
              <li>{operator.operandRequirements}</li>
              <li>{operator.outputSchema}</li>
            </ul>
          </section>

          <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-outline)]/60 rounded-[4px]">
            <div className="text-[11px] font-mono text-[var(--color-ash)] mb-1">Formal semantics</div>
            <div className="font-mono text-[13px] text-[var(--color-text)] break-words">{operator.semantics}</div>
          </div>

          <section aria-labelledby={`${anchor}-aliases`}>
            <h3 id={`${anchor}-aliases`} className="text-[11px] font-mono text-[var(--color-ash)] mb-1">
              ASCII aliases
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {operator.asciiAliases.map((alias) => (
                <code
                  key={alias}
                  className="px-2 py-0.5 bg-[var(--color-card)] border border-[var(--color-outline)]/50 rounded-[3px] font-mono text-[11px]"
                >
                  {alias}
                </code>
              ))}
            </div>
          </section>

          <section aria-labelledby={`${anchor}-mistakes`}>
            <h3 id={`${anchor}-mistakes`} className="text-[13px] font-medium text-[var(--color-text)] mb-2">
              Common mistakes
            </h3>
            <ul className="space-y-2">
              {operator.commonMistakes.map((mistake) => (
                <li
                  key={mistake.title}
                  className="text-[13px] border-l-2 border-[var(--color-amber)]/70 pl-3"
                >
                  <span className="font-medium text-[var(--color-text)]">{mistake.title}. </span>
                  <span className="text-[var(--color-driftwood)]">{mistake.explanation}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className={compact ? 'space-y-4' : 'lg:col-span-5 space-y-4'}>
          <section aria-labelledby={`${anchor}-example`}>
            <h3 id={`${anchor}-example`} className="text-[13px] font-medium text-[var(--color-text)] mb-2">
              Worked example
            </h3>
            <p className="text-[12px] text-[var(--color-driftwood)] mb-2">{operator.workedExample.caption}</p>
            <pre className="font-mono text-[12px] bg-[var(--color-elevated)] p-2.5 rounded-[3px] border border-[var(--color-outline)]/50 overflow-x-auto text-[var(--color-text)] mb-3">
              {operator.workedExample.expression}
            </pre>
            {!compact && (
              <div className="space-y-3">
                {operator.workedExample.inputTables.map((table) => (
                  <MiniRelationTable key={table.title} table={table} />
                ))}
                <MiniRelationTable table={operator.workedExample.outputTable} />
              </div>
            )}
          </section>

          {operator.executableExampleId ? (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--color-outline)]/40">
              <Link href={sandboxExampleQuery(operator.executableExampleId)}>
                <Button variant="primary" size="sm">
                  Try in sandbox
                </Button>
              </Link>
              <Link href={`#${exampleAnchorId(operator.executableExampleId)}`}>
                <Button variant="ghost" size="sm">
                  Example details
                </Button>
              </Link>
            </div>
          ) : (
            <Link href="/sandbox">
              <Button variant="ghost" size="sm">
                Open sandbox
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
