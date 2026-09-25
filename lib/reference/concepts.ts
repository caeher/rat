import type { ReferenceConceptGuide } from './types';

export const REFERENCE_CONCEPTS: ReferenceConceptGuide[] = [
  {
    id: 'set-vs-bag',
    title: 'Set semantics vs SQL bags',
    summary:
      'Relational algebra treats relations as sets of tuples. RAT follows that model in the sandbox evaluator, while everyday SQL often keeps duplicate rows unless you add DISTINCT.',
    sections: [
      {
        heading: 'What changes with set semantics',
        body:
          'Projection, union, intersection, and difference all remove duplicate tuples. Two identical rows collapse to one, and NULL compares equal to NULL when deciding membership.',
      },
      {
        heading: 'Contrast with SQL',
        body:
          'SELECT without DISTINCT can return bags (multisets). RAT’s algebra path matches SELECT DISTINCT-style results for π, ∪, ∩, and −. When comparing to SQL in the sandbox, use the comparison panel to see both paths.',
      },
    ],
    relatedOperatorIds: ['projection', 'union', 'intersection', 'difference'],
    searchKeywords: ['distinct', 'duplicate', 'multiset', 'bag'],
  },
  {
    id: 'nulls-and-3vl',
    title: 'NULLs and three-valued logic',
    summary:
      'Predicates in selection and join conditions evaluate to true, false, or unknown. Unknown rows are filtered out unless you test NULL explicitly.',
    sections: [
      {
        heading: 'Comparisons with NULL',
        body:
          'Any comparison x = NULL (or x < NULL) is unknown, not false. Use IS NULL or IS NOT NULL in σ and join conditions when you mean missing data.',
        table: {
          title: 'Selection truth table (simplified)',
          columns: ['Predicate on row', 'Kept by σ?'],
          rows: [
            { 'Predicate on row': 'salary > 70000 → true', 'Kept by σ?': 'Yes' },
            { 'Predicate on row': 'major_id = NULL → unknown', 'Kept by σ?': 'No' },
            { 'Predicate on row': 'major_id IS NULL → true', 'Kept by σ?': 'Yes' },
          ],
        },
      },
      {
        heading: 'NULL in results',
        body:
          'Outer joins pad non-matching sides with NULL. Set operations treat NULL as a normal value when comparing tuple equality.',
      },
    ],
    relatedOperatorIds: ['selection', 'left-outer-join'],
    searchKeywords: ['unknown', 'is null', '3vl'],
  },
  {
    id: 'union-compatibility',
    title: 'Union-compatible schemas',
    summary:
      'Set operators require both operands to have the same number of attributes and compatible types column-by-column (position matters).',
    sections: [
      {
        heading: 'Rules',
        body:
          'Degree (arity) must match. Attribute types at each position must be compatible—typically identical types, with nullable widening allowed in the engine checks.',
      },
      {
        heading: 'Typical fix',
        body:
          'Project both sides to the same column names before ∪, ∩, or −: π name ( Employees ) ∪ π name ( Professors ). Renaming attributes helps align labels.',
      },
    ],
    relatedOperatorIds: ['union', 'intersection', 'difference'],
    searchKeywords: ['compatible', 'arity', 'schema match'],
  },
  {
    id: 'natural-vs-theta',
    title: 'Natural join vs theta join',
    summary:
      'Natural join equates every pair of identically named attributes. Theta join applies one explicit boolean condition to the cross product.',
    sections: [
      {
        heading: 'When names align',
        body: 'Students ⋈ Majors joins on major_id automatically because both relations expose that name.',
      },
      {
        heading: 'When they do not',
        body:
          'Use Employees ⋈[Employees.dept_id = Departments.dept_id] Departments when you need a predicate that natural join would not infer, or rename columns first.',
      },
    ],
    relatedOperatorIds: ['natural-join', 'theta-join', 'cartesian-product'],
    searchKeywords: ['equi-join', 'condition', 'bowtie'],
  },
  {
    id: 'outer-joins',
    title: 'Outer joins preserve dangling tuples',
    summary:
      'Inner joins drop non-matching rows. Left, right, and full outer joins keep unmatched rows and fill missing columns with NULL.',
    sections: [
      {
        heading: 'Choose the preserved side',
        body: '⟕ keeps the left relation, ⟖ keeps the right, ⟗ keeps both. Swap operands if you picked the wrong side.',
      },
      {
        heading: 'Condition',
        body:
          'Bracket syntax ⟕[θ] works like theta join for matching; unmatched rows still appear with NULL padding on the other side.',
      },
    ],
    relatedOperatorIds: ['left-outer-join', 'right-outer-join', 'full-outer-join'],
    searchKeywords: ['null padding', 'dangling'],
  },
  {
    id: 'renaming-ambiguity',
    title: 'Renaming and ambiguous attributes',
    summary:
      'Duplicate attribute names after ⨯ or joins make predicates ambiguous. Rename relations or attributes before referencing columns.',
    sections: [
      {
        heading: 'Self-join pattern',
        body: 'ρ E1 ( Employees ) ⨯ ρ E2 ( Employees ) then σ E1.salary > E2.salary ( … ) keeps references clear.',
      },
      {
        heading: 'Diagnostics',
        body:
          'E_AMBIGUOUS_ATTRIBUTE means the analyzer cannot pick a column. Add ρ aliases or qualify names with relation aliases where supported.',
      },
    ],
    relatedOperatorIds: ['rename-relation', 'rename-attributes', 'cartesian-product'],
    searchKeywords: ['ambiguous', 'qualify', 'alias'],
  },
  {
    id: 'relational-division',
    title: 'Division as “all required values”',
    summary:
      'R ÷ S keeps values x in the quotient attributes when every tuple in S appears combined with x somewhere in R.',
    sections: [
      {
        heading: 'Mental model',
        body:
          'Think “students who enrolled in every course listed in S” or “suppliers who ship every part type in S”. S supplies the pattern; R must cover all pairings.',
      },
      {
        heading: 'Edge cases',
        body:
          'When S has no rows, the quotient is π_{A−B}(R). When no x covers all of S, the result is empty. Divisor attributes must be a subset of R’s attributes.',
      },
    ],
    relatedOperatorIds: ['division'],
    searchKeywords: ['for all', 'universal', 'quotient'],
  },
];

const CONCEPT_BY_ID = new Map(REFERENCE_CONCEPTS.map((c) => [c.id, c]));

export function getConceptGuide(id: string): ReferenceConceptGuide | undefined {
  return CONCEPT_BY_ID.get(id);
}

export function listConceptGuides(): ReferenceConceptGuide[] {
  return REFERENCE_CONCEPTS;
}
