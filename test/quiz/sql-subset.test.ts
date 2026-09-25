import { describe, expect, it } from 'vitest';
import { validateLearnerSql } from '@/lib/quiz/sql-subset';

describe('learner SQL subset', () => {
  it('accepts a single SELECT', () => {
    const result = validateLearnerSql('SELECT name FROM Employees');
    expect(result.ok).toBe(true);
    expect(result.normalizedSql).toBe('SELECT name FROM Employees');
  });

  it('rejects multi-statement scripts', () => {
    const result = validateLearnerSql('SELECT 1; SELECT 2');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('multi_statement');
  });

  it('rejects mutating statements', () => {
    const result = validateLearnerSql('DELETE FROM Students');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('mutating');
  });

  it('rejects INSERT even when disguised after comment', () => {
    const result = validateLearnerSql('/* x */ INSERT INTO Students VALUES (1)');
    expect(result.ok).toBe(false);
  });
});
