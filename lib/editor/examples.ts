export interface StarterExample {
  id: string;
  title: string;
  description: string;
  expression: string;
}

export const STARTER_EXAMPLES: StarterExample[] = [
  {
    id: 'join-project',
    title: 'Join & project',
    description: 'Natural join then project employee and department names.',
    expression: 'π name, dept_name ( Employees ⋈ Departments )',
  },
  {
    id: 'select-salary',
    title: 'Filter by salary',
    description: 'Selection on a numeric predicate.',
    expression: 'σ salary > 70000 ( Employees )',
  },
  {
    id: 'set-union',
    title: 'Set union',
    description: 'Combine compatible relations with ∪.',
    expression: 'π name ( Employees ) ∪ π dept_name ( Departments )',
  },
  {
    id: 'nested',
    title: 'Nested operators',
    description: 'Projection over a filtered join.',
    expression:
      'π name, dept_name, salary ( σ salary > 70000 ( Employees ⋈ Departments ) )',
  },
];
