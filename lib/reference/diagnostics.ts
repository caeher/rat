import type { Diagnostic, DiagnosticCode } from '@/lib/engine/types';
import type { OperatorType } from '@/lib/engine/types';
import { conceptReferenceHref, operatorReferenceHref } from './paths';
import { getOperatorDocByType } from './operators';

/** Maps validation/runtime codes to reference anchors (operator or concept). */
const DIAGNOSTIC_REFERENCE: Partial<
  Record<DiagnosticCode, { kind: 'operator' | 'concept'; id: string }>
> = {
  E_UNION_INCOMPATIBLE_ARITY: { kind: 'concept', id: 'union-compatibility' },
  E_UNION_INCOMPATIBLE_TYPE: { kind: 'concept', id: 'union-compatibility' },
  E_DIVISION_NOT_SUBSET: { kind: 'operator', id: 'division' },
  E_DIVISION_EMPTY_QUOTIENT: { kind: 'operator', id: 'division' },
  E_AMBIGUOUS_ATTRIBUTE: { kind: 'concept', id: 'renaming-ambiguity' },
  E_DUPLICATE_ATTRIBUTE: { kind: 'concept', id: 'renaming-ambiguity' },
  W_CROSS_PRODUCT_DUPLICATE_NAMES: { kind: 'operator', id: 'cartesian-product' },
  W_POSSIBLE_NULL_FILTER: { kind: 'concept', id: 'nulls-and-3vl' },
  W_VACUOUS_EMPTY_DIVISOR: { kind: 'operator', id: 'division' },
  E_INVALID_PREDICATE: { kind: 'operator', id: 'selection' },
  E_UNRESOLVED_ATTRIBUTE: { kind: 'operator', id: 'projection' },
  E_INVALID_RENAME_ARITY: { kind: 'operator', id: 'rename-attributes' },
  E_INVALID_RENAME_TARGET: { kind: 'operator', id: 'rename-attributes' },
};

export function referenceHrefForDiagnosticCode(code: DiagnosticCode): string | undefined {
  const entry = DIAGNOSTIC_REFERENCE[code];
  if (!entry) return undefined;
  return entry.kind === 'concept'
    ? conceptReferenceHref(entry.id)
    : operatorReferenceHref(entry.id);
}

export function referenceHrefForOperatorType(type: OperatorType): string {
  const doc = getOperatorDocByType(type);
  return operatorReferenceHref(doc?.id ?? 'selection');
}

export function enrichDiagnosticWithReference(doc: Diagnostic): Diagnostic {
  if (doc.documentationUrl) return doc;
  const href = referenceHrefForDiagnosticCode(doc.code);
  if (!href) return doc;
  return { ...doc, documentationUrl: href };
}

export function enrichDiagnosticsWithReference(diagnostics: Diagnostic[]): Diagnostic[] {
  return diagnostics.map(enrichDiagnosticWithReference);
}
