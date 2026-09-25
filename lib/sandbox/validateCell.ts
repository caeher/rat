import type { AttributeType, TupleValue } from '@/lib/engine/types';
import type { SandboxAttributeType } from './constants';
import type { CellDisplayKind, ParseCellOutcome } from './types';

const NULL_LITERALS = new Set(['null', '∅']);

export function classifyCellDisplay(
  value: TupleValue,
  type: SandboxAttributeType
): CellDisplayKind {
  if (value === null) return 'null';
  if (type === 'string' && value === '') return 'empty_string';
  if (type === 'number' && value === 0) return 'zero';
  return 'value';
}

export function formatCellForEdit(value: TupleValue, type: SandboxAttributeType): string {
  if (value === null) return '';
  if (type === 'boolean') return value ? 'true' : 'false';
  if (type === 'date' && typeof value === 'string') return value;
  return String(value);
}

export function parseCellInput(
  raw: string,
  attributeType: SandboxAttributeType,
  nullable: boolean
): ParseCellOutcome {
  const trimmed = raw.trim();

  if (trimmed === '' && nullable) {
    return { ok: true, value: null };
  }

  if (trimmed === '' && !nullable) {
    return {
      ok: false,
      message: 'This column does not allow NULL. Enter a value or use an empty string literal for text columns.',
    };
  }

  if (NULL_LITERALS.has(trimmed.toLowerCase())) {
    if (!nullable) {
      return { ok: false, message: 'NULL is not allowed for this column.' };
    }
    return { ok: true, value: null };
  }

  switch (attributeType) {
    case 'string':
      return { ok: true, value: raw };
    case 'number': {
      if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
        return {
          ok: false,
          message: 'Enter a valid number (e.g. 42, -3.5, 1e6).',
        };
      }
      const num = Number(trimmed);
      if (!Number.isFinite(num)) {
        return { ok: false, message: 'Number is out of range.' };
      }
      return { ok: true, value: num };
    }
    case 'boolean': {
      const lower = trimmed.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        return { ok: true, value: true };
      }
      if (lower === 'false' || lower === '0' || lower === 'no') {
        return { ok: true, value: false };
      }
      return { ok: false, message: 'Enter true or false.' };
    }
    case 'date': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return {
          ok: false,
          message: 'Use ISO date format YYYY-MM-DD (e.g. 2024-01-15).',
        };
      }
      const [y, m, d] = trimmed.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      if (
        dt.getUTCFullYear() !== y ||
        dt.getUTCMonth() !== m - 1 ||
        dt.getUTCDate() !== d
      ) {
        return { ok: false, message: 'Date is not valid.' };
      }
      return { ok: true, value: trimmed };
    }
    default:
      return { ok: false, message: 'Unsupported column type.' };
  }
}

export function isValueCompatibleWithType(
  value: TupleValue,
  fromType: SandboxAttributeType,
  toType: SandboxAttributeType
): boolean {
  if (value === null) return true;
  if (fromType === toType) return true;

  if (toType === 'string') {
    return true;
  }

  if (fromType === 'string' && toType === 'number') {
    return typeof value === 'string' && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value.trim());
  }

  if (fromType === 'string' && toType === 'boolean') {
    const lower = String(value).toLowerCase();
    return ['true', 'false', '1', '0', 'yes', 'no'].includes(lower);
  }

  if (fromType === 'string' && toType === 'date') {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  return false;
}

export function coerceValueToType(
  value: TupleValue,
  toType: SandboxAttributeType
): TupleValue | null {
  if (value === null) return null;
  const parsed = parseCellInput(formatCellForEdit(value, toType), toType, true);
  if (!parsed.ok) return null;
  return parsed.value;
}

export function engineAttributeType(type: SandboxAttributeType): AttributeType {
  return type;
}
