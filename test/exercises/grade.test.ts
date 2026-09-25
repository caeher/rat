import { describe, expect, it } from 'vitest';
import { getExercise } from '@/lib/exercises/catalog';
import { gradeExerciseAttempt } from '@/lib/exercises/grade';

describe('exercise grading', () => {
  it('accepts equivalent expressions with different syntax', () => {
    const exercise = getExercise('ex-begin-projection');
    expect(exercise).toBeDefined();
    const alt = 'pi dept_name ( Departments )';
    const result = gradeExerciseAttempt(alt, exercise!);
    expect(result.status).toBe('correct');
  });

  it('rejects incorrect results with actionable feedback', () => {
    const exercise = getExercise('ex-begin-projection');
    expect(exercise).toBeDefined();
    const wrong = 'π dept_id ( Departments )';
    const result = gradeExerciseAttempt(wrong, exercise!);
    expect(result.status).toBe('incorrect');
    expect(result.message.length).toBeGreaterThan(10);
    expect(result.rowCountYours).toBeDefined();
  });

  it('preserves invalid attempts with parse errors', () => {
    const exercise = getExercise('ex-begin-selection');
    expect(exercise).toBeDefined();
    const result = gradeExerciseAttempt('σ bogus ( Nope )', exercise!);
    expect(result.status).toBe('invalid');
  });
});
