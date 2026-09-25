import { listConceptGuides } from './concepts';
import { listExecutableExamples } from './examples';
import { listOperatorDocs } from './operators';
import {
  conceptReferenceHref,
  exampleReferenceHref,
  operatorReferenceHref,
} from './paths';
import type { ReferenceSearchResult } from './types';

function normalize(text: string): string {
  return text.toLowerCase();
}

export function searchReference(query: string): ReferenceSearchResult[] {
  const q = normalize(query.trim());
  if (!q) return [];

  const results: ReferenceSearchResult[] = [];

  for (const op of listOperatorDocs()) {
    const haystack = [
      op.name,
      op.symbol,
      op.unicodeSyntax,
      op.asciiSyntax,
      op.semantics,
      op.whenToUse,
      ...op.asciiAliases,
      ...(op.searchKeywords ?? []),
      ...op.commonMistakes.map((m) => `${m.title} ${m.explanation}`),
    ]
      .join(' ')
      .toLowerCase();

    if (haystack.includes(q)) {
      results.push({
        kind: 'operator',
        id: op.id,
        title: op.name,
        snippet: op.whenToUse,
        href: operatorReferenceHref(op.id),
      });
    }
  }

  for (const concept of listConceptGuides()) {
    const haystack = [
      concept.title,
      concept.summary,
      ...(concept.searchKeywords ?? []),
      ...concept.sections.map((s) => `${s.heading} ${s.body}`),
    ]
      .join(' ')
      .toLowerCase();

    if (haystack.includes(q)) {
      results.push({
        kind: 'concept',
        id: concept.id,
        title: concept.title,
        snippet: concept.summary,
        href: conceptReferenceHref(concept.id),
      });
    }
  }

  for (const ex of listExecutableExamples()) {
    const haystack = [ex.title, ex.description, ex.expression].join(' ').toLowerCase();
    if (haystack.includes(q)) {
      results.push({
        kind: 'example',
        id: ex.id,
        title: ex.title,
        snippet: ex.description,
        href: exampleReferenceHref(ex.id),
      });
    }
  }

  return results;
}

export function filterOperatorDocs(query: string) {
  const q = normalize(query.trim());
  const ops = listOperatorDocs();
  if (!q) return ops;
  return ops.filter((op) => {
    const haystack = [
      op.name,
      op.symbol,
      op.asciiSyntax,
      ...op.asciiAliases,
      ...(op.searchKeywords ?? []),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
