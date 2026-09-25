/**
 * Spreadsheet formula-injection mitigation for CSV export (display/export only).
 * See QueryResultPanel export help for the user-facing policy.
 */

const FORMULA_PREFIX = /^[\s]*[=+\-@]/;

export interface SpreadsheetSafeResult {
  value: string;
  /** True when a leading single quote was prepended inside the quoted CSV field. */
  prefixed: boolean;
}

/**
 * Prefix formula-like cell text so Excel/LibreOffice will not interpret it as a formula.
 * The transformation is reversible in spirit: a leading apostrophe is Excel's "text" escape.
 */
export function applySpreadsheetSafeExport(value: string): SpreadsheetSafeResult {
  if (FORMULA_PREFIX.test(value)) {
    return { value: `'${value}`, prefixed: true };
  }
  return { value, prefixed: false };
}

export const SPREADSHEET_SAFE_POLICY_SUMMARY =
  'Cells whose text begins with =, +, -, or @ (after optional spaces) are prefixed with a single quote so spreadsheet apps treat them as plain text.';
