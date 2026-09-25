import { describe, expect, it } from 'vitest';
import { listOperatorDocs, listConceptGuides, listExecutableExamples } from '@/lib/reference';
import { referenceHrefForDiagnosticCode } from '@/lib/reference/diagnostics';

describe('reference operator content', () => {
  it('documents every palette operator with syntax, mistakes, and examples', () => {
    const operators = listOperatorDocs();
    expect(operators.length).toBeGreaterThanOrEqual(14);
    for (const op of operators) {
      expect(op.unicodeSyntax.length).toBeGreaterThan(0);
      expect(op.asciiSyntax.length).toBeGreaterThan(0);
      expect(op.asciiAliases.length).toBeGreaterThan(0);
      expect(op.operandRequirements.length).toBeGreaterThan(0);
      expect(op.outputSchema.length).toBeGreaterThan(0);
      expect(op.workedExample.expression.length).toBeGreaterThan(0);
      expect(op.commonMistakes.length).toBeGreaterThanOrEqual(1);
      expect(op.operatorTypes.length).toBeGreaterThan(0);
    }
  });

  it('covers conceptual learning topics from issue #16', () => {
    const ids = listConceptGuides().map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'set-vs-bag',
        'nulls-and-3vl',
        'union-compatibility',
        'natural-vs-theta',
        'outer-joins',
        'renaming-ambiguity',
        'relational-division',
      ])
    );
  });

  it('maps common diagnostics to reference anchors', () => {
    expect(referenceHrefForDiagnosticCode('E_UNION_INCOMPATIBLE_ARITY')).toContain('#concept-');
    expect(referenceHrefForDiagnosticCode('E_AMBIGUOUS_ATTRIBUTE')).toContain('#concept-');
    expect(referenceHrefForDiagnosticCode('E_DIVISION_NOT_SUBSET')).toContain('#operator-');
  });

  it('links executable examples to operators', () => {
    for (const ex of listExecutableExamples()) {
      const op = listOperatorDocs().find((o) => o.id === ex.operatorId);
      expect(op, ex.id).toBeDefined();
    }
  });
});
