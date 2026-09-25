import { describe, it, expect } from 'vitest';
import { engineDiagnosticToCm, formatDiagnosticPlain } from '@/lib/editor/positions';
import type { Diagnostic } from '@/lib/engine/types';

const sampleDiagnostic: Diagnostic = {
  code: 'E_UNRESOLVED_RELATION',
  severity: 'error',
  message: "Relation 'Foo' is not defined in the active schema",
  range: {
    start: { line: 1, column: 5, offset: 4 },
    end: { line: 1, column: 8, offset: 7 },
  },
};

describe('editor positions', () => {
  it('maps engine offsets to CodeMirror lint ranges', () => {
    const cm = engineDiagnosticToCm(100, sampleDiagnostic);
    expect(cm.from).toBe(4);
    expect(cm.to).toBe(7);
    expect(cm.message).toContain('Line 1, column 5');
  });

  it('formats plain-language diagnostic lines', () => {
    expect(formatDiagnosticPlain(sampleDiagnostic)).toContain('line 1, column 5');
    expect(formatDiagnosticPlain(sampleDiagnostic)).toContain('not defined');
  });
});
