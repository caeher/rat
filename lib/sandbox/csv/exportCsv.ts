import type { RelationSchema, Tuple, TupleValue } from '@/lib/engine/types';
import { applySpreadsheetSafeExport } from './spreadsheetSafe';

/** Documented NULL token in exported CSV (PostgreSQL-style, distinct from empty quoted strings). */
export const CSV_NULL_TOKEN = '\\N';

export interface CsvExportOptions {
  /** Mitigate CSV formula injection when opening in Excel/Sheets. Default true. */
  spreadsheetSafe?: boolean;
}

export interface CsvSerializeResult {
  csv: string;
  /** Count of cells that received spreadsheet-safe prefixing. */
  spreadsheetSafeTransformCount: number;
}

function formatCellForCsv(value: TupleValue, options: CsvExportOptions): { field: string; safePrefix: boolean } {
  if (value === null) {
    return { field: CSV_NULL_TOKEN, safePrefix: false };
  }

  let text: string;
  if (typeof value === 'boolean') {
    text = value ? 'true' : 'false';
  } else if (typeof value === 'number') {
    text = Number.isFinite(value) ? String(value) : '';
  } else {
    text = String(value);
  }

  let safePrefix = false;
  if (options.spreadsheetSafe !== false) {
    const safe = applySpreadsheetSafeExport(text);
    text = safe.value;
    safePrefix = safe.prefixed;
  }

  const field = text === '' ? '""' : escapeCsvField(text);
  return { field, safePrefix };
}

/** RFC 4180-style field escaping (always produces safe delimited fields). */
export function escapeCsvField(text: string): string {
  const mustQuote =
    text.includes('"') ||
    text.includes(',') ||
    text.includes('\n') ||
    text.includes('\r') ||
    text.startsWith(' ') ||
    text.endsWith(' ');

  if (!mustQuote) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Serialize a relation to UTF-8 CSV text (no BOM). Header row uses attribute names in schema order.
 */
export function serializeRelationToCsv(
  schema: RelationSchema,
  rows: Tuple[],
  options: CsvExportOptions = {}
): CsvSerializeResult {
  const headers = schema.attributes.map((a) => a.name);
  let spreadsheetSafeTransformCount = 0;

  const headerLine = headers.map((h) => escapeCsvField(h)).join(',');

  const bodyLines = rows.map((row) => {
    const fields = schema.attributes.map((attr) => {
      const raw = row[attr.name] ?? null;
      const { field, safePrefix } = formatCellForCsv(raw, options);
      if (safePrefix) spreadsheetSafeTransformCount += 1;
      return field;
    });
    return fields.join(',');
  });

  const csv = [headerLine, ...bodyLines].join('\r\n');
  return { csv, spreadsheetSafeTransformCount };
}
