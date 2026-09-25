import { describe, it, expect } from 'vitest';
import { buildSchemaSuggestions, shouldPreferAttributes } from '@/lib/editor/schemaSuggestions';
import type { RelationSchema } from '@/lib/engine/types';

const schemas: Record<string, RelationSchema> = {
  Employees: {
    name: 'Employees',
    attributes: [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'dept_id', type: 'number' },
    ],
  },
  Departments: {
    name: 'Departments',
    attributes: [
      { name: 'dept_id', type: 'number' },
      { name: 'dept_name', type: 'string' },
    ],
  },
};

describe('schemaSuggestions', () => {
  it('suggests relation names from the active snapshot', () => {
    const suggestions = buildSchemaSuggestions({
      expression: '',
      cursorOffset: 0,
      prefix: 'Emp',
      schemas,
    });
    expect(suggestions.some((s) => s.kind === 'relation' && s.insert === 'Employees')).toBe(true);
  });

  it('disambiguates duplicate attribute names with qualifiers', () => {
    const expression = 'Employees ⋈ Departments';
    const suggestions = buildSchemaSuggestions({
      expression,
      cursorOffset: expression.length,
      prefix: 'dept',
      schemas,
      preferAttributes: true,
    });
    const labels = suggestions.filter((s) => s.kind === 'attribute').map((s) => s.label);
    expect(labels.some((l) => l.includes('dept_id'))).toBe(true);
  });

  it('detects projection contexts for attribute-first completion', () => {
    expect(shouldPreferAttributes('π na', 4)).toBe(true);
    expect(shouldPreferAttributes('Employees', 9)).toBe(false);
  });
});
