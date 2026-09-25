import { linter, type Diagnostic as CmDiagnostic } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import type { Diagnostic as EngineDiagnostic, ValidationResult } from '@/lib/engine/types';
import { engineDiagnosticToCm } from './positions';

export interface RaLinterOptions {
  getValidation: () => ValidationResult;
}

/**
 * CodeMirror linter driven by the shared validateExpression pipeline.
 */
export function createRaLinter(options: RaLinterOptions): Extension {
  return linter((view) => {
    const validation = options.getValidation();
    const docLength = view.state.doc.length;
    const trimmed = view.state.doc.toString().trim();

    if (!trimmed) {
      return [];
    }

    const diagnostics = validation.diagnostics.filter(
      (d) => d.severity === 'error' || d.severity === 'warning'
    );

    if (validation.isIncomplete && diagnostics.length === 0) {
      return [];
    }

    return diagnostics.map((d) => engineDiagnosticToCm(docLength, d));
  });
}

export function cmDiagnosticsFromEngine(
  docLength: number,
  diagnostics: EngineDiagnostic[]
): CmDiagnostic[] {
  return diagnostics
    .filter((d) => d.severity === 'error' || d.severity === 'warning')
    .map((d) => engineDiagnosticToCm(docLength, d));
}
