import { describe, expect, it } from 'vitest';
import { findDuplicateNames, validateIdentifier } from '@/lib/sandbox/identifiers';

describe('sandbox identifiers', () => {
  it('accepts valid relation names', () => {
    expect(validateIdentifier('Employees', 'relation').valid).toBe(true);
    expect(validateIdentifier('dept_id', 'attribute').valid).toBe(true);
  });

  it('rejects invalid identifiers', () => {
    expect(validateIdentifier('1bad', 'relation').valid).toBe(false);
    expect(validateIdentifier('has space', 'relation').valid).toBe(false);
    expect(validateIdentifier('SELECT', 'relation').valid).toBe(false);
  });

  it('detects duplicate names', () => {
    expect(findDuplicateNames(['a', 'b'], 'c')).toBeNull();
    expect(findDuplicateNames(['a', 'b'], 'b')).toBe('b');
  });
});
