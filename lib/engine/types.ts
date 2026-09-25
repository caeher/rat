/**
 * Relational Algebra Language Contract & Type Definitions
 * Version: 1.0.0
 * 
 * Formal TypeScript contracts shared across the editor, parser,
 * in-memory evaluator, SQL translator, and practice exercises.
 */

export const CONTRACT_VERSION = '1.0.0' as const;

// ---------------------------------------------------------------------------
// 1. Lexical and Source Range Positions
// ---------------------------------------------------------------------------

export interface SourcePosition {
  line: number;   // 1-indexed
  column: number; // 1-indexed
  offset: number; // 0-indexed byte/char offset
}

export interface SourceRange {
  start: SourcePosition;
  end: SourcePosition;
}

// ---------------------------------------------------------------------------
// 1.1 Tokens and Lexical Types
// ---------------------------------------------------------------------------

export type TokenType =
  // Special
  | 'EOF'
  // Literals & Identifiers
  | 'IDENTIFIER'
  | 'STRING_LITERAL'
  | 'NUMBER_LITERAL'
  | 'BOOLEAN_LITERAL'
  | 'NULL_LITERAL'
  // Punctuation & Delimiters
  | 'LPAREN'      // (
  | 'RPAREN'      // )
  | 'LBRACKET'    // [
  | 'RBRACKET'    // ]
  | 'COMMA'       // ,
  | 'DOT'         // .
  | 'ARROW'       // -> | → | AS | as
  // Predicate Operators
  | 'EQ'          // = | ==
  | 'NEQ'         // != | <>
  | 'LT'          // <
  | 'LTE'         // <=
  | 'GT'          // >
  | 'GTE'         // >=
  | 'AND'         // AND | and | ∧ | &&
  | 'OR'          // OR | or | ∨ | ||
  | 'NOT'         // NOT | not | ¬ | !
  | 'IS'          // IS | is
  // Relational Algebra Unary Operators
  | 'OP_SELECTION'   // σ | sigma | s | SELECT | \sigma
  | 'OP_PROJECTION'  // π | pi | p | PROJECT | \pi
  | 'OP_RENAME'      // ρ | rho | r | RENAME | \rho | rho_attr | rename_attr
  // Relational Algebra Binary Operators
  | 'OP_CARTESIAN'   // ⨯ | × | * | cross | x | CROSS | \times
  | 'OP_NATURAL_JOIN'// ⋈ | join | natural_join | >< | |><| | \bowtie
  | 'OP_THETA_JOIN'  // theta_join | join_on | JOIN
  | 'OP_LEFT_JOIN'   // ⟕ | left_join | left_outer_join | |>< | \leftouterjoin | \loj
  | 'OP_RIGHT_JOIN'  // ⟖ | right_join | right_outer_join | ><| | \rightouterjoin | \roj
  | 'OP_FULL_JOIN'   // ⟗ | full_join | full_outer_join | |><|* | \fullouterjoin | \foj
  | 'OP_DIVISION'    // ÷ | divide | div | / | \div
  | 'OP_INTERSECT'   // ∩ | intersect | cap | ^ | INTERSECT | \cap
  | 'OP_UNION'       // ∪ | union | cup | U | UNION | \cup
  | 'OP_DIFFERENCE'; // − | - | minus | diff | difference | \ | EXCEPT | \minus | \setminus

export interface Token {
  type: TokenType;
  value: string;
  raw: string;
  range: SourceRange;
}

export interface ValidationResult {
  valid: boolean;
  isIncomplete: boolean;
  ast?: ASTNode;
  schema?: RelationSchema;
  diagnostics: Diagnostic[];
}

// ---------------------------------------------------------------------------
// 2. Diagnostics & Error Codes
// ---------------------------------------------------------------------------

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

export type DiagnosticCode =
  // Syntax and Lexer Errors
  | 'E_SYNTAX_ERROR'
  | 'E_UNEXPECTED_TOKEN'
  | 'E_UNTERMINATED_STRING'
  | 'E_UNMATCHED_PAREN'
  | 'E_INVALID_ESCAPE'
  // Semantic & Schema Errors
  | 'E_UNRESOLVED_RELATION'
  | 'E_UNRESOLVED_ATTRIBUTE'
  | 'E_AMBIGUOUS_ATTRIBUTE'
  | 'E_DUPLICATE_ATTRIBUTE'
  | 'E_TYPE_MISMATCH'
  | 'E_INVALID_PREDICATE'
  // Operator-Specific Compatibility Errors
  | 'E_UNION_INCOMPATIBLE_ARITY'
  | 'E_UNION_INCOMPATIBLE_TYPE'
  | 'E_DIVISION_NOT_SUBSET'
  | 'E_DIVISION_EMPTY_QUOTIENT'
  | 'E_INVALID_RENAME_ARITY'
  | 'E_INVALID_RENAME_TARGET'
  // Warnings & Informational Codes
  | 'W_UNUSED_RELATION'
  | 'W_VACUOUS_EMPTY_DIVISOR'
  | 'W_CROSS_PRODUCT_DUPLICATE_NAMES'
  | 'W_POSSIBLE_NULL_FILTER'
  | 'I_DUPLICATES_ELIMINATED'
  // Runtime evaluation errors (browser evaluator)
  | 'E_RUNTIME_LIMIT'
  | 'E_RUNTIME_ABORTED'
  | 'E_RUNTIME_ERROR'
  // SQL transpilation
  | 'E_SQL_TRANSPILATION'
  | 'E_SQL_UNSUPPORTED';

export interface DiagnosticSuggestion {
  title: string;
  replacement: string;
  range?: SourceRange;
}

export interface Diagnostic {
  code: DiagnosticCode;
  severity: DiagnosticSeverity;
  message: string;
  range: SourceRange;
  suggestion?: DiagnosticSuggestion;
  documentationUrl?: string;
}

// ---------------------------------------------------------------------------
// 3. Schema & Data Model (Set Semantics)
// ---------------------------------------------------------------------------

export type AttributeType = 'string' | 'number' | 'boolean' | 'date' | 'null';

export interface Attribute {
  name: string;
  type: AttributeType;
  nullable?: boolean;
  sourceRelation?: string;
  originalName?: string;
}

export interface RelationSchema {
  name: string;
  attributes: Attribute[];
  primaryKey?: string[];
}

export type TupleValue = string | number | boolean | null;

export interface TypedCell {
  value: TupleValue;
  type: AttributeType;
  isNull: boolean;
}

export type Tuple = Record<string, TupleValue>;

/**
 * A Relation is a strict mathematical set of tuples with a defined schema.
 * All tuples must adhere to the schema types, and duplicates are eliminated.
 */
export interface RelationData {
  schema: RelationSchema;
  tuples: Tuple[];
}

// ---------------------------------------------------------------------------
// 4. Predicate AST for Selection (σ) & Theta Join (⋈_θ)
// ---------------------------------------------------------------------------

export type ComparisonOperator =
  | '='
  | '!='
  | '<>'
  | '<'
  | '<='
  | '>'
  | '>=';

export type LogicalOperator = 'AND' | 'OR' | 'NOT';

export type NullCheckOperator = 'IS NULL' | 'IS NOT NULL';

export type PredicateNodeType =
  | 'comparison'
  | 'logical_binary'
  | 'logical_unary'
  | 'null_check'
  | 'literal'
  | 'identifier';

export interface BasePredicateNode {
  id: string;
  type: PredicateNodeType;
  range: SourceRange;
}

export interface LiteralPredicateNode extends BasePredicateNode {
  type: 'literal';
  value: TupleValue;
  dataType: AttributeType;
  raw: string;
}

export interface IdentifierPredicateNode extends BasePredicateNode {
  type: 'identifier';
  attributeName: string;
  relationQualifier?: string;
}

export interface ComparisonPredicateNode extends BasePredicateNode {
  type: 'comparison';
  operator: ComparisonOperator;
  left: PredicateNode;
  right: PredicateNode;
}

export interface LogicalBinaryPredicateNode extends BasePredicateNode {
  type: 'logical_binary';
  operator: 'AND' | 'OR';
  left: PredicateNode;
  right: PredicateNode;
}

export interface LogicalUnaryPredicateNode extends BasePredicateNode {
  type: 'logical_unary';
  operator: 'NOT';
  operand: PredicateNode;
}

export interface NullCheckPredicateNode extends BasePredicateNode {
  type: 'null_check';
  operator: NullCheckOperator;
  operand: PredicateNode;
}

export type PredicateNode =
  | LiteralPredicateNode
  | IdentifierPredicateNode
  | ComparisonPredicateNode
  | LogicalBinaryPredicateNode
  | LogicalUnaryPredicateNode
  | NullCheckPredicateNode;

// ---------------------------------------------------------------------------
// 5. Relational Algebra AST Nodes
// ---------------------------------------------------------------------------

export type OperatorType =
  | 'selection'          // σ (sigma)
  | 'projection'         // π (pi)
  | 'rename_relation'    // ρ (rho)
  | 'rename_attributes'  // ρ (rho) with attribute mapping
  | 'rename'             // general rename alias
  | 'cartesian_product'  // ⨯ / ×
  | 'natural_join'       // ⋈
  | 'theta_join'         // ⋈_θ
  | 'left_join'          // ⟕ (left outer join)
  | 'right_join'         // ⟖ (right outer join)
  | 'full_join'          // ⟗ (full outer join)
  | 'union'              // ∪
  | 'difference'         // −
  | 'intersection'       // ∩
  | 'division';          // ÷

export type ASTNodeType = OperatorType | 'relation';

export interface BaseASTNode {
  id: string;
  type: ASTNodeType;
  range: SourceRange;
  inferredSchema?: RelationSchema;
}

export interface RelationNode extends BaseASTNode {
  type: 'relation';
  relationName: string;
}

export interface SelectionNode extends BaseASTNode {
  type: 'selection';
  predicate: PredicateNode | string; // Predicate AST or raw condition string
  condition?: string;
  child: ASTNode;
}

export interface ProjectionNode extends BaseASTNode {
  type: 'projection';
  attributes: string[];
  child: ASTNode;
}

export interface RenameRelationNode extends BaseASTNode {
  type: 'rename_relation' | 'rename';
  newRelationName: string;
  renameMap?: Record<string, string>;
  child: ASTNode;
}

export interface RenameAttributesNode extends BaseASTNode {
  type: 'rename_attributes';
  newRelationName?: string;
  attributeMap: Record<string, string>; // oldAttribute -> newAttribute
  child: ASTNode;
}

export interface CartesianProductNode extends BaseASTNode {
  type: 'cartesian_product';
  left: ASTNode;
  right: ASTNode;
}

export interface NaturalJoinNode extends BaseASTNode {
  type: 'natural_join';
  left: ASTNode;
  right: ASTNode;
  commonAttributes?: string[];
}

export interface ThetaJoinNode extends BaseASTNode {
  type: 'theta_join';
  predicate: PredicateNode | string;
  condition?: string;
  left: ASTNode;
  right: ASTNode;
}

export interface LeftOuterJoinNode extends BaseASTNode {
  type: 'left_join';
  predicate?: PredicateNode | string;
  condition?: string;
  left: ASTNode;
  right: ASTNode;
}

export interface RightOuterJoinNode extends BaseASTNode {
  type: 'right_join';
  predicate?: PredicateNode | string;
  condition?: string;
  left: ASTNode;
  right: ASTNode;
}

export interface FullOuterJoinNode extends BaseASTNode {
  type: 'full_join';
  predicate?: PredicateNode | string;
  condition?: string;
  left: ASTNode;
  right: ASTNode;
}

export interface UnionNode extends BaseASTNode {
  type: 'union';
  left: ASTNode;
  right: ASTNode;
}

export interface DifferenceNode extends BaseASTNode {
  type: 'difference';
  left: ASTNode;
  right: ASTNode;
}

export interface IntersectionNode extends BaseASTNode {
  type: 'intersection';
  left: ASTNode;
  right: ASTNode;
}

export interface DivisionNode extends BaseASTNode {
  type: 'division';
  left: ASTNode;  // Dividend
  right: ASTNode; // Divisor
  quotientAttributes?: string[];
}

export type ASTNode =
  | RelationNode
  | SelectionNode
  | ProjectionNode
  | RenameRelationNode
  | RenameAttributesNode
  | CartesianProductNode
  | NaturalJoinNode
  | ThetaJoinNode
  | LeftOuterJoinNode
  | RightOuterJoinNode
  | FullOuterJoinNode
  | UnionNode
  | DifferenceNode
  | IntersectionNode
  | DivisionNode;

// Backward-compatible alias for existing references
export type RelationalNode = ASTNode & {
  relationName?: string;
  condition?: string;
  attributes?: string[];
  renameMap?: Record<string, string>;
  left?: ASTNode;
  right?: ASTNode;
};

// ---------------------------------------------------------------------------
// 6. Evaluation Steps & Query Execution Contracts
// ---------------------------------------------------------------------------

export interface EvaluationStepHighlights {
  /** Row indices emphasized in the step output preview table */
  outputRowIndices?: number[];
  /** Column names emphasized (projection, rename, join widening) */
  emphasizedColumns?: string[];
  /** Input row indices dropped by this step (e.g. selection filter) */
  droppedInputRowIndices?: number[];
}

export interface EvaluationStepInputSummary {
  schema: RelationSchema;
  tupleCount: number;
  previewTuples: Tuple[];
  previewLimited?: boolean;
}

export interface EvaluationStep {
  stepIndex: number;
  nodeId: string;
  range: SourceRange;
  operator: ASTNodeType;
  operatorSymbol: string;
  description: string;
  /** Short teaching explanation for this operator application */
  explanation: string;
  inputSchemas: RelationSchema[];
  inputSummaries?: EvaluationStepInputSummary[];
  outputSchema: RelationSchema;
  outputTupleCount: number;
  outputRelation: RelationData;
  /** True when outputRelation.tuples is truncated for UI retention limits */
  outputPreviewLimited?: boolean;
  tuplesBeforeDeduplication?: number;
  executionTimeMs: number;
  highlights?: EvaluationStepHighlights;
}

export interface EvaluationOptions {
  strictTypeChecking?: boolean;
  /** Record postorder evaluation steps for step-by-step teaching UI. */
  captureTrace?: boolean;
  /** Max rows stored per relation inside each trace step preview. */
  maxTracePreviewRows?: number;
  /** Maximum distinct output tuples (never returned partially when exceeded). */
  maxOutputRows?: number;
  /** Maximum tuples materialized in a single intermediate operator result. */
  maxIntermediateRows?: number;
  /** Budget for nested-loop row comparisons / pairings. */
  maxRowOperations?: number;
  /** Wall-clock budget for evaluation (ms). */
  maxExecutionMs?: number;
  nullEqualityInSetOps?: boolean; // Defaults to true under standard set semantics
  /** @deprecated Use maxOutputRows */
  maxTuples?: number;
}

export interface QueryExecutionResult {
  version: typeof CONTRACT_VERSION;
  success: boolean;
  nodeId?: string;
  rootNodeId?: string;
  ast?: ASTNode;
  schema?: RelationSchema;
  relation?: RelationData;
  steps?: EvaluationStep[];
  diagnostics: Diagnostic[];
  sqlTranslation?: string;
  executionTimeMs?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// 7. Educational Exercise Contracts
// ---------------------------------------------------------------------------

export interface ExerciseDefinition {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  initialSchemas: RelationSchema[];
  initialData?: Record<string, RelationData>;
  expectedOutput: RelationData;
  solutionExpression?: string;
  hint?: string;
}
