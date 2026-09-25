import { describe, it, expect } from 'vitest';
import {
  CONTRACT_VERSION,
  RelationSchema,
  RelationData,
  Tuple,
} from '@/lib/engine/types';
import {
  OPERATOR_CONTRACTS,
  areCellValuesEqual,
  deduplicateTuples,
  areRelationsEqual,
  evaluate3VLAnd,
  evaluate3VLOr,
  evaluate3VLNot,
  checkUnionCompatibility,
  checkDivisionCompatibility,
  inferNaturalJoinSchema,
  inferOuterJoinSchema,
  inferProjectionSchema,
  inferRenameSchema,
} from '@/lib/engine/contract';

describe('Relational Algebra Contract v1.0.0', () => {
  it('exports CONTRACT_VERSION = 1.0.0', () => {
    expect(CONTRACT_VERSION).toBe('1.0.0');
  });

  describe('Operator Contract Metadata & Aliases', () => {
    it('covers all fundamental and derived operators including outer joins and division', () => {
      const requiredOperators = [
        'selection',
        'projection',
        'rename',
        'cartesian_product',
        'natural_join',
        'theta_join',
        'left_join',
        'right_join',
        'full_join',
        'union',
        'difference',
        'intersection',
        'division',
      ];

      for (const op of requiredOperators) {
        expect(OPERATOR_CONTRACTS[op as keyof typeof OPERATOR_CONTRACTS]).toBeDefined();
        expect(OPERATOR_CONTRACTS[op as keyof typeof OPERATOR_CONTRACTS].symbol).toBeTruthy();
        expect(OPERATOR_CONTRACTS[op as keyof typeof OPERATOR_CONTRACTS].asciiAliases.length).toBeGreaterThan(0);
        expect(OPERATOR_CONTRACTS[op as keyof typeof OPERATOR_CONTRACTS].latexAliases.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Set Semantics & Duplicate Elimination', () => {
    const employeeSchema: RelationSchema = {
      name: 'Employees',
      attributes: [
        { name: 'id', type: 'number' },
        { name: 'name', type: 'string' },
        { name: 'salary', type: 'number' },
      ],
    };

    it('correctly eliminates duplicate tuples regardless of insertion order', () => {
      const rawTuples: Tuple[] = [
        { id: 1, name: 'Alice', salary: 90000 },
        { id: 2, name: 'Bob', salary: 60000 },
        { id: 1, name: 'Alice', salary: 90000 }, // Duplicate
        { id: 3, name: 'Charlie', salary: 75000 },
        { id: 2, name: 'Bob', salary: 60000 }, // Duplicate
      ];

      const distinct = deduplicateTuples(rawTuples, employeeSchema);
      expect(distinct).toHaveLength(3);
      expect(distinct).toEqual([
        { id: 1, name: 'Alice', salary: 90000 },
        { id: 2, name: 'Bob', salary: 60000 },
        { id: 3, name: 'Charlie', salary: 75000 },
      ]);
    });

    it('treats NULL == NULL in set operations and duplicate elimination', () => {
      expect(areCellValuesEqual(null, null, true)).toBe(true);
      expect(areCellValuesEqual(null, null, false)).toBe(false);

      const nullTuples: Tuple[] = [
        { id: 1, name: 'Alice', salary: null },
        { id: 1, name: 'Alice', salary: null }, // Duplicate with NULL
        { id: 2, name: 'Bob', salary: null },
      ];

      const distinct = deduplicateTuples(nullTuples, employeeSchema);
      expect(distinct).toHaveLength(2);
      expect(distinct).toEqual([
        { id: 1, name: 'Alice', salary: null },
        { id: 2, name: 'Bob', salary: null },
      ]);
    });

    it('evaluates relations as equal irrespective of row ordering', () => {
      const r1: RelationData = {
        schema: employeeSchema,
        tuples: [
          { id: 1, name: 'Alice', salary: 90000 },
          { id: 2, name: 'Bob', salary: 60000 },
        ],
      };

      const r2: RelationData = {
        schema: employeeSchema,
        tuples: [
          { id: 2, name: 'Bob', salary: 60000 },
          { id: 1, name: 'Alice', salary: 90000 },
        ],
      };

      expect(areRelationsEqual(r1, r2)).toBe(true);
    });

    it('detects relation inequality on differing tuples', () => {
      const r1: RelationData = {
        schema: employeeSchema,
        tuples: [{ id: 1, name: 'Alice', salary: 90000 }],
      };

      const r2: RelationData = {
        schema: employeeSchema,
        tuples: [{ id: 1, name: 'Alice', salary: 95000 }],
      };

      expect(areRelationsEqual(r1, r2)).toBe(false);
    });
  });

  describe('Three-Valued Logic (3VL)', () => {
    it('evaluates 3VL AND truth table correctly', () => {
      expect(evaluate3VLAnd(true, true)).toBe(true);
      expect(evaluate3VLAnd(true, false)).toBe(false);
      expect(evaluate3VLAnd(false, null)).toBe(false);
      expect(evaluate3VLAnd(true, null)).toBe(null); // UNKNOWN
      expect(evaluate3VLAnd(null, null)).toBe(null);
    });

    it('evaluates 3VL OR truth table correctly', () => {
      expect(evaluate3VLOr(true, false)).toBe(true);
      expect(evaluate3VLOr(true, null)).toBe(true);
      expect(evaluate3VLOr(false, false)).toBe(false);
      expect(evaluate3VLOr(false, null)).toBe(null); // UNKNOWN
      expect(evaluate3VLOr(null, null)).toBe(null);
    });

    it('evaluates 3VL NOT truth table correctly', () => {
      expect(evaluate3VLNot(true)).toBe(false);
      expect(evaluate3VLNot(false)).toBe(true);
      expect(evaluate3VLNot(null)).toBe(null); // UNKNOWN
    });
  });

  describe('Union Compatibility Checks', () => {
    const s1: RelationSchema = {
      name: 'Students',
      attributes: [
        { name: 'id', type: 'number' },
        { name: 'name', type: 'string' },
      ],
    };

    const s2: RelationSchema = {
      name: 'Instructors',
      attributes: [
        { name: 'instructor_id', type: 'number' },
        { name: 'full_name', type: 'string' },
      ],
    };

    const s3DifferentArity: RelationSchema = {
      name: 'Courses',
      attributes: [
        { name: 'course_id', type: 'number' },
        { name: 'title', type: 'string' },
        { name: 'credits', type: 'number' },
      ],
    };

    const s4DifferentType: RelationSchema = {
      name: 'Scores',
      attributes: [
        { name: 'id', type: 'number' },
        { name: 'score', type: 'number' }, // number instead of string
      ],
    };

    it('approves compatible schemas with matching arity and types', () => {
      const res = checkUnionCompatibility(s1, s2);
      expect(res.compatible).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('rejects union compatibility on arity mismatch with E_UNION_INCOMPATIBLE_ARITY', () => {
      const res = checkUnionCompatibility(s1, s3DifferentArity);
      expect(res.compatible).toBe(false);
      expect(res.diagnostic).toBe('E_UNION_INCOMPATIBLE_ARITY');
      expect(res.error).toContain('degree');
    });

    it('rejects union compatibility on type mismatch with E_UNION_INCOMPATIBLE_TYPE', () => {
      const res = checkUnionCompatibility(s1, s4DifferentType);
      expect(res.compatible).toBe(false);
      expect(res.diagnostic).toBe('E_UNION_INCOMPATIBLE_TYPE');
      expect(res.error).toContain('does not match');
    });
  });

  describe('Relational Division Validation & Edge Cases', () => {
    const enrollmentSchema: RelationSchema = {
      name: 'Enrollments',
      attributes: [
        { name: 'student_id', type: 'number' },
        { name: 'course_code', type: 'string' },
      ],
    };

    const coreCoursesSchema: RelationSchema = {
      name: 'CoreCourses',
      attributes: [{ name: 'course_code', type: 'string' }],
    };

    const nonSubsetSchema: RelationSchema = {
      name: 'Degrees',
      attributes: [{ name: 'degree_name', type: 'string' }],
    };

    it('computes quotient attributes for valid division', () => {
      const res = checkDivisionCompatibility(enrollmentSchema, coreCoursesSchema);
      expect(res.compatible).toBe(true);
      expect(res.quotientAttributes).toEqual([
        { name: 'student_id', type: 'number' },
      ]);
    });

    it('handles empty divisor schema as vacuous truth (yielding full dividend schema)', () => {
      const emptyDivisor: RelationSchema = {
        name: 'EmptyDivisor',
        attributes: [],
      };

      const res = checkDivisionCompatibility(enrollmentSchema, emptyDivisor);
      expect(res.compatible).toBe(true);
      expect(res.quotientAttributes).toEqual(enrollmentSchema.attributes);
    });

    it('rejects division when divisor contains attributes not in dividend', () => {
      const res = checkDivisionCompatibility(enrollmentSchema, nonSubsetSchema);
      expect(res.compatible).toBe(false);
      expect(res.diagnostic).toBe('E_DIVISION_NOT_SUBSET');
    });

    it('rejects division when divisor covers all dividend attributes', () => {
      const res = checkDivisionCompatibility(enrollmentSchema, enrollmentSchema);
      expect(res.compatible).toBe(false);
      expect(res.diagnostic).toBe('E_DIVISION_EMPTY_QUOTIENT');
    });
  });

  describe('Schema Inference Operators', () => {
    const empSchema: RelationSchema = {
      name: 'Emp',
      attributes: [
        { name: 'emp_id', type: 'number' },
        { name: 'dept_id', type: 'number' },
        { name: 'name', type: 'string' },
      ],
    };

    const deptSchema: RelationSchema = {
      name: 'Dept',
      attributes: [
        { name: 'dept_id', type: 'number' },
        { name: 'dept_name', type: 'string' },
      ],
    };

    it('infers natural join schema with common columns deduplicated and ordered', () => {
      const { schema, commonAttributes } = inferNaturalJoinSchema(empSchema, deptSchema);
      expect(commonAttributes).toEqual(['dept_id']);
      expect(schema.attributes.map((a) => a.name)).toEqual([
        'dept_id',
        'emp_id',
        'name',
        'dept_name',
      ]);
    });

    it('infers outer join schema with correct nullability propagation', () => {
      const leftSchema = inferOuterJoinSchema(empSchema, deptSchema, 'left');
      expect(leftSchema.attributes.find((a) => a.name === 'emp_id')?.nullable).toBeFalsy();
      expect(leftSchema.attributes.find((a) => a.name === 'dept_name')?.nullable).toBe(true);

      const rightSchema = inferOuterJoinSchema(empSchema, deptSchema, 'right');
      expect(rightSchema.attributes.find((a) => a.name === 'emp_id')?.nullable).toBe(true);
      expect(rightSchema.attributes.find((a) => a.name === 'dept_name')?.nullable).toBeFalsy();

      const fullSchema = inferOuterJoinSchema(empSchema, deptSchema, 'full');
      expect(fullSchema.attributes.every((a) => a.nullable === true)).toBe(true);
    });

    it('infers projection schema and detects missing attributes', () => {
      const { schema, missingAttributes } = inferProjectionSchema(empSchema, [
        'name',
        'emp_id',
        'unknown_col',
      ]);

      expect(schema.attributes.map((a) => a.name)).toEqual(['name', 'emp_id']);
      expect(missingAttributes).toEqual(['unknown_col']);
    });

    it('infers rename schema for relation and attributes', () => {
      const renamed = inferRenameSchema(empSchema, 'Staff', {
        name: 'full_name',
      });

      expect(renamed.name).toBe('Staff');
      expect(renamed.attributes.map((a) => a.name)).toEqual([
        'emp_id',
        'dept_id',
        'full_name',
      ]);
    });
  });
});
