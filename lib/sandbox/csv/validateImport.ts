import { SANDBOX_LIMITS } from '../constants';
import { validateIdentifier } from '../identifiers';
import { parseCellInput } from '../validateCell';
import type { SandboxAttribute } from '../types';
import type { SandboxAttributeType } from '../constants';
import type { Tuple } from '@/lib/engine/types';

export interface CsvColumnMapping {
  /** CSV header index; -1 to skip column. */
  sourceIndex: number;
  attributeName: string;
  type: SandboxAttributeType;
  nullable: boolean;
  /** When true, empty cells become "" instead of NULL on nullable string columns. */
  treatEmptyAsEmptyString: boolean;
}

export interface CsvCellError {
  row: number;
  column: string;
  message: string;
  raw: string;
}

export interface CsvImportValidationResult {
  ok: true;
  attributes: SandboxAttribute[];
  rows: Tuple[];
}

export interface CsvImportValidationFailure {
  ok: false;
  errors: CsvCellError[];
  limitError?: string;
}

export type CsvImportValidation = CsvImportValidationResult | CsvImportValidationFailure;

function normalizeCellRaw(raw: string, mapping: CsvColumnMapping): string {
  const trimmed = raw.trim();
  if (trimmed === '' && mapping.treatEmptyAsEmptyString && mapping.type === 'string') {
    return ' ';
  }
  return raw;
}

export function validateCsvImport(
  headers: string[],
  dataRows: string[][],
  mappings: CsvColumnMapping[],
  relationName: string
): CsvImportValidation {
  const nameCheck = validateIdentifier(relationName, 'relation', SANDBOX_LIMITS.maxRelationNameLength);
  if (!nameCheck.valid) {
    return {
      ok: false,
      errors: [],
      limitError: nameCheck.message ?? 'Invalid relation name.',
    };
  }

  const activeMappings = mappings.filter((m) => m.sourceIndex >= 0);
  if (activeMappings.length === 0) {
    return { ok: false, errors: [], limitError: 'Select at least one column to import.' };
  }

  if (activeMappings.length > SANDBOX_LIMITS.maxAttributesPerRelation) {
    return {
      ok: false,
      errors: [],
      limitError: `At most ${SANDBOX_LIMITS.maxAttributesPerRelation} columns per relation.`,
    };
  }

  if (dataRows.length > SANDBOX_LIMITS.maxRowsPerRelation) {
    return {
      ok: false,
      errors: [],
      limitError: `At most ${SANDBOX_LIMITS.maxRowsPerRelation} rows per relation.`,
    };
  }

  const attrNames = new Set<string>();
  for (const mapping of activeMappings) {
    const idCheck = validateIdentifier(
      mapping.attributeName,
      'attribute',
      SANDBOX_LIMITS.maxAttributeNameLength
    );
    if (!idCheck.valid) {
      return {
        ok: false,
        errors: [],
        limitError: idCheck.message ?? `Invalid attribute name "${mapping.attributeName}".`,
      };
    }
    if (attrNames.has(mapping.attributeName)) {
      return {
        ok: false,
        errors: [],
        limitError: `Duplicate attribute name "${mapping.attributeName}".`,
      };
    }
    attrNames.add(mapping.attributeName);
  }

  const attributes: SandboxAttribute[] = activeMappings.map((m) => ({
    name: m.attributeName,
    type: m.type,
    nullable: m.nullable,
  }));

  const errors: CsvCellError[] = [];
  const rowTuples: Tuple[] = [];

  dataRows.forEach((dataRow, rowIdx) => {
    const tuple: Tuple = {};
    for (const mapping of activeMappings) {
      const raw = dataRow[mapping.sourceIndex] ?? '';
      const normalized = normalizeCellRaw(raw, mapping);
      const parsed = parseCellInput(normalized, mapping.type, mapping.nullable);
      if (!parsed.ok) {
        errors.push({
          row: rowIdx + 2,
          column: mapping.attributeName,
          message: parsed.message,
          raw,
        });
      } else {
        tuple[mapping.attributeName] = parsed.value;
      }
    }
    rowTuples.push(tuple);
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, attributes, rows: rowTuples };
}

export function buildDefaultMappings(
  headers: string[],
  guesses: Array<{ type: SandboxAttributeType; nullable: boolean }>
): CsvColumnMapping[] {
  return headers.map((header, index) => ({
    sourceIndex: index,
    attributeName: header,
    type: guesses[index]?.type ?? 'string',
    nullable: guesses[index]?.nullable ?? true,
    treatEmptyAsEmptyString: false,
  }));
}
