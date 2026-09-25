import type { ReferenceExecutableExample, ReferenceExamplePreset } from './types';

/** Executable examples tied to bundled or default lesson schemas; verified in tests. */
export const REFERENCE_EXECUTABLE_EXAMPLES: ReferenceExecutableExample[] = [
  {
    id: 'join-project',
    title: 'Join and project',
    description: 'Natural join on dept_id, then project employee and department names.',
    operatorId: 'natural-join',
    preset: 'lesson',
    expression: 'π name, dept_name ( Employees ⋈ Departments )',
    expectedColumns: ['name', 'dept_name'],
    expectedTuples: [
      { name: 'Alice', dept_name: 'Engineering' },
      { name: 'Bob', dept_name: 'Marketing' },
    ],
  },
  {
    id: 'filter-salary',
    title: 'Filter by salary',
    description: 'Selection on Employees (add a salary column in schema or use university Students gpa).',
    operatorId: 'selection',
    preset: 'university',
    expression: 'σ gpa >= 3.8 ( Students )',
    expectedColumns: ['student_id', 'name', 'major_id', 'gpa'],
    expectedTuples: [
      { student_id: 1, name: 'Ada Lovelace', major_id: 10, gpa: 3.9 },
      { student_id: 3, name: 'Grace Hopper', major_id: 20, gpa: 3.8 },
      { student_id: 5, name: 'Marie Curie', major_id: 30, gpa: 4.0 },
    ],
  },
  {
    id: 'project-dept-names',
    title: 'Project department names',
    description: 'Lesson schema departments.',
    operatorId: 'projection',
    preset: 'lesson',
    expression: 'π dept_name ( Departments )',
    expectedColumns: ['dept_name'],
    expectedTuples: [{ dept_name: 'Engineering' }, { dept_name: 'Marketing' }],
  },
  {
    id: 'rename-relation-alias',
    title: 'Relation alias',
    description: 'Rename Students for a self-join setup.',
    operatorId: 'rename-relation',
    preset: 'university',
    expression: 'π student_id ( ρ S ( Students ) )',
    expectedColumns: ['student_id'],
    expectedTuples: [
      { student_id: 1 },
      { student_id: 2 },
      { student_id: 3 },
      { student_id: 4 },
      { student_id: 5 },
    ],
  },
  {
    id: 'rename-attribute-name',
    title: 'Rename an attribute',
    description: 'Map Students.name to employee_name and list distinct names.',
    operatorId: 'rename-attributes',
    preset: 'university',
    expression: 'π employee_name ( ρ[name -> employee_name] ( Students ) )',
    expectedColumns: ['employee_name'],
    expectedTuples: [
      { employee_name: 'Ada Lovelace' },
      { employee_name: 'Alan Turing' },
      { employee_name: 'Grace Hopper' },
      { employee_name: 'Nikola Tesla' },
      { employee_name: 'Marie Curie' },
    ],
  },
  {
    id: 'cartesian-small',
    title: 'Small cross product',
    description: 'Two employees × two departments (4 rows).',
    operatorId: 'cartesian-product',
    preset: 'lesson',
    expression: 'π name, dept_name ( Employees ⨯ Departments )',
    expectedColumns: ['name', 'dept_name'],
    expectedTuples: [
      { name: 'Alice', dept_name: 'Engineering' },
      { name: 'Alice', dept_name: 'Marketing' },
      { name: 'Bob', dept_name: 'Engineering' },
      { name: 'Bob', dept_name: 'Marketing' },
    ],
  },
  {
    id: 'theta-dept',
    title: 'Theta join on dept_id',
    description: 'Explicit join condition matching natural join on lesson data.',
    operatorId: 'theta-join',
    preset: 'lesson',
    expression:
      'π name, dept_name ( Employees ⋈[Employees.dept_id = Departments.dept_id] Departments )',
    expectedColumns: ['name', 'dept_name'],
    expectedTuples: [
      { name: 'Alice', dept_name: 'Engineering' },
      { name: 'Bob', dept_name: 'Marketing' },
    ],
  },
  {
    id: 'left-join-null-major',
    title: 'Left join keeps unmatched students',
    description: 'Student 4 has NULL major_id in university data.',
    operatorId: 'left-outer-join',
    preset: 'university',
    expression: 'π student_id, major_name ( Students ⟕ Majors )',
    expectedColumns: ['student_id', 'major_name'],
    expectedTuples: [
      { student_id: 1, major_name: 'Computer Science' },
      { student_id: 2, major_name: 'Computer Science' },
      { student_id: 3, major_name: 'Mathematics' },
      { student_id: 4, major_name: null },
      { student_id: 5, major_name: 'Physics' },
    ],
  },
  {
    id: 'right-join-majors',
    title: 'Right outer join',
    description: 'Preserves matching major assignments; unmatched left rows are dropped.',
    operatorId: 'right-outer-join',
    preset: 'university',
    expression: 'π student_id, major_name ( Students ⟖ Majors )',
    expectedColumns: ['student_id', 'major_name'],
    expectedTuples: [
      { student_id: 1, major_name: 'Computer Science' },
      { student_id: 2, major_name: 'Computer Science' },
      { student_id: 3, major_name: 'Mathematics' },
      { student_id: 5, major_name: 'Physics' },
    ],
  },
  {
    id: 'full-join-students-majors',
    title: 'Full outer join',
    description: 'Matched pairs plus students without majors (NULL major_name).',
    operatorId: 'full-outer-join',
    preset: 'university',
    expression: 'π student_id, major_name ( Students ⟗ Majors )',
    expectedColumns: ['student_id', 'major_name'],
    expectedTuples: [
      { student_id: 1, major_name: 'Computer Science' },
      { student_id: 2, major_name: 'Computer Science' },
      { student_id: 3, major_name: 'Mathematics' },
      { student_id: 4, major_name: null },
      { student_id: 5, major_name: 'Physics' },
    ],
  },
  {
    id: 'union-names',
    title: 'Union of names',
    description: 'Union-compatible π name from Students and Professors.',
    operatorId: 'union',
    preset: 'university',
    expression: '( π name ( Students ) ) ∪ ( π name ( Professors ) )',
    expectedColumns: ['name'],
    expectedTuples: [
      { name: 'Ada Lovelace' },
      { name: 'Alan Turing' },
      { name: 'Dr. Codd' },
      { name: 'Dr. Feynman' },
      { name: 'Dr. Knuth' },
      { name: 'Dr. Noether' },
      { name: 'Grace Hopper' },
      { name: 'Marie Curie' },
      { name: 'Nikola Tesla' },
    ],
  },
  {
    id: 'intersection-enrolled',
    title: 'Intersection on enrollments',
    description: 'Students in both course 101 and 102.',
    operatorId: 'intersection',
    preset: 'university',
    expression:
      'π student_id ( σ course_id = 101 ( Enrolled ) ) ∩ π student_id ( σ course_id = 102 ( Enrolled ) )',
    expectedColumns: ['student_id'],
    expectedTuples: [{ student_id: 1 }, { student_id: 2 }],
  },
  {
    id: 'difference-enrolled',
    title: 'Difference on enrollments',
    description: 'Drop students who only appear in course 999.',
    operatorId: 'difference',
    preset: 'university',
    expression: 'π student_id ( Enrolled ) − π student_id ( σ course_id = 999 ( Enrolled ) )',
    expectedColumns: ['student_id'],
    expectedTuples: [
      { student_id: 1 },
      { student_id: 2 },
      { student_id: 3 },
      { student_id: 5 },
    ],
  },
  {
    id: 'division-course-101',
    title: 'Division with one required course',
    description: 'Students who enrolled in course 101.',
    operatorId: 'division',
    preset: 'university',
    expression: 'π student_id, course_id ( Enrolled ) ÷ π course_id ( σ course_id = 101 ( Courses ) )',
    expectedColumns: ['student_id'],
    expectedTuples: [{ student_id: 1 }, { student_id: 2 }],
  },
  {
    id: 'nested-filter-join',
    title: 'Nested operators',
    description: 'Selection after join (lesson schema).',
    operatorId: 'selection',
    preset: 'lesson',
    expression: 'π name, dept_name ( σ dept_id = 10 ( Employees ⋈ Departments ) )',
    expectedColumns: ['name', 'dept_name'],
    expectedTuples: [{ name: 'Alice', dept_name: 'Engineering' }],
  },
];

const EXAMPLE_BY_ID = new Map(REFERENCE_EXECUTABLE_EXAMPLES.map((ex) => [ex.id, ex]));

export function getExecutableExample(id: string): ReferenceExecutableExample | undefined {
  return EXAMPLE_BY_ID.get(id);
}

export function listExecutableExamples(): ReferenceExecutableExample[] {
  return REFERENCE_EXECUTABLE_EXAMPLES;
}

export interface StarterExample {
  id: string;
  title: string;
  description: string;
  expression: string;
  preset?: ReferenceExamplePreset;
}

/** Backward-compatible starter list for the sandbox dropdown. */
export const STARTER_EXAMPLES: StarterExample[] = REFERENCE_EXECUTABLE_EXAMPLES.filter((ex) =>
  ['join-project', 'filter-salary', 'union-names', 'nested-filter-join'].includes(ex.id)
).map((ex) => ({
  id: ex.id,
  title: ex.title,
  description: ex.description,
  expression: ex.expression,
  preset: ex.preset,
}));
