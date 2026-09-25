/**
 * Relational Algebra Contract Helpers & Semantic Utilities
 * Version: 1.0.0
 * 
 * Implements strict set semantics, 3VL logic, schema inference,
 * union compatibility, relational division validation, and operator definitions.
 */

import {
  Attribute,
  AttributeType,
  DiagnosticCode,
  OperatorType,
  RelationData,
  RelationSchema,
  Tuple,
  TupleValue,
} from './types';

// ---------------------------------------------------------------------------
// 1. Operator Specification & Alias Metadata
// ---------------------------------------------------------------------------

export interface OperatorContractInfo {
  type: OperatorType;
  symbol: string;
  name: string;
  classification: 'Fundamental' | 'Derived' | 'JoinVariant';
  asciiAliases: string[];
  latexAliases: string[];
  precedence: number; // 1 = highest, 5 = lowest
  associativity: 'left' | 'right' | 'none';
  formalDefinition: string;
  description: string;
  sqlEquivalent: string;
}

export const OPERATOR_CONTRACTS: Record<OperatorType, OperatorContractInfo> = {
  selection: {
    type: 'selection',
    symbol: 'σ',
    name: 'Selection (Restrict)',
    classification: 'Fundamental',
    asciiAliases: ['sigma', 's', 'SELECT', 'select'],
    latexAliases: ['\\sigma'],
    precedence: 2,
    associativity: 'right',
    formalDefinition: '{ t ∈ R | P(t) = TRUE }',
    description: 'Filters tuples from relation R that satisfy the proposition P under 3VL logic.',
    sqlEquivalent: 'SELECT DISTINCT * FROM R WHERE <predicate>;',
  },
  projection: {
    type: 'projection',
    symbol: 'π',
    name: 'Projection',
    classification: 'Fundamental',
    asciiAliases: ['pi', 'p', 'PROJECT', 'project'],
    latexAliases: ['\\pi'],
    precedence: 2,
    associativity: 'right',
    formalDefinition: '{ t[a1, ..., an] | t ∈ R }',
    description: 'Extracts specified attributes and eliminates duplicate tuples from the result.',
    sqlEquivalent: 'SELECT DISTINCT a1, a2 FROM R;',
  },
  rename_relation: {
    type: 'rename_relation',
    symbol: 'ρ',
    name: 'Relation Rename',
    classification: 'Fundamental',
    asciiAliases: ['rho', 'r', 'RENAME', 'rename'],
    latexAliases: ['\\rho'],
    precedence: 2,
    associativity: 'right',
    formalDefinition: 'Renames relation R to S',
    description: 'Assigns an alias to an intermediate relation to prevent ambiguity in self-joins.',
    sqlEquivalent: 'SELECT * FROM R AS S;',
  },
  rename_attributes: {
    type: 'rename_attributes',
    symbol: 'ρ',
    name: 'Attribute Rename',
    classification: 'Fundamental',
    asciiAliases: ['rho_attr', 'rename_attr'],
    latexAliases: ['\\rho'],
    precedence: 2,
    associativity: 'right',
    formalDefinition: 'Renames attributes a1...an of relation R to b1...bn',
    description: 'Renames specific attributes within relation R while preserving tuple data.',
    sqlEquivalent: 'SELECT a1 AS b1, a2 AS b2 FROM R;',
  },
  rename: {
    type: 'rename',
    symbol: 'ρ',
    name: 'Rename',
    classification: 'Fundamental',
    asciiAliases: ['rho', 'r', 'RENAME', 'rename'],
    latexAliases: ['\\rho'],
    precedence: 2,
    associativity: 'right',
    formalDefinition: 'Renames relation R to S or its attributes to b1...bn',
    description: 'General relation and attribute renaming operator.',
    sqlEquivalent: 'SELECT a1 AS b1 FROM R AS S;',
  },
  cartesian_product: {
    type: 'cartesian_product',
    symbol: '⨯',
    name: 'Cartesian Product (Cross Join)',
    classification: 'Fundamental',
    asciiAliases: ['cross', '*', 'x', 'CROSS', 'cross_join'],
    latexAliases: ['\\times'],
    precedence: 3,
    associativity: 'left',
    formalDefinition: '{ t ⌢ q | t ∈ R ∧ q ∈ S }',
    description: 'Produces all possible tuple pairings between relations R and S.',
    sqlEquivalent: 'SELECT DISTINCT * FROM R CROSS JOIN S;',
  },
  natural_join: {
    type: 'natural_join',
    symbol: '⋈',
    name: 'Natural Join',
    classification: 'Derived',
    asciiAliases: ['join', 'natural_join', '><', '|><|'],
    latexAliases: ['\\bowtie'],
    precedence: 3,
    associativity: 'left',
    formalDefinition: 'π_Schema(R ∪ S) ( σ_{R.c = S.c} ( R ⨯ S ) )',
    description: 'Equi-join on all identically named attributes between R and S, projecting duplicate columns.',
    sqlEquivalent: 'SELECT DISTINCT * FROM R NATURAL JOIN S;',
  },
  theta_join: {
    type: 'theta_join',
    symbol: '⋈_θ',
    name: 'Theta Join (Conditional Join)',
    classification: 'Derived',
    asciiAliases: ['theta_join', 'join_on', 'JOIN'],
    latexAliases: ['\\bowtie_{cond}'],
    precedence: 3,
    associativity: 'left',
    formalDefinition: 'σ_θ ( R ⨯ S )',
    description: 'Combines tuples from R and S that satisfy join condition θ.',
    sqlEquivalent: 'SELECT DISTINCT * FROM R JOIN S ON <condition>;',
  },
  left_join: {
    type: 'left_join',
    symbol: '⟕',
    name: 'Left Outer Join',
    classification: 'JoinVariant',
    asciiAliases: ['left_join', 'left_outer_join', '|><'],
    latexAliases: ['\\leftouterjoin', '\\loj'],
    precedence: 3,
    associativity: 'left',
    formalDefinition: '( R ⋈ S ) ∪ ( ( R − π_Schema(R)(R ⋈ S) ) ⨯ { (null, ..., null) } )',
    description: 'Preserves all tuples from the left relation R, padding unmatched right attributes with NULL.',
    sqlEquivalent: 'SELECT DISTINCT * FROM R LEFT OUTER JOIN S ON <condition>;',
  },
  right_join: {
    type: 'right_join',
    symbol: '⟖',
    name: 'Right Outer Join',
    classification: 'JoinVariant',
    asciiAliases: ['right_join', 'right_outer_join', '><|'],
    latexAliases: ['\\rightouterjoin', '\\roj'],
    precedence: 3,
    associativity: 'left',
    formalDefinition: '( R ⋈ S ) ∪ ( { (null, ..., null) } ⨯ ( S − π_Schema(S)(R ⋈ S) ) )',
    description: 'Preserves all tuples from the right relation S, padding unmatched left attributes with NULL.',
    sqlEquivalent: 'SELECT DISTINCT * FROM R RIGHT OUTER JOIN S ON <condition>;',
  },
  full_join: {
    type: 'full_join',
    symbol: '⟗',
    name: 'Full Outer Join',
    classification: 'JoinVariant',
    asciiAliases: ['full_join', 'full_outer_join', '|><|*'],
    latexAliases: ['\\fullouterjoin', '\\foj'],
    precedence: 3,
    associativity: 'left',
    formalDefinition: '( R ⟕ S ) ∪ ( R ⟖ S )',
    description: 'Preserves all tuples from both relations R and S, padding non-matching sides with NULL.',
    sqlEquivalent: 'SELECT DISTINCT * FROM R FULL OUTER JOIN S ON <condition>;',
  },
  union: {
    type: 'union',
    symbol: '∪',
    name: 'Set Union',
    classification: 'Fundamental',
    asciiAliases: ['union', 'cup', 'U', '||', 'UNION'],
    latexAliases: ['\\cup'],
    precedence: 5,
    associativity: 'left',
    formalDefinition: '{ t | t ∈ R ∨ t ∈ S }',
    description: 'Combines distinct tuples from union-compatible relations R and S.',
    sqlEquivalent: 'SELECT * FROM R UNION SELECT * FROM S;',
  },
  difference: {
    type: 'difference',
    symbol: '−',
    name: 'Set Difference',
    classification: 'Fundamental',
    asciiAliases: ['minus', 'diff', 'difference', '\\', 'EXCEPT', '-'],
    latexAliases: ['\\minus', '\\setminus'],
    precedence: 5,
    associativity: 'left',
    formalDefinition: '{ t | t ∈ R ∧ t ∉ S }',
    description: 'Yields tuples belonging to relation R that do not appear in union-compatible relation S.',
    sqlEquivalent: 'SELECT * FROM R EXCEPT SELECT * FROM S;',
  },
  intersection: {
    type: 'intersection',
    symbol: '∩',
    name: 'Set Intersection',
    classification: 'Derived',
    asciiAliases: ['intersect', 'cap', '^', 'INTERSECT'],
    latexAliases: ['\\cap'],
    precedence: 4,
    associativity: 'left',
    formalDefinition: 'R − (R − S)',
    description: 'Yields tuples appearing in both union-compatible relations R and S.',
    sqlEquivalent: 'SELECT * FROM R INTERSECT SELECT * FROM S;',
  },
  division: {
    type: 'division',
    symbol: '÷',
    name: 'Relational Division',
    classification: 'Derived',
    asciiAliases: ['divide', 'div', '/'],
    latexAliases: ['\\div'],
    precedence: 3,
    associativity: 'left',
    formalDefinition: 'π_{A - B}(R) − π_{A - B}((π_{A - B}(R) ⨯ S) − R)',
    description: 'Universal quantification operator: finds tuples in R(A - B) associated with all tuples in S(B).',
    sqlEquivalent: 'SELECT DISTINCT r1.A FROM R AS r1 WHERE NOT EXISTS (SELECT * FROM S AS s WHERE NOT EXISTS (SELECT * FROM R AS r2 WHERE r2.A = r1.A AND r2.B = s.B));',
  },
};

// ---------------------------------------------------------------------------
// 2. Set Semantics: Tuple & Relation Equality
// ---------------------------------------------------------------------------

/**
 * Compares two cell values under Relational Set Semantics.
 * In RA set operations (UNION, INTERSECT, EXCEPT, duplicate elimination),
 * NULL is equal to NULL (i.e. (1, NULL) == (1, NULL)).
 */
export function areCellValuesEqual(
  v1: TupleValue,
  v2: TupleValue,
  nullEqualsNull = true
): boolean {
  if (v1 === null && v2 === null) {
    return nullEqualsNull;
  }
  if (v1 === null || v2 === null) {
    return false;
  }
  return v1 === v2;
}

/**
 * Checks whether two tuples are identical under a given schema.
 */
export function areTuplesEqual(
  t1: Tuple,
  t2: Tuple,
  schema?: RelationSchema,
  nullEqualsNull = true
): boolean {
  if (!t1 || !t2) return false;

  const keys = schema
    ? schema.attributes.map((a) => a.name)
    : Array.from(new Set([...Object.keys(t1), ...Object.keys(t2)]));

  for (const key of keys) {
    if (!areCellValuesEqual(t1[key], t2[key], nullEqualsNull)) {
      return false;
    }
  }
  return true;
}

/**
 * Serializes a tuple to a deterministic string key for fast hashing / deduplication.
 */
export function tupleToKey(tuple: Tuple, schema?: RelationSchema): string {
  const keys = schema
    ? schema.attributes.map((a) => a.name)
    : Object.keys(tuple).sort();

  return keys
    .map((k) => {
      const v = tuple[k];
      if (v === null || v === undefined) return '__NULL__';
      return `${typeof v}:${String(v)}`;
    })
    .join('|#|');
}

/**
 * Eliminates duplicate tuples from a list, enforcing strict mathematical set semantics.
 */
export function deduplicateTuples(
  tuples: Tuple[],
  schema: RelationSchema
): Tuple[] {
  const seen = new Set<string>();
  const distinct: Tuple[] = [];

  for (const tuple of tuples) {
    // Canonicalize tuple according to schema attributes
    const canonical: Tuple = {};
    for (const attr of schema.attributes) {
      canonical[attr.name] = tuple[attr.name] !== undefined ? tuple[attr.name] : null;
    }

    const key = tupleToKey(canonical, schema);
    if (!seen.has(key)) {
      seen.add(key);
      distinct.push(canonical);
    }
  }

  return distinct;
}

/**
 * Checks whether two relations are equal under set semantics.
 * Row ordering is irrelevant: R1 == R2 iff |R1| == |R2| and every tuple in R1 is in R2.
 */
export function areRelationsEqual(
  r1: RelationData,
  r2: RelationData
): boolean {
  if (!r1 || !r2) return false;

  // Verify attribute counts and names (or union compatibility)
  if (r1.schema.attributes.length !== r2.schema.attributes.length) {
    return false;
  }

  const r1Attrs = r1.schema.attributes.map((a) => a.name);
  const r2Attrs = r2.schema.attributes.map((a) => a.name);

  // Exact attribute name matching
  for (let i = 0; i < r1Attrs.length; i++) {
    if (r1Attrs[i] !== r2Attrs[i]) return false;
  }

  const d1 = deduplicateTuples(r1.tuples, r1.schema);
  const d2 = deduplicateTuples(r2.tuples, r2.schema);

  if (d1.length !== d2.length) return false;

  const set2Keys = new Set(d2.map((t) => tupleToKey(t, r2.schema)));
  for (const t1 of d1) {
    if (!set2Keys.has(tupleToKey(t1, r1.schema))) {
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// 3. Three-Valued Logic (3VL) Predicate Helpers
// ---------------------------------------------------------------------------

export function evaluate3VLAnd(
  a: boolean | null,
  b: boolean | null
): boolean | null {
  if (a === false || b === false) return false;
  if (a === true && b === true) return true;
  return null; // UNKNOWN
}

export function evaluate3VLOr(
  a: boolean | null,
  b: boolean | null
): boolean | null {
  if (a === true || b === true) return true;
  if (a === false && b === false) return false;
  return null; // UNKNOWN
}

export function evaluate3VLNot(a: boolean | null): boolean | null {
  if (a === true) return false;
  if (a === false) return true;
  return null; // UNKNOWN
}

// ---------------------------------------------------------------------------
// 4. Schema Compatibility & Operator Inference Helpers
// ---------------------------------------------------------------------------

/**
 * Checks union compatibility between relations R and S.
 * Conditions:
 * 1. Same degree (arity)
 * 2. Compatible types at each position i
 */
export function checkUnionCompatibility(
  s1: RelationSchema,
  s2: RelationSchema
): {
  compatible: boolean;
  error?: string;
  diagnostic?: DiagnosticCode;
} {
  if (s1.attributes.length !== s2.attributes.length) {
    return {
      compatible: false,
      diagnostic: 'E_UNION_INCOMPATIBLE_ARITY',
      error: `Union compatibility failed: Relation '${s1.name}' has degree ${s1.attributes.length}, but '${s2.name}' has degree ${s2.attributes.length}.`,
    };
  }

  for (let i = 0; i < s1.attributes.length; i++) {
    const t1 = s1.attributes[i].type;
    const t2 = s2.attributes[i].type;

    if (t1 !== t2 && t1 !== 'null' && t2 !== 'null') {
      return {
        compatible: false,
        diagnostic: 'E_UNION_INCOMPATIBLE_TYPE',
        error: `Union compatibility failed at position ${i + 1}: attribute '${s1.attributes[i].name}' (${t1}) does not match '${s2.attributes[i].name}' (${t2}).`,
      };
    }
  }

  return { compatible: true };
}

/**
 * Checks relational division compatibility for R(A) ÷ S(B).
 * Divisor attributes B must be a non-empty strict subset of dividend attributes A.
 */
export function checkDivisionCompatibility(
  dividend: RelationSchema,
  divisor: RelationSchema
): {
  compatible: boolean;
  quotientAttributes: Attribute[];
  error?: string;
  diagnostic?: DiagnosticCode;
} {
  const dividendMap = new Map<string, AttributeType>(
    dividend.attributes.map((a) => [a.name, a.type])
  );

  if (divisor.attributes.length === 0) {
    // Empty divisor schema edge case: quotient schema is all of dividend
    return {
      compatible: true,
      quotientAttributes: [...dividend.attributes],
    };
  }

  const divisorNames = new Set(divisor.attributes.map((a) => a.name));

  // Verify all divisor attributes exist in dividend with compatible types
  for (const b of divisor.attributes) {
    const aType = dividendMap.get(b.name);
    if (!aType) {
      return {
        compatible: false,
        diagnostic: 'E_DIVISION_NOT_SUBSET',
        quotientAttributes: [],
        error: `Division failed: divisor attribute '${b.name}' does not exist in dividend relation '${dividend.name}'.`,
      };
    }
    if (aType !== b.type && aType !== 'null' && b.type !== 'null') {
      return {
        compatible: false,
        diagnostic: 'E_DIVISION_NOT_SUBSET',
        quotientAttributes: [],
        error: `Division failed: divisor attribute '${b.name}' type (${b.type}) does not match dividend type (${aType}).`,
      };
    }
  }

  // Quotient attributes X = A \ B
  const quotientAttributes = dividend.attributes.filter(
    (a) => !divisorNames.has(a.name)
  );

  if (quotientAttributes.length === 0) {
    return {
      compatible: false,
      diagnostic: 'E_DIVISION_EMPTY_QUOTIENT',
      quotientAttributes: [],
      error: `Division failed: divisor attributes cover all dividend attributes, leaving an empty quotient schema.`,
    };
  }

  return {
    compatible: true,
    quotientAttributes,
  };
}

/**
 * Infers the output schema for Natural Join R ⋈ S.
 * Preserves common attributes first, then remaining R attributes, then remaining S attributes.
 */
export function inferNaturalJoinSchema(
  s1: RelationSchema,
  s2: RelationSchema,
  outputName = `${s1.name}_⋈_${s2.name}`
): { schema: RelationSchema; commonAttributes: string[] } {
  const s2Map = new Map(s2.attributes.map((a) => [a.name, a]));
  const commonAttributes: string[] = [];
  const s1Only: Attribute[] = [];
  const common: Attribute[] = [];

  for (const a1 of s1.attributes) {
    if (s2Map.has(a1.name)) {
      commonAttributes.push(a1.name);
      common.push({
        name: a1.name,
        type: a1.type,
        nullable: a1.nullable || s2Map.get(a1.name)?.nullable,
      });
    } else {
      s1Only.push(a1);
    }
  }

  const s1Names = new Set(s1.attributes.map((a) => a.name));
  const s2Only = s2.attributes.filter((a2) => !s1Names.has(a2.name));

  return {
    schema: {
      name: outputName,
      attributes: [...common, ...s1Only, ...s2Only],
    },
    commonAttributes,
  };
}

/**
 * Infers schema nullability for Outer Joins (Left, Right, Full Outer Join).
 */
export function inferOuterJoinSchema(
  s1: RelationSchema,
  s2: RelationSchema,
  joinType: 'left' | 'right' | 'full',
  outputName = `${s1.name}_outer_${s2.name}`
): RelationSchema {
  const s1Attrs = s1.attributes.map((a) => ({
    ...a,
    nullable: joinType === 'right' || joinType === 'full' ? true : a.nullable,
  }));

  const s2Attrs = s2.attributes.map((a) => ({
    ...a,
    nullable: joinType === 'left' || joinType === 'full' ? true : a.nullable,
  }));

  return {
    name: outputName,
    attributes: [...s1Attrs, ...s2Attrs],
  };
}

/**
 * Infers schema for Projection π_{a1, ..., an}(R).
 */
export function inferProjectionSchema(
  inputSchema: RelationSchema,
  projectedAttributes: string[]
): { schema: RelationSchema; missingAttributes: string[] } {
  const attrMap = new Map(inputSchema.attributes.map((a) => [a.name, a]));
  const outputAttrs: Attribute[] = [];
  const missingAttributes: string[] = [];

  for (const attrName of projectedAttributes) {
    const attr = attrMap.get(attrName);
    if (attr) {
      outputAttrs.push(attr);
    } else {
      missingAttributes.push(attrName);
    }
  }

  return {
    schema: {
      name: `π_${inputSchema.name}`,
      attributes: outputAttrs,
    },
    missingAttributes,
  };
}

/**
 * Infers schema for Relation & Attribute Renaming ρ.
 */
export function inferRenameSchema(
  inputSchema: RelationSchema,
  newRelationName?: string,
  attributeMap?: Record<string, string>
): RelationSchema {
  const attributes = inputSchema.attributes.map((attr) => {
    if (attributeMap && attributeMap[attr.name]) {
      return {
        ...attr,
        name: attributeMap[attr.name],
        originalName: attr.originalName || attr.name,
      };
    }
    return attr;
  });

  return {
    name: newRelationName || inputSchema.name,
    attributes,
    primaryKey: inputSchema.primaryKey,
  };
}
