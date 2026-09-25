import { withBasePath } from '@/lib/paths';

export function referencePagePath(hash?: string): string {
  const base = withBasePath('/reference');
  if (!hash) return base;
  const normalized = hash.startsWith('#') ? hash : `#${hash}`;
  return `${base}${normalized}`;
}

export function operatorAnchorId(operatorDocId: string): string {
  return `operator-${operatorDocId}`;
}

export function conceptAnchorId(conceptId: string): string {
  return `concept-${conceptId}`;
}

export function exampleAnchorId(exampleId: string): string {
  return `example-${exampleId}`;
}

export function operatorReferenceHref(operatorDocId: string): string {
  return referencePagePath(operatorAnchorId(operatorDocId));
}

export function conceptReferenceHref(conceptId: string): string {
  return referencePagePath(conceptAnchorId(conceptId));
}

export function exampleReferenceHref(exampleId: string): string {
  return referencePagePath(exampleAnchorId(exampleId));
}

export function sandboxExampleQuery(exampleId: string): string {
  return withBasePath(`/sandbox?example=${encodeURIComponent(exampleId)}`);
}
