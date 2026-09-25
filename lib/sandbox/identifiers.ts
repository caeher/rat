import { SANDBOX_LIMITS } from './constants';

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const RESERVED = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'AND',
  'OR',
  'NOT',
  'NULL',
  'TRUE',
  'FALSE',
  'AS',
  'JOIN',
  'ON',
  'NATURAL',
  'SIGMA',
  'PI',
  'RHO',
]);

export interface IdentifierValidation {
  valid: boolean;
  message?: string;
}

export function validateIdentifier(
  raw: string,
  kind: 'relation' | 'attribute' | 'schema_set',
  maxLength: number = SANDBOX_LIMITS.maxRelationNameLength
): IdentifierValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, message: `${kind === 'schema_set' ? 'Schema' : kind} name is required.` };
  }
  if (trimmed.length > maxLength) {
    return {
      valid: false,
      message: `Name must be at most ${maxLength} characters.`,
    };
  }
  if (!IDENTIFIER_PATTERN.test(trimmed)) {
    return {
      valid: false,
      message:
        'Use only letters, digits, and underscores; must start with a letter or underscore (e.g. dept_id, Employees).',
    };
  }
  if (RESERVED.has(trimmed.toUpperCase())) {
    return {
      valid: false,
      message: `'${trimmed}' is a reserved keyword. Choose a different name.`,
    };
  }
  return { valid: true };
}

export function findDuplicateNames(names: string[], candidate: string, excludeIndex?: number): string | null {
  const normalized = candidate.trim();
  for (let i = 0; i < names.length; i++) {
    if (excludeIndex !== undefined && i === excludeIndex) continue;
    if (names[i] === normalized) {
      return names[i];
    }
  }
  return null;
}
