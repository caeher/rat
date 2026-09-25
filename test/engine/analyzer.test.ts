import { describe, it, expect } from 'vitest';
import { parse } from '@/lib/engine/parser';
import { analyze } from '@/lib/engine/analyzer';
import { RelationSchema } from '@/lib/engine/types';

describe('Relational Algebra Semantic Analyzer & Type Checker', () => {
  const employeeSchema: RelationSchema = {
    name: 'Employees',
    attributes: [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'salary', type: 'number' },
      { name: 'dept_id', type: 'number' },
      { name: 'is_active', type: 'boolean' },
    ],
  };

  const departmentSchema: RelationSchema = {
    name: 'Departments',
    attributes: [
      { name: 'dept_id', type: 'number' },
      { name: 'dept_name', type: 'string' },
      { name: 'location', type: 'string' },
    ],
  };

  const projectSchema: RelationSchema = {
    name: 'Projects',
    attributes: [
      { name: 'proj_id', type: 'number' },
      { name: 'proj_name', type: 'string' },
      { name: 'budget', type: 'number' },
    ],
  };

  const schemas = {
    Employees: employeeSchema,
    Departments: departmentSchema,
    Projects: projectSchema,
  };

  describe('Relation & Attribute Resolution', () => {
    it('infers schema for valid relation reference', () => {
      const { ast } = parse('Employees');
      const { typedAST, diagnostics, inferredSchema } = analyze(ast!, schemas);

      expect(diagnostics).toHaveLength(0);
      expect(typedAST).toBeDefined();
      expect(inferredSchema?.name).toBe('Employees');
      expect(inferredSchema?.attributes).toHaveLength(5);
    });

    it('emits E_UNRESOLVED_RELATION with did-you-mean suggestion for misspelled relation', () => {
      const { ast } = parse('Employe');
      const { diagnostics } = analyze(ast!, schemas);

      expect(diagnostics.some((d) => d.code === 'E_UNRESOLVED_RELATION')).toBe(true);
      const unresolvedDiag = diagnostics.find((d) => d.code === 'E_UNRESOLVED_RELATION');
      expect(unresolvedDiag?.message).toContain("Relation 'Employe' does not exist");
      expect(unresolvedDiag?.suggestion?.replacement).toBe('Employees');
    });

    it('emits E_UNRESOLVED_ATTRIBUTE with did-you-mean suggestion in projection', () => {
      const { ast } = parse('π slary ( Employees )');
      const { diagnostics } = analyze(ast!, schemas);

      expect(diagnostics.some((d) => d.code === 'E_UNRESOLVED_ATTRIBUTE')).toBe(true);
      const diag = diagnostics.find((d) => d.code === 'E_UNRESOLVED_ATTRIBUTE');
      expect(diag?.suggestion?.replacement).toBe('salary');
    });

    it('emits E_DUPLICATE_ATTRIBUTE warning on duplicate projected attributes', () => {
      const { ast } = parse('π name, salary, name ( Employees )');
      const { diagnostics } = analyze(ast!, schemas);

      expect(diagnostics.some((d) => d.code === 'E_DUPLICATE_ATTRIBUTE')).toBe(true);
    });
  });

  describe('Ambiguity Detection Across Joins', () => {
    it('emits E_AMBIGUOUS_ATTRIBUTE when referencing common column without qualification in join predicate', () => {
      // Both Employees and Departments have dept_id
      const { ast } = parse('Employees ⋈[dept_id = 1] Departments');
      const { diagnostics } = analyze(ast!, schemas);

      expect(diagnostics.some((d) => d.code === 'E_AMBIGUOUS_ATTRIBUTE')).toBe(true);
      const diag = diagnostics.find((d) => d.code === 'E_AMBIGUOUS_ATTRIBUTE');
      expect(diag?.message).toContain("Attribute 'dept_id' is ambiguous");
    });

    it('accepts qualified attribute references without ambiguity error', () => {
      const { ast } = parse('Employees ⋈[Employees.dept_id = Departments.dept_id] Departments');
      const { diagnostics } = analyze(ast!, schemas);

      expect(diagnostics.some((d) => d.code === 'E_AMBIGUOUS_ATTRIBUTE')).toBe(false);
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('Predicate Operand Type Checking & 3VL', () => {
    it('emits E_TYPE_MISMATCH when comparing incompatible types (e.g. number with string)', () => {
      const { ast } = parse("σ salary > 'expensive' ( Employees )");
      const { diagnostics } = analyze(ast!, schemas);

      expect(diagnostics.some((d) => d.code === 'E_TYPE_MISMATCH')).toBe(true);
      const diag = diagnostics.find((d) => d.code === 'E_TYPE_MISMATCH');
      expect(diag?.message).toContain("Cannot compare incompatible types 'number' and 'string'");
    });

    it('emits E_TYPE_MISMATCH when using ordering comparisons on boolean attributes', () => {
      const { ast } = parse('σ is_active > TRUE ( Employees )');
      const { diagnostics } = analyze(ast!, schemas);

      expect(diagnostics.some((d) => d.code === 'E_TYPE_MISMATCH')).toBe(true);
    });

    it('emits W_POSSIBLE_NULL_FILTER warning when comparing with NULL literal', () => {
      const { ast } = parse('σ salary = NULL ( Employees )');
      const { diagnostics } = analyze(ast!, schemas);

      expect(diagnostics.some((d) => d.code === 'W_POSSIBLE_NULL_FILTER')).toBe(true);
    });
  });

  describe('Rename Validation', () => {
    it('emits E_INVALID_RENAME_ARITY when positional rename count does not match schema degree', () => {
      const { ast } = parse('ρ E(id, name) ( Employees )'); // Employees has 5 attributes
      const { diagnostics } = analyze(ast!, schemas);

      expect(diagnostics.some((d) => d.code === 'E_INVALID_RENAME_ARITY')).toBe(true);
    });

    it('emits E_UNRESOLVED_ATTRIBUTE when mapped rename targets a non-existent attribute', () => {
      const { ast } = parse('ρ[nonexistent -> new_col](Employees)');
      const { diagnostics } = analyze(ast!, schemas);

      expect(diagnostics.some((d) => d.code === 'E_UNRESOLVED_ATTRIBUTE')).toBe(true);
    });
  });

  describe('Schema & Nullability Inference', () => {
    it('infers natural join schema with common attribute ordered first and deduplicated', () => {
      const { ast } = parse('Employees ⋈ Departments');
      const { inferredSchema, diagnostics } = analyze(ast!, schemas);

      expect(diagnostics).toHaveLength(0);
      expect(inferredSchema?.attributes.map((a) => a.name)).toEqual([
        'dept_id',
        'id',
        'name',
        'salary',
        'is_active',
        'dept_name',
        'location',
      ]);
    });

    it('propagates nullable flags correctly on outer joins', () => {
      const { ast: leftAst } = parse('Employees ⟕ Departments');
      const { inferredSchema: leftSchema } = analyze(leftAst!, schemas);
      expect(leftSchema?.attributes.find((a) => a.name === 'name')?.nullable).toBeFalsy();
      expect(leftSchema?.attributes.find((a) => a.name === 'dept_name')?.nullable).toBe(true);

      const { ast: fullAst } = parse('Employees ⟗ Departments');
      const { inferredSchema: fullSchema } = analyze(fullAst!, schemas);
      expect(fullSchema?.attributes.every((a) => a.nullable === true)).toBe(true);
    });
  });

  describe('Set Operations & Division Compatibility', () => {
    it('emits E_UNION_INCOMPATIBLE_ARITY when unioning relations with different degrees', () => {
      const { ast } = parse('Employees ∪ Departments');
      const { diagnostics } = analyze(ast!, schemas);

      expect(diagnostics.some((d) => d.code === 'E_UNION_INCOMPATIBLE_ARITY')).toBe(true);
    });

    it('emits E_UNION_INCOMPATIBLE_TYPE when unioning relations with differing column types', () => {
      const { ast } = parse('( π name ( Employees ) ) ∪ ( π salary ( Employees ) )');
      const { diagnostics } = analyze(ast!, schemas);

      expect(diagnostics.some((d) => d.code === 'E_UNION_INCOMPATIBLE_TYPE')).toBe(true);
    });

    it('emits E_DIVISION_NOT_SUBSET when divisor attributes are not present in dividend', () => {
      const { ast } = parse('Employees ÷ ( π proj_name ( Projects ) )');
      const { diagnostics } = analyze(ast!, schemas);

      expect(diagnostics.some((d) => d.code === 'E_DIVISION_NOT_SUBSET')).toBe(true);
    });
  });
});
