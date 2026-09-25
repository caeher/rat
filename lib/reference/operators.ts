import { OPERATOR_CONTRACTS } from '@/lib/engine/contract';
import type { OperatorType } from '@/lib/engine/types';
import type { ReferenceOperatorDoc } from './types';

function contract(type: OperatorType) {
  return OPERATOR_CONTRACTS[type];
}

export const REFERENCE_OPERATORS: ReferenceOperatorDoc[] = [
  {
    id: 'selection',
    operatorTypes: ['selection'],
    symbol: contract('selection').symbol,
    name: contract('selection').name,
    classification: 'Fundamental',
    unicodeSyntax: 'σ <predicate> ( R )',
    asciiSyntax: 'sigma <predicate> ( R )',
    asciiAliases: contract('selection').asciiAliases,
    operandRequirements: 'One relation R and a boolean predicate over R’s attributes (literals, comparisons, AND/OR/NOT, IS NULL).',
    outputSchema: 'Same attributes as R; only qualifying tuples remain.',
    semantics: contract('selection').formalDefinition,
    whenToUse: 'Filter rows before projecting or joining so intermediate results stay small and readable.',
    commonMistakes: [
      {
        title: 'Using = NULL instead of IS NULL',
        explanation:
          'Comparisons with NULL are unknown in three-valued logic, so σ major_id = NULL returns no rows. Write σ major_id IS NULL ( R ) instead.',
      },
      {
        title: 'Forgetting parentheses',
        explanation: 'Selection binds to the relation on its right. Wrap nested expressions: π name ( σ salary > 70000 ( Employees ) ).',
      },
    ],
    workedExample: {
      caption: 'Employees earning more than 70k (Lesson schema).',
      expression: 'σ salary > 70000 ( Employees )',
      inputTables: [
        {
          title: 'Employees (fragment)',
          columns: ['name', 'salary'],
          rows: [
            { name: 'Alice', salary: 85000 },
            { name: 'Bob', salary: 62000 },
          ],
        },
      ],
      outputTable: {
        title: 'Result',
        columns: ['name', 'salary'],
        rows: [{ name: 'Alice', salary: 85000 }],
      },
    },
    executableExampleId: 'filter-salary',
    searchKeywords: ['filter', 'where', 'restrict', 'sigma'],
  },
  {
    id: 'projection',
    operatorTypes: ['projection'],
    symbol: contract('projection').symbol,
    name: contract('projection').name,
    classification: 'Fundamental',
    unicodeSyntax: 'π <a1, a2, …> ( R )',
    asciiSyntax: 'pi a1, a2 ( R )',
    asciiAliases: contract('projection').asciiAliases,
    operandRequirements: 'One relation R and a non-empty list of attribute names that exist on R.',
    outputSchema: 'Only the listed attributes; duplicate tuples are removed (set semantics).',
    semantics: contract('projection').formalDefinition,
    whenToUse: 'Drop unused columns and collapse duplicate rows after joins or unions.',
    commonMistakes: [
      {
        title: 'Expecting bag semantics',
        explanation:
          'RAT eliminates duplicate rows after projection. Two identical names collapse to one tuple even if the source relation had duplicates.',
      },
      {
        title: 'Projecting attributes not on R',
        explanation: 'Attribute names must exist on the input schema. Join or rename first if the column lives on another relation.',
      },
    ],
    workedExample: {
      caption: 'Distinct department names.',
      expression: 'π dept_name ( Departments )',
      inputTables: [
        {
          title: 'Departments',
          columns: ['dept_id', 'dept_name'],
          rows: [
            { dept_id: 10, dept_name: 'Engineering' },
            { dept_id: 20, dept_name: 'Marketing' },
          ],
        },
      ],
      outputTable: {
        title: 'π dept_name ( Departments )',
        columns: ['dept_name'],
        rows: [{ dept_name: 'Engineering' }, { dept_name: 'Marketing' }],
      },
    },
    executableExampleId: 'project-dept-names',
    searchKeywords: ['project', 'columns', 'distinct'],
  },
  {
    id: 'rename-relation',
    operatorTypes: ['rename_relation'],
    symbol: 'ρ',
    name: 'Relation rename',
    classification: 'Fundamental',
    unicodeSyntax: 'ρ Alias ( R )',
    asciiSyntax: 'rho Alias ( R )',
    asciiAliases: contract('rename_relation').asciiAliases,
    operandRequirements: 'One relation R and a fresh relation alias.',
    outputSchema: 'Same attributes and tuples; relation name becomes Alias.',
    semantics: contract('rename_relation').formalDefinition,
    whenToUse: 'Self-joins and comparisons between two uses of the same base table.',
    commonMistakes: [
      {
        title: 'Skipping rename on self-joins',
        explanation:
          'Joining R to itself without aliases yields duplicate attribute names and ambiguous references in predicates.',
      },
    ],
    workedExample: {
      caption: 'Alias Students as S before reusing the table.',
      expression: 'ρ S ( Students )',
      inputTables: [
        {
          title: 'Students',
          columns: ['student_id', 'name'],
          rows: [{ student_id: 1, name: 'Ada' }],
        },
      ],
      outputTable: {
        title: 'S (same rows, new name)',
        columns: ['student_id', 'name'],
        rows: [{ student_id: 1, name: 'Ada' }],
      },
    },
    executableExampleId: 'rename-relation-alias',
    searchKeywords: ['alias', 'rho', 'self join'],
  },
  {
    id: 'rename-attributes',
    operatorTypes: ['rename_attributes'],
    symbol: 'ρ',
    name: 'Attribute rename',
    classification: 'Fundamental',
    unicodeSyntax: 'ρ[old → new] ( R )',
    asciiSyntax: 'rho[old -> new] ( R )',
    asciiAliases: contract('rename_attributes').asciiAliases,
    operandRequirements: 'One relation R and a bracket map old → new for each attribute to rename.',
    outputSchema: 'Same tuples; listed attributes appear under new names.',
    semantics: contract('rename_attributes').formalDefinition,
    whenToUse: 'Align column names before union or clarify labels after a join.',
    commonMistakes: [
      {
        title: 'Arity mismatch in ρ S(a,b) form',
        explanation:
          'When renaming both relation and attributes, the attribute list must match the degree of R exactly.',
      },
      {
        title: 'Renaming to an existing name',
        explanation: 'Target attribute names must stay unique within the result schema.',
      },
    ],
    workedExample: {
      caption: 'Expose Students.name as employee_name.',
      expression: 'ρ[name -> employee_name] ( Students )',
      inputTables: [
        {
          title: 'Students',
          columns: ['name'],
          rows: [{ name: 'Ada Lovelace' }],
        },
      ],
      outputTable: {
        title: 'Renamed column',
        columns: ['employee_name'],
        rows: [{ employee_name: 'Ada Lovelace' }],
      },
    },
    executableExampleId: 'rename-attribute-name',
    searchKeywords: ['attribute rename', 'mapping'],
  },
  {
    id: 'cartesian-product',
    operatorTypes: ['cartesian_product'],
    symbol: contract('cartesian_product').symbol,
    name: contract('cartesian_product').name,
    classification: 'Fundamental',
    unicodeSyntax: 'R ⨯ S',
    asciiSyntax: 'R * S  or  R cross S',
    asciiAliases: contract('cartesian_product').asciiAliases,
    operandRequirements: 'Two relations R and S (any schemas).',
    outputSchema: 'Concatenation of R’s then S’s attributes; |R| × |S| rows before any selection.',
    semantics: contract('cartesian_product').formalDefinition,
    whenToUse: 'Build a wide intermediate relation before σ or ⋈_θ when no shared column names exist.',
    commonMistakes: [
      {
        title: 'Accidental cross product',
        explanation:
          'Using ⨯ when you meant ⋈ multiplies every row pair. Prefer natural or theta join when a predicate links the tables.',
      },
      {
        title: 'Duplicate attribute names',
        explanation:
          'If R and S share names, the product keeps both copies and later references become ambiguous—rename first.',
      },
    ],
    workedExample: {
      caption: 'Two-row cross with two departments.',
      expression: 'Employees ⨯ Departments',
      inputTables: [
        {
          title: 'Employees (1 row)',
          columns: ['name'],
          rows: [{ name: 'Alice' }],
        },
        {
          title: 'Departments (2 rows)',
          columns: ['dept_name'],
          rows: [{ dept_name: 'Eng' }, { dept_name: 'Mkt' }],
        },
      ],
      outputTable: {
        title: '2 combinations',
        columns: ['name', 'dept_name'],
        rows: [
          { name: 'Alice', dept_name: 'Eng' },
          { name: 'Alice', dept_name: 'Mkt' },
        ],
      },
    },
    executableExampleId: 'cartesian-small',
    searchKeywords: ['cross', 'times', 'product'],
  },
  {
    id: 'natural-join',
    operatorTypes: ['natural_join'],
    symbol: contract('natural_join').symbol,
    name: contract('natural_join').name,
    classification: 'Derived',
    unicodeSyntax: 'R ⋈ S',
    asciiSyntax: 'R join S  or  R natural_join S',
    asciiAliases: contract('natural_join').asciiAliases,
    operandRequirements: 'Two relations; equi-join on all attributes with identical names and compatible types.',
    outputSchema: 'Shared columns once, then R-only, then S-only attributes; duplicate join keys removed.',
    semantics: contract('natural_join').formalDefinition,
    whenToUse: 'Foreign-key style links when column names already match (e.g., dept_id on both sides).',
    commonMistakes: [
      {
        title: 'No common attribute names',
        explanation: 'Natural join matches on name equality only. Use ⋈[condition] or rename columns first.',
      },
      {
        title: 'Confusing with theta join',
        explanation: 'Natural join ignores arbitrary predicates; it always equates every shared name.',
      },
    ],
    workedExample: {
      caption: 'Employees with department names via dept_id.',
      expression: 'π name, dept_name ( Employees ⋈ Departments )',
      inputTables: [
        {
          title: 'Join key dept_id',
          columns: ['name', 'dept_name'],
          rows: [{ name: 'Alice', dept_name: 'Engineering' }],
        },
      ],
      outputTable: {
        title: 'Projected result',
        columns: ['name', 'dept_name'],
        rows: [{ name: 'Alice', dept_name: 'Engineering' }],
      },
    },
    executableExampleId: 'join-project',
    searchKeywords: ['bowtie', 'natural'],
  },
  {
    id: 'theta-join',
    operatorTypes: ['theta_join'],
    symbol: '⋈_θ',
    name: contract('theta_join').name,
    classification: 'Derived',
    unicodeSyntax: 'R ⋈[θ] S',
    asciiSyntax: 'R join[condition] S',
    asciiAliases: contract('theta_join').asciiAliases,
    operandRequirements: 'Two relations and a boolean θ over the combined schema (often R.attr = S.attr).',
    outputSchema: 'All attributes from R and S; only row pairs satisfying θ.',
    semantics: contract('theta_join').formalDefinition,
    whenToUse: 'Join predicates that are not limited to identically named columns.',
    commonMistakes: [
      {
        title: 'Omitting the bracket condition',
        explanation: 'Bare ⋈ is natural join syntax in RAT, not theta join. Use ⋈[Employees.dept_id = Departments.dept_id].',
      },
    ],
    workedExample: {
      caption: 'Explicit dept_id equality (same result as natural join here).',
      expression: 'Employees ⋈[Employees.dept_id = Departments.dept_id] Departments',
      inputTables: [
        {
          title: 'Matched pair',
          columns: ['name', 'dept_name'],
          rows: [{ name: 'Alice', dept_name: 'Engineering' }],
        },
      ],
      outputTable: {
        title: 'Theta join rows',
        columns: ['name', 'dept_name'],
        rows: [{ name: 'Alice', dept_name: 'Engineering' }],
      },
    },
    executableExampleId: 'theta-dept',
    searchKeywords: ['conditional join', 'on clause'],
  },
  {
    id: 'left-outer-join',
    operatorTypes: ['left_join'],
    symbol: contract('left_join').symbol,
    name: contract('left_join').name,
    classification: 'Join variant',
    unicodeSyntax: 'R ⟕[θ] S',
    asciiSyntax: 'R left_join[condition] S',
    asciiAliases: contract('left_join').asciiAliases,
    operandRequirements: 'Two relations and optional θ (defaults to natural join on common names when omitted).',
    outputSchema: 'All R rows; unmatched S columns padded with NULL.',
    semantics: contract('left_join').formalDefinition,
    whenToUse: 'Keep every left row even when the right side has no match (optional relationships).',
    commonMistakes: [
      {
        title: 'Swapping left and right',
        explanation: '⟕ keeps the left operand. Students ⟕ Majors keeps every student, not every major.',
      },
    ],
    workedExample: {
      caption: 'Student without major still appears.',
      expression: 'π student_id, major_name ( Students ⟕ Majors )',
      inputTables: [
        {
          title: 'Unmatched student 4',
          columns: ['student_id', 'major_name'],
          rows: [{ student_id: 4, major_name: null }],
        },
      ],
      outputTable: {
        title: 'NULL major_name',
        columns: ['student_id', 'major_name'],
        rows: [{ student_id: 4, major_name: null }],
      },
    },
    executableExampleId: 'left-join-null-major',
    searchKeywords: ['outer', 'preserve left'],
  },
  {
    id: 'right-outer-join',
    operatorTypes: ['right_join'],
    symbol: contract('right_join').symbol,
    name: contract('right_join').name,
    classification: 'Join variant',
    unicodeSyntax: 'R ⟖[θ] S',
    asciiSyntax: 'R right_join[condition] S',
    asciiAliases: contract('right_join').asciiAliases,
    operandRequirements: 'Two relations and join condition θ.',
    outputSchema: 'All S rows; unmatched R columns padded with NULL.',
    semantics: contract('right_join').formalDefinition,
    whenToUse: 'Mirror of left outer join when the preserved side should be the right operand.',
    commonMistakes: [
      {
        title: 'Using ⟖ when you meant ⟕',
        explanation: 'Right outer join preserves S. Flip operands or choose ⟕ to keep the other side.',
      },
    ],
    workedExample: {
      caption: 'Major with no students (conceptual).',
      expression: 'Students ⟖ Majors',
      inputTables: [
        {
          title: 'Right-preserved row',
          columns: ['student_id', 'major_name'],
          rows: [{ student_id: null, major_name: 'Physics' }],
        },
      ],
      outputTable: {
        title: 'NULLs on the left',
        columns: ['student_id', 'major_name'],
        rows: [{ student_id: null, major_name: 'Physics' }],
      },
    },
    executableExampleId: 'right-join-majors',
    searchKeywords: ['preserve right'],
  },
  {
    id: 'full-outer-join',
    operatorTypes: ['full_join'],
    symbol: contract('full_join').symbol,
    name: contract('full_join').name,
    classification: 'Join variant',
    unicodeSyntax: 'R ⟗[θ] S',
    asciiSyntax: 'R full_join[condition] S',
    asciiAliases: contract('full_join').asciiAliases,
    operandRequirements: 'Two relations and join condition θ.',
    outputSchema: 'Union of left and right outer join results; NULLs on either non-matching side.',
    semantics: contract('full_join').formalDefinition,
    whenToUse: 'Full coverage when you need unmatched rows from both operands.',
    commonMistakes: [
      {
        title: 'Expecting inner join row count',
        explanation: 'Full outer join can return more rows than ⋈ because it keeps non-matching tuples from both sides.',
      },
    ],
    workedExample: {
      caption: 'Combines unmatched from both sides.',
      expression: 'Students ⟗ Majors',
      inputTables: [
        {
          title: 'Includes NULL padding',
          columns: ['student_id', 'major_name'],
          rows: [
            { student_id: 4, major_name: null },
            { student_id: null, major_name: 'Physics' },
          ],
        },
      ],
      outputTable: {
        title: 'Full outer sketch',
        columns: ['student_id', 'major_name'],
        rows: [
          { student_id: 4, major_name: null },
          { student_id: null, major_name: 'Physics' },
        ],
      },
    },
    executableExampleId: 'full-join-students-majors',
    searchKeywords: ['full outer'],
  },
  {
    id: 'union',
    operatorTypes: ['union'],
    symbol: contract('union').symbol,
    name: contract('union').name,
    classification: 'Fundamental',
    unicodeSyntax: 'R ∪ S',
    asciiSyntax: 'R union S  or  R || S',
    asciiAliases: contract('union').asciiAliases,
    operandRequirements: 'R and S must be union-compatible: same arity and pairwise compatible attribute types.',
    outputSchema: 'Shared column names from operands; set of distinct tuples from either side.',
    semantics: contract('union').formalDefinition,
    whenToUse: 'Merge compatible lists (e.g., names drawn from two relations).',
    commonMistakes: [
      {
        title: 'Mismatched schemas',
        explanation: 'π name ( Employees ) ∪ π dept_name ( Departments ) fails—project matching columns first.',
      },
      {
        title: 'Expecting duplicate rows',
        explanation: 'RAT uses set union: duplicate tuples appear once in the result.',
      },
    ],
    workedExample: {
      caption: 'Compatible single-column union.',
      expression: 'π name ( Students ) ∪ π name ( Professors )',
      inputTables: [
        {
          title: 'Shared column name',
          columns: ['name'],
          rows: [{ name: 'Ada Lovelace' }, { name: 'Dr. Codd' }],
        },
      ],
      outputTable: {
        title: 'Distinct names',
        columns: ['name'],
        rows: [{ name: 'Ada Lovelace' }, { name: 'Dr. Codd' }],
      },
    },
    executableExampleId: 'union-names',
    searchKeywords: ['combine', 'cup'],
  },
  {
    id: 'intersection',
    operatorTypes: ['intersection'],
    symbol: contract('intersection').symbol,
    name: contract('intersection').name,
    classification: 'Derived',
    unicodeSyntax: 'R ∩ S',
    asciiSyntax: 'R intersect S',
    asciiAliases: contract('intersection').asciiAliases,
    operandRequirements: 'Union-compatible R and S.',
    outputSchema: 'Distinct tuples appearing in both operands.',
    semantics: contract('intersection').formalDefinition,
    whenToUse: 'Overlap queries (“students in both courses”).',
    commonMistakes: [
      {
        title: 'Using ∩ on unrelated schemas',
        explanation: 'Intersect only after projecting to the same columns and types.',
      },
    ],
    workedExample: {
      caption: 'Students enrolled in both course 101 and 102.',
      expression:
        'π student_id ( σ course_id = 101 ( Enrolled ) ) ∩ π student_id ( σ course_id = 102 ( Enrolled ) )',
      inputTables: [
        {
          title: 'Shared student_id',
          columns: ['student_id'],
          rows: [{ student_id: 1 }, { student_id: 2 }],
        },
      ],
      outputTable: {
        title: 'Intersection',
        columns: ['student_id'],
        rows: [{ student_id: 1 }, { student_id: 2 }],
      },
    },
    executableExampleId: 'intersection-enrolled',
    searchKeywords: ['overlap', 'cap'],
  },
  {
    id: 'difference',
    operatorTypes: ['difference'],
    symbol: contract('difference').symbol,
    name: contract('difference').name,
    classification: 'Fundamental',
    unicodeSyntax: 'R − S',
    asciiSyntax: 'R - S  or  R minus S',
    asciiAliases: contract('difference').asciiAliases,
    operandRequirements: 'Union-compatible R and S.',
    outputSchema: 'Tuples in R that are not members of S (set difference).',
    semantics: contract('difference').formalDefinition,
    whenToUse: 'Anti-join patterns and “rows in A but not B”.',
    commonMistakes: [
      {
        title: 'Non-commutative order',
        explanation: 'R − S ≠ S − R. The left operand is the minuend.',
      },
    ],
    workedExample: {
      caption: 'Enrolled students minus those only in course 999.',
      expression: 'π student_id ( Enrolled ) − π student_id ( σ course_id = 999 ( Enrolled ) )',
      inputTables: [
        {
          title: 'student_id 4 dropped',
          columns: ['student_id'],
          rows: [{ student_id: 1 }, { student_id: 2 }],
        },
      ],
      outputTable: {
        title: 'Difference',
        columns: ['student_id'],
        rows: [{ student_id: 1 }, { student_id: 2 }],
      },
    },
    executableExampleId: 'difference-enrolled',
    searchKeywords: ['except', 'minus'],
  },
  {
    id: 'division',
    operatorTypes: ['division'],
    symbol: contract('division').symbol,
    name: contract('division').name,
    classification: 'Derived',
    unicodeSyntax: 'R ÷ S',
    asciiSyntax: 'R div S  or  R / S',
    asciiAliases: contract('division').asciiAliases,
    operandRequirements:
      'Divisor attributes must be a subset of dividend attributes; quotient schema is A − B where A is R’s attributes and B is S’s.',
    outputSchema: 'Tuples x in π_{A−B}(R) such that every tuple in S appears paired with x in R.',
    semantics: contract('division').formalDefinition,
    whenToUse: '“For all” queries—students who took every required course, suppliers who ship every part, etc.',
    commonMistakes: [
      {
        title: 'Divisor not a subset of dividend',
        explanation: 'Every attribute of S must appear on R with compatible types.',
      },
      {
        title: 'Treating division like arithmetic',
        explanation: 'R ÷ S is relational “for all”, not numeric division. Empty divisor returns π_{A−B}(R).',
      },
    ],
    workedExample: {
      caption: 'Students enrolled in course 101 (single-course divisor).',
      expression: 'π student_id, course_id ( Enrolled ) ÷ π course_id ( σ course_id = 101 ( Courses ) )',
      inputTables: [
        {
          title: 'Quotient',
          columns: ['student_id'],
          rows: [{ student_id: 1 }, { student_id: 2 }],
        },
      ],
      outputTable: {
        title: 'All required course_id values satisfied',
        columns: ['student_id'],
        rows: [{ student_id: 1 }, { student_id: 2 }],
      },
    },
    executableExampleId: 'division-course-101',
    searchKeywords: ['for all', 'quotient', 'universal'],
  },
];

const OPERATOR_BY_ID = new Map(REFERENCE_OPERATORS.map((op) => [op.id, op]));

const OPERATOR_BY_TYPE = new Map<OperatorType, ReferenceOperatorDoc>();
for (const op of REFERENCE_OPERATORS) {
  for (const type of op.operatorTypes) {
    OPERATOR_BY_TYPE.set(type, op);
  }
}

export function getOperatorDoc(id: string): ReferenceOperatorDoc | undefined {
  return OPERATOR_BY_ID.get(id);
}

export function getOperatorDocByType(type: OperatorType): ReferenceOperatorDoc | undefined {
  return OPERATOR_BY_TYPE.get(type);
}

export function listOperatorDocs(): ReferenceOperatorDoc[] {
  return REFERENCE_OPERATORS;
}
