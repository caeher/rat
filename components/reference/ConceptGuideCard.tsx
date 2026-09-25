import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { MiniRelationTable } from '@/components/reference/MiniRelationTable';
import type { ReferenceConceptGuide } from '@/lib/reference/types';
import { conceptAnchorId, operatorReferenceHref } from '@/lib/reference/paths';

export function ConceptGuideCard({ concept }: { concept: ReferenceConceptGuide }) {
  const anchor = conceptAnchorId(concept.id);

  return (
    <Card id={anchor} className="scroll-mt-24">
      <header className="pb-3 border-b border-[var(--color-outline)]/60">
        <h2 className="text-[18px] font-medium text-[var(--color-text)]">{concept.title}</h2>
        <p className="text-[14px] text-[var(--color-driftwood)] mt-1 leading-relaxed">{concept.summary}</p>
      </header>

      <div className="mt-4 space-y-4">
        {concept.sections.map((section) => (
          <section key={section.heading}>
            <h3 className="text-[13px] font-medium text-[var(--color-text)] mb-1">{section.heading}</h3>
            <p className="text-[14px] text-[var(--color-driftwood)] leading-relaxed">{section.body}</p>
            {section.table ? (
              <div className="mt-2">
                <MiniRelationTable table={section.table} />
              </div>
            ) : null}
          </section>
        ))}

        {concept.relatedOperatorIds && concept.relatedOperatorIds.length > 0 ? (
          <nav aria-label={`Related operators for ${concept.title}`} className="pt-2">
            <p className="text-[11px] font-mono text-[var(--color-ash)] mb-1.5">Related operators</p>
            <ul className="flex flex-wrap gap-2">
              {concept.relatedOperatorIds.map((opId) => (
                <li key={opId}>
                  <Link
                    href={operatorReferenceHref(opId)}
                    className="text-[12px] font-mono text-[var(--color-ember)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ink)] rounded-[2px]"
                  >
                    {opId.replace(/-/g, ' ')}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </Card>
  );
}
