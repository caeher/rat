import { describe, it, expect } from 'vitest';
import { validateExpression, parseExpression, analyzeAST } from '@/lib/engine/validator';
import { RelationSchema } from '@/lib/engine/types';

describe('Relational Algebra Validation API', () => {
  const employeeSchema: RelationSchema = {
    name: 'Employees',
    attributes: [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'salary', type: 'number' },
      { name: 'dept_id', type: 'number' },
    ],
  };

  const departmentSchema: RelationSchema = {
    name: 'Departments',
    attributes: [
      { name: 'dept_id', type: 'number' },
      { name: 'dept_name', type: 'string' },
    ],
  };

  const schemas = {
    Employees: employeeSchema,
    Departments: departmentSchema,
  };

  describe('validateExpression', () => {
    it('validates a complete, semantically sound complex query', () => {
      const query =
        'π name, dept_name, salary ( σ salary > 70000 ( Employees ⋈ Departments ) )';
      const result = validateExpression(query, schemas);

      expect(result.valid).toBe(true);
      expect(result.isIncomplete).toBe(false);
      expect(result.ast).toBeDefined();
      expect(result.schema).toBeDefined();
      expect(result.schema?.attributes.map((a) => a.name)).toEqual([
        'name',
        'dept_name',
        'salary',
      ]);
      expect(result.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0);
    });

    it('handles empty input cleanly with isIncomplete: true', () => {
      const result = validateExpression('   ', schemas);
      expect(result.valid).toBe(false);
      expect(result.isIncomplete).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('identifies incomplete live typing without marking as fatal error', () => {
      // User typing halfway through a projection
      const partial1 = 'π name, ';
      const result1 = validateExpression(partial1, schemas);
      expect(result1.valid).toBe(false);
      expect(result1.isIncomplete).toBe(true);

      // User typing halfway through an open join
      const partial2 = 'Employees ⋈ ';
      const result2 = validateExpression(partial2, schemas);
      expect(result2.valid).toBe(false);
      expect(result2.isIncomplete).toBe(true);
    });

    it('identifies complete but semantically invalid expressions', () => {
      // Unknown relation
      const invalidQuery = 'π name ( UnknownTable )';
      const result = validateExpression(invalidQuery, schemas);

      expect(result.valid).toBe(false);
      expect(result.isIncomplete).toBe(false);
      expect(result.diagnostics.some((d) => d.code === 'E_UNRESOLVED_RELATION')).toBe(true);
    });

    it('identifies type mismatch in predicate during live validation', () => {
      const query = "σ salary > 'high' ( Employees )";
      const result = validateExpression(query, schemas);

      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.code === 'E_TYPE_MISMATCH')).toBe(true);
    });
  });

  describe('Convenience Helper APIs', () => {
    it('parseExpression produces AST from valid string', () => {
      const { ast, diagnostics } = parseExpression('Employees ∪ Employees');
      expect(diagnostics).toHaveLength(0);
      expect(ast?.type).toBe('union');
    });

    it('analyzeAST produces typed schema from AST', () => {
      const { ast } = parseExpression('Employees');
      const { inferredSchema, diagnostics } = analyzeAST(ast!, schemas);
      expect(diagnostics).toHaveLength(0);
      expect(inferredSchema?.name).toBe('Employees');
    });
  });
});
