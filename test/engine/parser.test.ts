import { describe, it, expect } from 'vitest';
import { parse } from '@/lib/engine/parser';
import {
  DifferenceNode,
  DivisionNode,
  IntersectionNode,
  NaturalJoinNode,
  ProjectionNode,
  RenameAttributesNode,
  RenameRelationNode,
  SelectionNode,
  ThetaJoinNode,
  UnionNode,
} from '@/lib/engine/types';

describe('Relational Algebra Parser', () => {
  describe('Operator Precedence & Associativity', () => {
    it('enforces left-associativity on union and difference (Level 5)', () => {
      const { ast, diagnostics } = parse('R ∪ S − T');
      expect(diagnostics).toHaveLength(0);
      expect(ast?.type).toBe('difference');
      const diff = ast as DifferenceNode;
      expect(diff.left.type).toBe('union');
      expect((diff.left as UnionNode).left.type).toBe('relation');
      expect((diff.left as UnionNode).right.type).toBe('relation');
      expect(diff.right.type).toBe('relation');
    });

    it('enforces higher precedence of intersection over union (Level 4 over Level 5)', () => {
      const { ast, diagnostics } = parse('R ∪ S ∩ T');
      expect(diagnostics).toHaveLength(0);
      expect(ast?.type).toBe('union');
      const union = ast as UnionNode;
      expect(union.left.type).toBe('relation');
      expect(union.right.type).toBe('intersection');
    });

    it('enforces higher precedence of joins/cross-product over intersection and union (Level 3 over Level 4/5)', () => {
      const { ast, diagnostics } = parse('R ∪ S ⨯ T ∩ U');
      expect(diagnostics).toHaveLength(0);
      expect(ast?.type).toBe('union');
      const union = ast as UnionNode;
      expect(union.left.type).toBe('relation');
      expect(union.right.type).toBe('intersection');
      const inter = union.right as IntersectionNode;
      expect(inter.left.type).toBe('cartesian_product');
      expect(inter.right.type).toBe('relation');
    });

    it('enforces left-associativity for multiplicative and join operators', () => {
      const { ast, diagnostics } = parse('R ⨯ S ⋈ T');
      expect(diagnostics).toHaveLength(0);
      expect(ast?.type).toBe('natural_join');
      const join = ast as NaturalJoinNode;
      expect(join.left.type).toBe('cartesian_product');
      expect(join.right.type).toBe('relation');
    });
  });

  describe('Unary Operators: Selection, Projection, Rename', () => {
    it('parses bracketed selection and projection expressions', () => {
      const { ast, diagnostics } = parse(
        'π[name, salary](σ[salary > 50000](Employees))'
      );
      expect(diagnostics).toHaveLength(0);
      expect(ast?.type).toBe('projection');
      const proj = ast as ProjectionNode;
      expect(proj.attributes).toEqual(['name', 'salary']);
      expect(proj.child.type).toBe('selection');
      const sel = proj.child as SelectionNode;
      expect(typeof sel.predicate).toBe('object');
    });

    it('parses unbracketed selection and projection expressions', () => {
      const { ast, diagnostics } = parse(
        'π name, salary ( σ salary > 50000 ( Employees ) )'
      );
      expect(diagnostics).toHaveLength(0);
      expect(ast?.type).toBe('projection');
      const proj = ast as ProjectionNode;
      expect(proj.attributes).toEqual(['name', 'salary']);
      expect(proj.child.type).toBe('selection');
    });

    it('parses relation renaming with alias', () => {
      const { ast, diagnostics } = parse('ρ S ( Employees )');
      expect(diagnostics).toHaveLength(0);
      expect(ast?.type).toBe('rename_relation');
      const rename = ast as RenameRelationNode;
      expect(rename.newRelationName).toBe('S');
    });

    it('parses relation renaming with positional attribute list', () => {
      const { ast, diagnostics } = parse('ρ S(emp_id, emp_name, emp_sal) ( Employees )');
      expect(diagnostics).toHaveLength(0);
      expect(ast?.type).toBe('rename_relation');
      const rename = ast as RenameRelationNode & { positionalAttributes?: string[] };
      expect(rename.newRelationName).toBe('S');
      expect(rename.positionalAttributes).toEqual(['emp_id', 'emp_name', 'emp_sal']);
    });

    it('parses attribute rename mapping with arrows and AS', () => {
      const { ast, diagnostics } = parse(
        'ρ[name -> full_name, salary AS wage](Employees)'
      );
      expect(diagnostics).toHaveLength(0);
      expect(ast?.type).toBe('rename_attributes');
      const rename = ast as RenameAttributesNode;
      expect(rename.attributeMap).toEqual({
        name: 'full_name',
        salary: 'wage',
      });
    });
  });

  describe('Join Variants & Relational Division', () => {
    it('parses theta join with condition in brackets', () => {
      const { ast, diagnostics } = parse(
        'Employees ⋈[Employees.dept_id = Departments.dept_id] Departments'
      );
      expect(diagnostics).toHaveLength(0);
      expect(ast?.type).toBe('theta_join');
      const theta = ast as ThetaJoinNode;
      expect(theta.predicate).toBeDefined();
    });

    it('parses left outer join, right outer join, and full outer join', () => {
      const leftResult = parse('Employees ⟕ Departments');
      expect(leftResult.diagnostics).toHaveLength(0);
      expect(leftResult.ast?.type).toBe('left_join');

      const rightResult = parse('Employees right_join Departments');
      expect(rightResult.diagnostics).toHaveLength(0);
      expect(rightResult.ast?.type).toBe('right_join');

      const fullResult = parse('Employees ⟗ Departments');
      expect(fullResult.diagnostics).toHaveLength(0);
      expect(fullResult.ast?.type).toBe('full_join');
    });

    it('parses relational division', () => {
      const { ast, diagnostics } = parse('Enrollments ÷ CoreCourses');
      expect(diagnostics).toHaveLength(0);
      expect(ast?.type).toBe('division');
      const div = ast as DivisionNode;
      expect(div.left.type).toBe('relation');
      expect(div.right.type).toBe('relation');
    });
  });

  describe('Predicate Boolean Expressions & 3VL', () => {
    it('parses compound boolean predicates with AND, OR, NOT, and comparisons', () => {
      const { ast, diagnostics } = parse(
        'σ salary > 60000 AND (dept_id = 1 OR dept_id = 2) AND NOT is_intern ( Employees )'
      );
      expect(diagnostics).toHaveLength(0);
      expect(ast?.type).toBe('selection');
      const sel = ast as SelectionNode;
      expect(sel.predicate).toBeDefined();
    });

    it('parses IS NULL and IS NOT NULL predicates', () => {
      const { ast, diagnostics } = parse(
        'σ location IS NOT NULL AND bonus IS NULL ( Employees )'
      );
      expect(diagnostics).toHaveLength(0);
      expect(ast?.type).toBe('selection');
    });
  });

  describe('Stable Node IDs and Exact Source Ranges', () => {
    it('generates unique stable IDs and accurate ranges across AST hierarchy', () => {
      const { ast } = parse('π name ( Employees )');
      expect(ast).toBeDefined();
      expect(ast?.id).toMatch(/^proj_\d+$/);
      expect(ast?.range.start).toEqual({ line: 1, column: 1, offset: 0 });
      expect(ast?.range.end.column).toBeGreaterThan(10);
    });
  });

  describe('Incomplete Input Handling', () => {
    it('handles incomplete selection input gracefully without throwing', () => {
      const { diagnostics, isIncomplete } = parse('σ salary > ');
      expect(isIncomplete).toBe(true);
      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('handles unclosed parentheses gracefully and flags incomplete', () => {
      const { diagnostics, isIncomplete } = parse('( Employees ⋈ Departments');
      expect(isIncomplete).toBe(true);
      expect(diagnostics.some((d) => d.code === 'E_UNMATCHED_PAREN')).toBe(true);
    });

    it('handles trailing binary join operator at EOF gracefully', () => {
      const { diagnostics, isIncomplete } = parse('Employees ⋈ ');
      expect(isIncomplete).toBe(true);
      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });
});
