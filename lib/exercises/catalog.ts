import type { Exercise } from './types';
import { EXERCISE_FORMAT_VERSION } from './types';
import { UNIVERSITY_MID_GPA_COUNTEREXAMPLE } from './fixtures/universityMidGpaCounterexample';

const v = EXERCISE_FORMAT_VERSION;

export const EXERCISE_LIBRARY: Exercise[] = [
  // --- Beginner ---
  {
    formatVersion: v,
    id: 'ex-begin-selection',
    title: 'High achievers',
    difficulty: 'beginner',
    learningObjectives: ['Write a selection (σ) with a numeric comparison', 'Read attribute names from the schema'],
    prerequisites: ['Understand relations as sets of tuples'],
    operators: ['selection'],
    dataset: { kind: 'preset', presetId: 'university' },
    prompt:
      'List every student whose GPA is at least 3.8. Return all columns from Students (do not project yet).',
    referenceExpression: 'σ gpa >= 3.8 ( Students )',
    expectedColumns: ['student_id', 'name', 'major_id', 'gpa'],
    expectedTuples: [
      { student_id: 1, name: 'Ada Lovelace', major_id: 10, gpa: 3.9 },
      { student_id: 3, name: 'Grace Hopper', major_id: 20, gpa: 3.8 },
      { student_id: 5, name: 'Marie Curie', major_id: 30, gpa: 4.0 },
    ],
    hints: [
      { order: 1, text: 'Selection keeps rows that satisfy a predicate; use σ with a comparison on gpa.' },
      { order: 2, text: 'The predicate is gpa >= 3.8 applied to the Students relation.' },
      { order: 3, text: 'Syntax: σ gpa >= 3.8 ( Students ) — no projection needed.' },
    ],
    explanation:
      'σ gpa >= 3.8 ( Students ) filters the Students relation. Three students meet the threshold. Selection preserves the input schema.',
    counterexamples: [
      {
        id: 'mid-gpa-student',
        dataset: UNIVERSITY_MID_GPA_COUNTEREXAMPLE,
        failureMessage:
          'Your answer matched the visible dataset but fails on a hidden variation with an extra student whose GPA is 3.75. Non-strict comparisons (>= 3.8) differ from strict ones (> 3.7) on that row.',
      },
    ],
  },
  {
    formatVersion: v,
    id: 'ex-begin-projection',
    title: 'Department names only',
    difficulty: 'beginner',
    learningObjectives: ['Project a single attribute', 'Understand duplicate elimination'],
    prerequisites: ['Know that π returns a set of tuples'],
    operators: ['projection'],
    dataset: { kind: 'preset', presetId: 'lesson' },
    prompt: 'Return the distinct department names from Departments.',
    referenceExpression: 'π dept_name ( Departments )',
    expectedColumns: ['dept_name'],
    expectedTuples: [{ dept_name: 'Engineering' }, { dept_name: 'Marketing' }],
    hints: [
      { order: 1, text: 'Projection π lists attribute names you want in the result.' },
      { order: 2, text: 'Only dept_name is requested — drop dept_id.' },
      { order: 3, text: 'π dept_name ( Departments )' },
    ],
    explanation: 'π dept_name ( Departments ) keeps one column. RAT uses set semantics, so duplicate names would collapse.',
  },
  {
    formatVersion: v,
    id: 'ex-begin-rename-relation',
    title: 'Alias a relation',
    difficulty: 'beginner',
    learningObjectives: ['Rename a relation with ρ for clarity or self-joins'],
    prerequisites: ['ex-begin-projection'],
    operators: ['rename_relation', 'rename'],
    dataset: { kind: 'preset', presetId: 'university' },
    prompt:
      'Rename Students to S, then project student_id. Your result should list every student_id unchanged.',
    referenceExpression: 'π student_id ( ρ S ( Students ) )',
    expectedColumns: ['student_id'],
    expectedTuples: [
      { student_id: 1 },
      { student_id: 2 },
      { student_id: 3 },
      { student_id: 4 },
      { student_id: 5 },
    ],
    hints: [
      { order: 1, text: 'ρ S ( Students ) renames the relation; attributes stay the same.' },
      { order: 2, text: 'Wrap the rename, then project: π student_id ( … ).' },
      { order: 3, text: 'π student_id ( ρ S ( Students ) )' },
    ],
    explanation:
      'Relation rename does not change tuples — only the relation symbol used in later operators.',
  },
  {
    formatVersion: v,
    id: 'ex-begin-natural-join',
    title: 'Employee departments',
    difficulty: 'beginner',
    learningObjectives: ['Natural join on a shared key', 'Combine attributes from two relations'],
    prerequisites: ['ex-begin-projection'],
    operators: ['natural_join', 'projection'],
    dataset: { kind: 'preset', presetId: 'lesson' },
    prompt:
      'Show each employee name with their department name. Use a natural join on dept_id, then project name and dept_name.',
    referenceExpression: 'π name, dept_name ( Employees ⋈ Departments )',
    expectedColumns: ['name', 'dept_name'],
    expectedTuples: [
      { name: 'Alice', dept_name: 'Engineering' },
      { name: 'Bob', dept_name: 'Marketing' },
    ],
    hints: [
      { order: 1, text: 'Employees and Departments share dept_id — natural join ⋈ equates matching keys.' },
      { order: 2, text: 'Join first, then π name, dept_name ( … ).' },
      { order: 3, text: 'π name, dept_name ( Employees ⋈ Departments )' },
    ],
    explanation:
      'Natural join pairs tuples with equal values on all common attributes (here dept_id), then drops the duplicate key from the right side in the internal representation before projection.',
  },
  {
    formatVersion: v,
    id: 'ex-begin-compose',
    title: 'Engineering roster',
    difficulty: 'beginner',
    learningObjectives: ['Nest selection inside projection', 'Filter after joining'],
    prerequisites: ['ex-begin-selection', 'ex-begin-natural-join'],
    operators: ['selection', 'natural_join', 'projection'],
    dataset: { kind: 'preset', presetId: 'lesson' },
    prompt:
      'List employee and department names only for the Engineering department (dept_id = 10).',
    referenceExpression: 'π name, dept_name ( σ dept_id = 10 ( Employees ⋈ Departments ) )',
    expectedColumns: ['name', 'dept_name'],
    expectedTuples: [{ name: 'Alice', dept_name: 'Engineering' }],
    hints: [
      { order: 1, text: 'Join Employees and Departments, then restrict rows with σ dept_id = 10.' },
      { order: 2, text: 'After filtering, project the two name columns.' },
      { order: 3, text: 'π name, dept_name ( σ dept_id = 10 ( Employees ⋈ Departments ) )' },
    ],
    explanation:
      'Composing operators builds a pipeline: join → select → project. Equivalent rewrites exist (e.g., select before join) but may differ on other data.',
  },
  {
    formatVersion: v,
    id: 'ex-begin-rename-attr',
    title: 'Rename a column',
    difficulty: 'beginner',
    learningObjectives: ['Rename attributes with ρ[old -> new]'],
    prerequisites: ['ex-begin-projection'],
    operators: ['rename_attributes', 'projection'],
    dataset: { kind: 'preset', presetId: 'university' },
    prompt:
      'Rename Students.name to student_name, then list distinct student_name values.',
    referenceExpression: 'π student_name ( ρ[name -> student_name] ( Students ) )',
    expectedColumns: ['student_name'],
    expectedTuples: [
      { student_name: 'Ada Lovelace' },
      { student_name: 'Alan Turing' },
      { student_name: 'Grace Hopper' },
      { student_name: 'Nikola Tesla' },
      { student_name: 'Marie Curie' },
    ],
    hints: [
      { order: 1, text: 'Attribute rename syntax: ρ[name -> student_name] ( Students ).' },
      { order: 2, text: 'Project the new name with π student_name.' },
      { order: 3, text: 'π student_name ( ρ[name -> student_name] ( Students ) )' },
    ],
    explanation: 'Attribute renaming is useful before joins when both sides share a column name you need to distinguish.',
  },
  // --- Intermediate ---
  {
    formatVersion: v,
    id: 'ex-inter-theta-join',
    title: 'Explicit join condition',
    difficulty: 'intermediate',
    learningObjectives: ['Write a theta join with an explicit predicate'],
    prerequisites: ['ex-begin-natural-join'],
    operators: ['theta_join', 'projection'],
    dataset: { kind: 'preset', presetId: 'lesson' },
    prompt:
      'Match employees to departments using an explicit join on dept_id (theta join), then project name and dept_name.',
    referenceExpression:
      'π name, dept_name ( Employees ⋈[Employees.dept_id = Departments.dept_id] Departments )',
    expectedColumns: ['name', 'dept_name'],
    expectedTuples: [
      { name: 'Alice', dept_name: 'Engineering' },
      { name: 'Bob', dept_name: 'Marketing' },
    ],
    hints: [
      { order: 1, text: 'Theta join uses ⋈[predicate] between two relations.' },
      { order: 2, text: 'Qualify attributes: Employees.dept_id = Departments.dept_id.' },
      { order: 3, text: 'π name, dept_name ( Employees ⋈[Employees.dept_id = Departments.dept_id] Departments )' },
    ],
    explanation:
      'On this data, the theta join matches the natural join because dept_id is the only common attribute.',
  },
  {
    formatVersion: v,
    id: 'ex-inter-cartesian',
    title: 'Full cross product',
    difficulty: 'intermediate',
    learningObjectives: ['Form the Cartesian product ⨯', 'See how row counts multiply'],
    prerequisites: ['ex-inter-theta-join'],
    operators: ['cartesian_product', 'projection'],
    dataset: { kind: 'preset', presetId: 'lesson' },
    prompt:
      'List every combination of employee name and department name using Cartesian product (expect four rows).',
    referenceExpression: 'π name, dept_name ( Employees ⨯ Departments )',
    expectedColumns: ['name', 'dept_name'],
    expectedTuples: [
      { name: 'Alice', dept_name: 'Engineering' },
      { name: 'Alice', dept_name: 'Marketing' },
      { name: 'Bob', dept_name: 'Engineering' },
      { name: 'Bob', dept_name: 'Marketing' },
    ],
    hints: [
      { order: 1, text: 'Employees ⨯ Departments pairs every employee tuple with every department tuple.' },
      { order: 2, text: 'Project only name and dept_name after the product.' },
      { order: 3, text: 'π name, dept_name ( Employees ⨯ Departments )' },
    ],
    explanation:
      'With two employees and two departments, the cross product has four rows. Filtering with σ is often needed afterward to emulate a join.',
  },
  {
    formatVersion: v,
    id: 'ex-inter-union',
    title: 'All people names',
    difficulty: 'intermediate',
    learningObjectives: ['Union union-compatible relations', 'Project before ∪'],
    prerequisites: ['ex-begin-projection'],
    operators: ['union', 'projection'],
    dataset: { kind: 'preset', presetId: 'university' },
    prompt:
      'Build the set of distinct names appearing in either Students or Professors (one column: name).',
    referenceExpression: '( π name ( Students ) ) ∪ ( π name ( Professors ) )',
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
    hints: [
      { order: 1, text: 'Union requires compatible schemas — project both sides to π name.' },
      { order: 2, text: 'Parentheses clarify precedence: ( π name ( Students ) ) ∪ ( π name ( Professors ) ).' },
      { order: 3, text: 'Duplicates across sides are eliminated automatically.' },
    ],
    explanation: 'Union is set union on union-compatible relations.',
  },
  {
    formatVersion: v,
    id: 'ex-inter-intersection',
    title: 'Double enrollees',
    difficulty: 'intermediate',
    learningObjectives: ['Use ∩ on projected keys'],
    prerequisites: ['ex-begin-selection', 'ex-inter-union'],
    operators: ['intersection', 'selection', 'projection'],
    dataset: { kind: 'preset', presetId: 'university' },
    prompt:
      'Find student_id values enrolled in both course 101 and course 102.',
    referenceExpression:
      'π student_id ( σ course_id = 101 ( Enrolled ) ) ∩ π student_id ( σ course_id = 102 ( Enrolled ) )',
    expectedColumns: ['student_id'],
    expectedTuples: [{ student_id: 1 }, { student_id: 2 }],
    hints: [
      { order: 1, text: 'Filter Enrolled for each course, project student_id, then intersect.' },
      { order: 2, text: '∩ keeps tuples present in both operands.' },
      { order: 3, text: 'π student_id ( σ course_id = 101 ( Enrolled ) ) ∩ π student_id ( σ course_id = 102 ( Enrolled ) )' },
    ],
    explanation: 'Intersection on student_id yields learners taking both courses.',
  },
  {
    formatVersion: v,
    id: 'ex-inter-difference',
    title: 'Everyone but independents',
    difficulty: 'intermediate',
    learningObjectives: ['Subtract one set from another with −'],
    prerequisites: ['ex-inter-intersection'],
    operators: ['difference', 'selection', 'projection'],
    dataset: { kind: 'preset', presetId: 'university' },
    prompt:
      'List student_id values enrolled in at least one course, excluding those enrolled only in course 999 (Independent Study).',
    referenceExpression:
      'π student_id ( Enrolled ) − π student_id ( σ course_id = 999 ( Enrolled ) )',
    expectedColumns: ['student_id'],
    expectedTuples: [
      { student_id: 1 },
      { student_id: 2 },
      { student_id: 3 },
      { student_id: 5 },
    ],
    hints: [
      { order: 1, text: 'Start with all enrolled students, subtract those in course 999.' },
      { order: 2, text: 'Difference is not commutative — order matters.' },
      { order: 3, text: 'π student_id ( Enrolled ) − π student_id ( σ course_id = 999 ( Enrolled ) )' },
    ],
    explanation:
      'Student 4 appears only in course 999, so they are removed from the result. Students in 999 plus other courses remain.',
  },
  {
    formatVersion: v,
    id: 'ex-inter-left-join',
    title: 'Students without majors',
    difficulty: 'intermediate',
    learningObjectives: ['Preserve left tuples with NULL padding in ⟕'],
    prerequisites: ['ex-begin-natural-join'],
    operators: ['left_join', 'projection'],
    dataset: { kind: 'preset', presetId: 'university' },
    prompt:
      'Show every student_id with their major_name, including students with no major (NULL major_name).',
    referenceExpression: 'π student_id, major_name ( Students ⟕ Majors )',
    expectedColumns: ['student_id', 'major_name'],
    expectedTuples: [
      { student_id: 1, major_name: 'Computer Science' },
      { student_id: 2, major_name: 'Computer Science' },
      { student_id: 3, major_name: 'Mathematics' },
      { student_id: 4, major_name: null },
      { student_id: 5, major_name: 'Physics' },
    ],
    hints: [
      { order: 1, text: 'Left outer join ⟕ keeps unmatched left tuples.' },
      { order: 2, text: 'Join Students ⟕ Majors on major_id, then project.' },
      { order: 3, text: 'π student_id, major_name ( Students ⟕ Majors )' },
    ],
    explanation: 'Nikola Tesla has NULL major_id, so major_name is NULL after the left join.',
  },
  // --- Advanced ---
  {
    formatVersion: v,
    id: 'ex-adv-right-join',
    title: 'Right-sided coverage',
    difficulty: 'advanced',
    learningObjectives: ['Use ⟖ to emphasize the right relation'],
    prerequisites: ['ex-inter-left-join'],
    operators: ['right_join', 'projection'],
    dataset: { kind: 'preset', presetId: 'university' },
    prompt:
      'Using a right outer join, list student_id and major_name for students matched to a major (unmatched left rows dropped).',
    referenceExpression: 'π student_id, major_name ( Students ⟖ Majors )',
    expectedColumns: ['student_id', 'major_name'],
    expectedTuples: [
      { student_id: 1, major_name: 'Computer Science' },
      { student_id: 2, major_name: 'Computer Science' },
      { student_id: 3, major_name: 'Mathematics' },
      { student_id: 5, major_name: 'Physics' },
    ],
    hints: [
      { order: 1, text: 'Right join ⟖ drops left tuples with no match on major_id.' },
      { order: 2, text: 'Student 4 should not appear.' },
      { order: 3, text: 'π student_id, major_name ( Students ⟖ Majors )' },
    ],
    explanation: 'Right join mirrors left join but preserves the right operand instead.',
  },
  {
    formatVersion: v,
    id: 'ex-adv-full-join',
    title: 'Full student–major picture',
    difficulty: 'advanced',
    learningObjectives: ['Combine unmatched rows from both sides with ⟗'],
    prerequisites: ['ex-adv-right-join', 'ex-inter-left-join'],
    operators: ['full_join', 'projection'],
    dataset: { kind: 'preset', presetId: 'university' },
    prompt:
      'List every student_id with major_name, including students without majors (use full outer join).',
    referenceExpression: 'π student_id, major_name ( Students ⟗ Majors )',
    expectedColumns: ['student_id', 'major_name'],
    expectedTuples: [
      { student_id: 1, major_name: 'Computer Science' },
      { student_id: 2, major_name: 'Computer Science' },
      { student_id: 3, major_name: 'Mathematics' },
      { student_id: 4, major_name: null },
      { student_id: 5, major_name: 'Physics' },
    ],
    hints: [
      { order: 1, text: 'Full outer join ⟗ keeps unmatched tuples from either side.' },
      { order: 2, text: 'On this schema, majors always match a student — focus on student 4.' },
      { order: 3, text: 'π student_id, major_name ( Students ⟗ Majors )' },
    ],
    explanation: 'Full join generalizes left and right outer joins.',
  },
  {
    formatVersion: v,
    id: 'ex-adv-division',
    title: 'Completed course 101',
    difficulty: 'advanced',
    learningObjectives: ['Express “for all” with relational division ÷'],
    prerequisites: ['ex-inter-intersection'],
    operators: ['division', 'selection', 'projection'],
    dataset: { kind: 'preset', presetId: 'university' },
    prompt:
      'Find student_id values who are enrolled in course 101. Use division with Enrolled and a one-row course relation for course 101.',
    referenceExpression:
      'π student_id, course_id ( Enrolled ) ÷ π course_id ( σ course_id = 101 ( Courses ) )',
    expectedColumns: ['student_id'],
    expectedTuples: [{ student_id: 1 }, { student_id: 2 }],
    hints: [
      { order: 1, text: 'Divisor is the set of required courses — here just course 101.' },
      { order: 2, text: 'Dividend pairs (student_id, course_id) from Enrolled.' },
      { order: 3, text: 'π student_id, course_id ( Enrolled ) ÷ π course_id ( σ course_id = 101 ( Courses ) )' },
    ],
    explanation:
      'Division returns students whose enrolled courses cover every course in the divisor.',
  },
  {
    formatVersion: v,
    id: 'ex-adv-cs-majors',
    title: 'Computer Science majors',
    difficulty: 'advanced',
    learningObjectives: ['Chain join, selection, and projection'],
    prerequisites: ['ex-begin-compose'],
    operators: ['natural_join', 'selection', 'projection'],
    dataset: { kind: 'preset', presetId: 'university' },
    prompt:
      'List names of students majoring in Computer Science (major_id 10). Join Students and Majors, filter, then project name.',
    referenceExpression:
      'π name ( σ major_id = 10 ( Students ⋈ Majors ) )',
    expectedColumns: ['name'],
    expectedTuples: [{ name: 'Ada Lovelace' }, { name: 'Alan Turing' }],
    hints: [
      { order: 1, text: 'Natural join Students ⋈ Majors on major_id.' },
      { order: 2, text: 'Select rows where major_id = 10 (or major_name = Computer Science).' },
      { order: 3, text: 'π name ( σ major_id = 10 ( Students ⋈ Majors ) )' },
    ],
    explanation: 'Real queries combine multiple operators; test equivalence only on the exercise snapshot.',
  },
  {
    formatVersion: v,
    id: 'ex-adv-credits-sum-filter',
    title: 'Heavy course load',
    difficulty: 'advanced',
    learningObjectives: ['Filter courses by credits after joining enrollees'],
    prerequisites: ['ex-adv-cs-majors'],
    operators: ['natural_join', 'selection', 'projection'],
    dataset: { kind: 'preset', presetId: 'university' },
    prompt:
      'Find student_id values enrolled in at least one course with credits ≥ 4. Join Enrolled and Courses, filter, project student_id distinct.',
    referenceExpression:
      'π student_id ( σ credits >= 4 ( Enrolled ⋈ Courses ) )',
    expectedColumns: ['student_id'],
    expectedTuples: [{ student_id: 1 }, { student_id: 2 }, { student_id: 5 }],
    hints: [
      { order: 1, text: 'Enrolled ⋈ Courses matches course_id.' },
      { order: 2, text: 'σ credits >= 4 keeps Database Systems (102) and Quantum Mechanics (301).' },
      { order: 3, text: 'π student_id ( σ credits >= 4 ( Enrolled ⋈ Courses ) )' },
    ],
    explanation: 'Students 1 and 2 take course 102; student 5 takes course 301.',
  },
];

const BY_ID = new Map(EXERCISE_LIBRARY.map((ex) => [ex.id, ex]));

export function getExercise(id: string): Exercise | undefined {
  return BY_ID.get(id);
}

export function listExercises(): Exercise[] {
  return EXERCISE_LIBRARY;
}
