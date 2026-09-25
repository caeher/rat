/**
 * Relational Algebra AST and Execution Types
 * Foundational boundaries for pure client-side RA parsing and query evaluation.
 */

export type AttributeType = 'string' | 'number' | 'boolean' | 'date';

export interface Attribute {
  name: string;
  type: AttributeType;
}

export interface RelationSchema {
  name: string;
  attributes: Attribute[];
  primaryKey?: string[];
}

export type TupleValue = string | number | boolean | null;
export type Tuple = Record<string, TupleValue>;

export interface RelationData {
  schema: RelationSchema;
  tuples: Tuple[];
}

// Relational Algebra Operators
export type OperatorType =
  | 'selection'        // σ (sigma)
  | 'projection'       // π (pi)
  | 'rename'           // ρ (rho)
  | 'cartesian_product'// ⨯ (cross)
  | 'natural_join'     // ⋈ (bowtie)
  | 'theta_join'       // ⋈_θ
  | 'union'            // ∪ (cup)
  | 'difference'       // − (minus)
  | 'intersection'     // ∩ (cap)
  | 'division';        // ÷

export interface RelationalNode {
  id: string;
  type: OperatorType | 'relation';
  relationName?: string;
  condition?: string;
  attributes?: string[];
  renameMap?: Record<string, string>;
  left?: RelationalNode;
  right?: RelationalNode;
}

export interface QueryExecutionResult {
  nodeId: string;
  success: boolean;
  relation?: RelationData;
  executionTimeMs?: number;
  error?: string;
}

export interface ExerciseDefinition {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  initialSchemas: RelationSchema[];
  expectedOutput: RelationData;
  hint?: string;
}
