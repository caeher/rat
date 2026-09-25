import type { Diagnostic as EngineDiagnostic } from '@/lib/engine/types';
import type { Diagnostic as CmDiagnostic } from '@codemirror/lint';

/**
 * Maps engine diagnostics (1-based line/column + offsets) to CodeMirror document positions.
 */
export function engineDiagnosticToCm(
  docLength: number,
  diagnostic: EngineDiagnostic
): CmDiagnostic {
  const from = clampOffset(diagnostic.range.start.offset, docLength);
  const to = clampOffset(
    Math.max(diagnostic.range.end.offset, from + 1),
    docLength
  );

  return {
    from,
    to: Math.max(from, to),
    severity: diagnostic.severity === 'warning' ? 'warning' : 'error',
    message: formatDiagnosticMessage(diagnostic),
    source: diagnostic.code,
  };
}

function clampOffset(offset: number, docLength: number): number {
  if (!Number.isFinite(offset) || offset < 0) return 0;
  return Math.min(offset, docLength);
}

function formatDiagnosticMessage(diagnostic: EngineDiagnostic): string {
  const { line, column } = diagnostic.range.start;
  const loc = `Line ${line}, column ${column}`;
  return `${diagnostic.message} (${loc})`;
}

export function formatDiagnosticPlain(diagnostic: EngineDiagnostic): string {
  const { line, column } = diagnostic.range.start;
  return `${diagnostic.message} — line ${line}, column ${column}`;
}
