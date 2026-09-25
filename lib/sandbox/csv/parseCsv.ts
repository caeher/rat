export type CsvDelimiter = ',' | ';' | '\t';

export interface CsvParseOptions {
  delimiter?: CsvDelimiter | 'auto';
  /** Strip UTF-8 BOM when present. */
  stripBom?: boolean;
}

export interface CsvParseIssue {
  kind: 'duplicate_header' | 'empty_file' | 'row_width_mismatch';
  message: string;
  row?: number;
  column?: number;
}

export interface CsvParseResult {
  headers: string[];
  /** Original header labels before deduplication (for diagnostics). */
  rawHeaders: string[];
  duplicateHeaders: string[];
  rows: string[][];
  delimiter: CsvDelimiter;
  issues: CsvParseIssue[];
}

const DELIMITER_CANDIDATES: CsvDelimiter[] = [',', ';', '\t'];

function stripUtf8Bom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

function detectDelimiter(sample: string): CsvDelimiter {
  const firstLine = sample.split(/\r\n|\n|\r/)[0] ?? sample;
  let best: CsvDelimiter = ',';
  let bestScore = -1;
  for (const d of DELIMITER_CANDIDATES) {
    const fields = parseCsvLine(firstLine, d);
    if (fields.length > bestScore) {
      bestScore = fields.length;
      best = d;
    }
  }
  return best;
}

function parseCsvLine(line: string, delimiter: CsvDelimiter): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * RFC 4180-style CSV parser with quoted fields, embedded delimiters/newlines, and BOM handling.
 */
export function parseCsvText(text: string, options: CsvParseOptions = {}): CsvParseResult {
  const normalized = options.stripBom !== false ? stripUtf8Bom(text) : text;
  const delimiter =
    options.delimiter && options.delimiter !== 'auto'
      ? options.delimiter
      : detectDelimiter(normalized.slice(0, 4096));

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let rowStart = 0;

  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      if (normalized[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '' || i > rowStart) {
        rows.push(row);
      }
      row = [];
      rowStart = i + 1;
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '' || i > rowStart) {
        rows.push(row);
      }
      row = [];
      rowStart = i + 1;
    } else {
      field += ch;
    }
  }

  if (inQuotes) {
    row.push(field);
    rows.push(row);
  } else if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const issues: CsvParseIssue[] = [];
  if (rows.length === 0) {
    issues.push({ kind: 'empty_file', message: 'CSV file is empty.' });
    return {
      headers: [],
      rawHeaders: [],
      duplicateHeaders: [],
      rows: [],
      delimiter,
      issues,
    };
  }

  const rawHeaders = rows[0].map((h) => h.trim());
  const seen = new Map<string, number>();
  const duplicateHeaders: string[] = [];
  const headers = rawHeaders.map((header, index) => {
    const base = header || `column_${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    if (count > 0) {
      duplicateHeaders.push(base);
      return `${base}_${count + 1}`;
    }
    return base;
  });

  const dataRows = rows.slice(1);
  const width = headers.length;
  dataRows.forEach((dataRow, idx) => {
    if (dataRow.length !== width) {
      issues.push({
        kind: 'row_width_mismatch',
        message: `Row ${idx + 2} has ${dataRow.length} fields; expected ${width}.`,
        row: idx + 2,
      });
    }
  });

  if (duplicateHeaders.length > 0) {
    issues.push({
      kind: 'duplicate_header',
      message: `Duplicate column headers renamed: ${[...new Set(duplicateHeaders)].join(', ')}.`,
    });
  }

  return {
    headers,
    rawHeaders,
    duplicateHeaders: [...new Set(duplicateHeaders)],
    rows: dataRows,
    delimiter,
    issues,
  };
}

export function truncateCsvPreview(rows: string[][], maxRows: number): string[][] {
  return rows.slice(0, maxRows);
}
