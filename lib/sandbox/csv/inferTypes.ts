import type { SandboxAttributeType } from '../constants';
import { SUPPORTED_ATTRIBUTE_TYPES } from '../constants';

export interface ColumnTypeGuess {
  type: SandboxAttributeType;
  nullable: boolean;
  confidence: 'high' | 'low';
}

const NULL_TOKENS = new Set(['', 'null', '∅', 'na', 'n/a']);

function looksLikeNumber(value: string): boolean {
  return /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value.trim());
}

function looksLikeBoolean(value: string): boolean {
  const lower = value.trim().toLowerCase();
  return ['true', 'false', '0', '1', 'yes', 'no'].includes(lower);
}

function looksLikeDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

export function inferColumnTypes(
  rows: string[][],
  columnCount: number
): ColumnTypeGuess[] {
  const guesses: ColumnTypeGuess[] = [];

  for (let col = 0; col < columnCount; col += 1) {
    let nullCount = 0;
    let numberCount = 0;
    let boolCount = 0;
    let dateCount = 0;
    let stringCount = 0;
    let sampleCount = 0;

    for (const row of rows) {
      const raw = row[col] ?? '';
      const trimmed = raw.trim();
      if (NULL_TOKENS.has(trimmed.toLowerCase()) || trimmed === '') {
        nullCount += 1;
        continue;
      }
      sampleCount += 1;
      if (looksLikeBoolean(trimmed)) boolCount += 1;
      else if (looksLikeNumber(trimmed)) numberCount += 1;
      else if (looksLikeDate(trimmed)) dateCount += 1;
      else stringCount += 1;
    }

    const nullable = nullCount > 0;

    if (sampleCount === 0) {
      guesses.push({ type: 'string', nullable: true, confidence: 'low' });
      continue;
    }

    if (boolCount === sampleCount) {
      guesses.push({ type: 'boolean', nullable, confidence: 'high' });
    } else if (numberCount === sampleCount) {
      guesses.push({ type: 'number', nullable, confidence: 'high' });
    } else if (dateCount === sampleCount) {
      guesses.push({ type: 'date', nullable, confidence: 'high' });
    } else if (numberCount > 0 && stringCount === 0) {
      guesses.push({ type: 'number', nullable, confidence: 'low' });
    } else {
      guesses.push({ type: 'string', nullable, confidence: 'high' });
    }
  }

  return guesses;
}

export function isSupportedAttributeType(value: string): value is SandboxAttributeType {
  return (SUPPORTED_ATTRIBUTE_TYPES as readonly string[]).includes(value);
}
