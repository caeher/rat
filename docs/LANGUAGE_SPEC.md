# Relational Algebra Language Specification (RAT Contract v1.0.0)

> **Status:** Normative Specification  
> **Version:** `1.0.0`  
> **Target Systems:** RAT Query Editor, AST Lexer/Parser, In-Memory Evaluator, ANSI SQL Transpiler, Practice Exercises, and Reference Docs.

---

## 1. Overview & Architectural Scope

This specification establishes the authoritative, versioned language contract for the **Relational Algebra Translator (RAT)**. It defines the formal syntax, Unicode characters, ASCII/LaTeX aliases, lexical rules, operator precedence, set-theoretic semantics, three-valued logic (3VL), relational division behavior, and SQL transpilation targets.

All client-side components in RAT must strictly adhere to this contract to guarantee deterministic query evaluation, uniform error reporting, and identical behavior across interactive lessons.

---

## 2. Operator Syntax & Alias Matrix

RAT supports both standard mathematical Unicode notations and ASCII/LaTeX aliases for accessible keyboard input.

| Operator Name | Unicode | ASCII / Keyword Aliases | LaTeX Alias | Precedence | Associativity | Arity | Form / Classification |
|---|:---:|---|---|:---:|:---:|:---:|---|
| **Selection (Restrict)** | `σ` | `sigma`, `s`, `SELECT` | `\sigma` | 2 | Right | Unary | $\sigma_{P}(R)$ |
| **Projection** | `π` | `pi`, `p`, `PROJECT` | `\pi` | 2 | Right | Unary | $\pi_{a_1, \dots, a_n}(R)$ |
| **Relation Rename** | `ρ` | `rho`, `r`, `RENAME` | `\rho` | 2 | Right | Unary | $\rho_{S}(R)$ |
| **Attribute Rename** | `ρ` | `rho_attr`, `rename_attr` | `\rho` | 2 | Right | Unary | $\rho_{a_1 \to b_1, \dots}(R)$ |
| **Cartesian Product** | `⨯`, `×` | `cross`, `*`, `x`, `CROSS` | `\times` | 3 | Left | Binary | $R \times S$ |
| **Natural Join** | `⋈` | `join`, `natural_join`, `><`, `\|><\|` | `\bowtie` | 3 | Left | Binary | $R \bowtie S$ |
| **Theta Join** | `⋈_θ` | `theta_join`, `join_on`, `JOIN` | `\bowtie_{cond}` | 3 | Left | Binary | $R \bowtie_{\theta} S$ |
| **Left Outer Join** | `⟕` | `left_join`, `left_outer_join`, `\|><` | `\leftouterjoin`, `\loj` | 3 | Left | Binary | $R \mathbin{⟕} S$ |
| **Right Outer Join** | `⟖` | `right_join`, `right_outer_join`, `><\|` | `\rightouterjoin`, `\roj` | 3 | Left | Binary | $R \mathbin{⟖} S$ |
| **Full Outer Join** | `⟗` | `full_join`, `full_outer_join`, `\|><\|*` | `\fullouterjoin`, `\foj` | 3 | Left | Binary | $R \mathbin{⟗} S$ |
| **Relational Division** | `÷` | `divide`, `div`, `/` | `\div` | 3 | Left | Binary | $R \div S$ |
| **Set Intersection** | `∩` | `intersect`, `cap`, `^`, `INTERSECT` | `\cap` | 4 | Left | Binary | $R \cap S$ |
| **Set Union** | `∪` | `union`, `cup`, `U`, `\|\|`, `UNION` | `\cup` | 5 | Left | Binary | $R \cup S$ |
| **Set Difference** | `−` | `minus`, `diff`, `difference`, `\`, `EXCEPT`, `-` | `\minus`, `\setminus` | 5 | Left | Binary | $R - S$ |

---

## 3. Lexical & Grammar Specification (EBNF)

### 3.1 Operator Precedence & Associativity

1. **Level 1 (Highest): Parentheses** `( ... )`
2. **Level 2 (Unary Operators):** `σ`, `π`, `ρ` (evaluated right-to-left over their argument)
3. **Level 3 (Multiplicative & Join Operators):** `⨯`, `÷`, `⋈`, `⋈_θ`, `⟕`, `⟖`, `⟗` (Left-associative)
4. **Level 4 (Intersection):** `∩` (Left-associative)
5. **Level 5 (Lowest - Additive / Difference):** `∪`, `−` (Left-associative)

### 3.2 Formal EBNF Grammar

```ebnf
Expression         ::= SetDifferenceExpr ;

SetDifferenceExpr  ::= SetUnionExpr ( ( "−" | "-" | "minus" | "diff" | "\minus" | "\setminus" ) SetUnionExpr )* ;

SetUnionExpr       ::= IntersectExpr ( ( "∪" | "union" | "cup" | "U" | "||" | "\cup" ) IntersectExpr )* ;

IntersectExpr      ::= JoinExpr ( ( "∩" | "intersect" | "cap" | "^" | "\cap" ) JoinExpr )* ;

JoinExpr           ::= PrimaryExpr ( JoinOperator PrimaryExpr )* ;

JoinOperator       ::= ( "⋈" | "join" | "natural_join" | "><" | "|><|" | "\bowtie" )
                     | ( ( "⋈" | "theta_join" | "join_on" | "\bowtie" ) "[" Predicate "]" )
                     | ( "⟕" | "left_join" | "left_outer_join" | "|><" | "\leftouterjoin" | "\loj" ) ( "[" Predicate "]" )?
                     | ( "⟖" | "right_join" | "right_outer_join" | "><|" | "\rightouterjoin" | "\roj" ) ( "[" Predicate "]" )?
                     | ( "⟗" | "full_join" | "full_outer_join" | "|><|*" | "\fullouterjoin" | "\foj" ) ( "[" Predicate "]" )?
                     | ( "⨯" | "×" | "*" | "cross" | "x" | "\times" )
                     | ( "÷" | "divide" | "div" | "/" | "\div" ) ;

PrimaryExpr        ::= RelationReference
                     | SelectionExpr
                     | ProjectionExpr
                     | RenameExpr
                     | "(" Expression ")" ;

SelectionExpr      ::= ( "σ" | "sigma" | "s" | "SELECT" | "\sigma" ) ( "[" Predicate "]" | Predicate ) "(" Expression ")" ;

ProjectionExpr     ::= ( "π" | "pi" | "p" | "PROJECT" | "\pi" ) ( "[" AttributeList "]" | AttributeList ) "(" Expression ")" ;

RenameExpr         ::= ( "ρ" | "rho" | "r" | "RENAME" | "\rho" ) ( "[" RenameSpec "]" | RenameSpec ) "(" Expression ")" ;

RenameSpec         ::= Identifier ( "(" AttributeList ")" )?
                     | AttributeRenameList ;

AttributeRenameList::= AttributeRename ( "," AttributeRename )* ;
AttributeRename    ::= Identifier ( "->" | "→" | "AS" | "as" ) Identifier ;

RelationReference  ::= Identifier ;
AttributeList      ::= Identifier ( "," Identifier )* ;
```

### 3.3 Predicate Expressions & Three-Valued Logic (3VL)

```ebnf
Predicate          ::= OrPredicate ;
OrPredicate        ::= AndPredicate ( ( "OR" | "or" | "∨" | "||" ) AndPredicate )* ;
AndPredicate       ::= NotPredicate ( ( "AND" | "and" | "∧" | "&&" ) NotPredicate )* ;
NotPredicate       ::= ( "NOT" | "not" | "¬" | "!" )? ComparisonPredicate ;

ComparisonPredicate::= ValueExpr ( CompOp ValueExpr | NullOp )
                     | "(" Predicate ")" ;

CompOp             ::= "=" | "==" | "!=" | "<>" | "<" | "<=" | ">" | ">=" ;
NullOp             ::= "IS" "NULL" | "IS" "NOT" "NULL" ;

ValueExpr          ::= QualifiedIdentifier | Literal ;
QualifiedIdentifier::= ( Identifier "." )? Identifier ;
Literal            ::= StringLiteral | NumericLiteral | BooleanLiteral | "NULL" ;
```

---

## 4. Lexical Conventions & Literal Escaping

1. **Identifiers**:
   - Relation names and attribute names match `[A-Za-z_][A-Za-z0-9_]*`.
   - Quoted identifiers: Backtick (`` `First Name` ``) or double quotes (`"First Name"`) support spaces or reserved keywords.
2. **String Literals**:
   - Delimited by single quotes (`'Engineering'`) or double quotes (`"Engineering"`).
   - Standard escapes: `\'`, `\"`, `\\`, `\n`, `\t`.
3. **Numeric Literals**:
   - Integers (`42`, `-10`), floating point (`3.1415`), scientific notation (`1e6`).
4. **Boolean & Null Literals**:
   - `TRUE`, `FALSE`, `NULL` (case-insensitive).
5. **Case Sensitivity Rules**:
   - **Identifiers**: Case-preserving (exact match against schema).
   - **Keywords & Operator Aliases**: Case-insensitive (`SELECT`, `select`, `JOIN`, `join`, `AND`, `and`).

---

## 5. Formal Semantics & Operator Rules

### 5.1 Explicit Mathematical Set Semantics
1. **Duplicate Elimination**:
   - Relational algebra operates on strict mathematical sets: relations never contain duplicate tuples.
   - All operators ($\pi$, $\cup$, $\cap$, $-$, $\bowtie$, etc.) eliminate duplicate tuples from their results.
2. **Preserved Output Column Order**:
   - **Base Relations**: Declared schema order.
   - **Projection $\pi_{a_1, \dots, a_k}(R)$**: Exact order of specified attributes $a_1, \dots, a_k$.
   - **Cartesian Product $R \times S$**: All attributes of $R$ in order, followed by all attributes of $S$ in order.
   - **Natural Join $R \bowtie S$**: Common attributes $C$ first, followed by remaining $R$-only attributes, followed by $S$-only attributes.
   - **Set Operations ($R \cup S, R \cap S, R - S$)**: Preserves left relation $R$'s attribute names and order.
3. **Row Ordering Irrelevance**:
   - Rows are unordered sets. Two relations $R_1$ and $R_2$ are equal ($R_1 = R_2$) iff:
     $$|R_1| = |R_2| \quad \land \quad \forall t \in R_1, t \in R_2$$

### 5.2 Three-Valued Logic (3VL) for NULL Handling
- **Comparison with NULL**: Any comparison involving `NULL` (`x = NULL`, `x != NULL`, `x > NULL`) produces `UNKNOWN`.
- **Selection Filtering**: A tuple $t$ is included in $\sigma_P(R)$ **if and only if** $P(t) = \text{TRUE}$. Tuples evaluating to `FALSE` or `UNKNOWN` are filtered out.
- **Set Operations Equality**: When evaluating set uniqueness for $\cup, \cap, -$, and duplicate elimination, `NULL` equals `NULL` (i.e., `(1, NULL) == (1, NULL)`).

### 5.3 Union Compatibility
Relations $R$ and $S$ are union-compatible for $R \cup S$, $R \cap S$, and $R - S$ iff:
1. **Degree Match**: $|attributes(R)| = |attributes(S)|$.
2. **Domain Match**: At each position $i \in \{1, \dots, n\}$, $type(R.attr_i) = type(S.attr_i)$.

### 5.4 Outer Join Semantics & Nullability
- **Left Outer Join ($R \mathbin{⟕} S$)**: All tuples from $R$ are preserved. Unmatched tuples receive `NULL` for all $S$ attributes. Output schema marks $S$ attributes as `nullable: true`.
- **Right Outer Join ($R \mathbin{⟖} S$)**: All tuples from $S$ are preserved. Unmatched tuples receive `NULL` for all $R$ attributes. Output schema marks $R$ attributes as `nullable: true`.
- **Full Outer Join ($R \mathbin{⟗} S$)**: All tuples from both $R$ and $S$ are preserved. Unmatched attributes from either side receive `NULL`. All attributes are marked `nullable: true`.

---

## 6. Relational Division ($R \div S$)

Let $R(A)$ and $S(B)$ be relations where $B \subset A$ and $B \neq \emptyset$.
Let $X = A \setminus B$ be the quotient attributes.

### 6.1 Formal Definition
$$R \div S = \pi_X(R) \setminus \pi_X\left( (\pi_X(R) \times S) \setminus R \right)$$

Universal Quantification:
$$t \in R \div S \iff \forall s \in S, \; (t \circ s) \in R$$

### 6.2 Edge Cases
1. **Empty Divisor ($S = \emptyset$)**:
   - Universal quantification over an empty set is vacuously `TRUE` for all tuples in the dividend.
   - Result: $\pi_X(R)$ (or $\pi_A(R)$ if $B = \emptyset$).
2. **Empty Dividend ($R = \emptyset$)**:
   - Result: $\emptyset$ with schema $X$.
3. **Divisor Attributes Not a Subset of Dividend ($B \not\subset A$)**:
   - Static error: `E_DIVISION_NOT_SUBSET`.
4. **Divisor Covers All Attributes ($B = A$)**:
   - Static error: `E_DIVISION_EMPTY_QUOTIENT` (quotient schema would have degree 0).

---

## 7. Concrete Valid and Invalid Examples

### 7.1 Valid Expressions

1. **Basic Selection & Projection**:
   ```ra
   π name, salary ( σ salary > 50000 ( Employees ) )
   ```
2. **ASCII Aliases & Cascaded Selection**:
   ```ra
   project[name, dept_name](sigma[salary > 60000 and dept_id = 1](Employees join Departments))
   ```
3. **Relation & Attribute Renaming**:
   ```ra
   ρ E(emp_id, full_name, dept_id, comp) ( Employees )
   ```
   ```ra
   ρ[name -> employee_name, salary -> wage](Employees)
   ```
4. **Theta Join with Explicit Predicate**:
   ```ra
   Employees ⋈[Employees.dept_id = Departments.dept_id] Departments
   ```
5. **Left / Right / Full Outer Joins**:
   ```ra
   Employees ⟕ Departments
   ```
   ```ra
   Employees full_join Departments
   ```
6. **Set Operations with Union Compatibility**:
   ```ra
   ( π name ( Instructors ) ) ∪ ( π name ( Students ) )
   ```
7. **Relational Division (Universal Quantification)**:
   ```ra
   Enrollments ÷ CoreCourses
   ```

### 7.2 Invalid Expressions & Diagnostic Codes

1. **Unresolved Relation Name**:
   - Expression: `σ id > 10 ( NonExistentTable )`
   - Diagnostic: `E_UNRESOLVED_RELATION: Relation 'NonExistentTable' does not exist.`
2. **Unresolved Attribute in Projection**:
   - Expression: `π nonexistent_column ( Employees )`
   - Diagnostic: `E_UNRESOLVED_ATTRIBUTE: Attribute 'nonexistent_column' not found in relation 'Employees'.`
3. **Ambiguous Column in Join**:
   - Expression: `π id ( Employees × Departments )`
   - Diagnostic: `E_AMBIGUOUS_ATTRIBUTE: Attribute 'id' is ambiguous across relations 'Employees' and 'Departments'. Qualify with relation name.`
4. **Union Incompatible Arity**:
   - Expression: `Employees ∪ ( π name ( Employees ) )`
   - Diagnostic: `E_UNION_INCOMPATIBLE_ARITY: Degree mismatch: Left has degree 4, Right has degree 1.`
5. **Union Incompatible Types**:
   - Expression: `( π name ( Employees ) ) ∪ ( π salary ( Employees ) )`
   - Diagnostic: `E_UNION_INCOMPATIBLE_TYPE: Type mismatch at position 1: 'string' vs 'number'.`
6. **Division with Incompatible Subset**:
   - Expression: `Enrollments ÷ ( π salary ( Employees ) )`
   - Diagnostic: `E_DIVISION_NOT_SUBSET: Divisor attribute 'salary' does not exist in dividend relation 'Enrollments'.`

---

## 8. SQL Execution Dialect & Engine Assessment

### 8.1 SQL Transpilation Dialect
Target: **ANSI SQL:1999** with **SQLite 3.39+** compatibility.

| RA Operator | SQL Mapping |
|---|---|
| $\sigma_P(R)$ | `SELECT DISTINCT * FROM R WHERE P` |
| $\pi_{a_1, a_2}(R)$ | `SELECT DISTINCT a1, a2 FROM R` |
| $\rho_{S}(R)$ | `SELECT * FROM R AS S` |
| $R \times S$ | `SELECT DISTINCT * FROM R CROSS JOIN S` |
| $R \bowtie S$ | `SELECT DISTINCT * FROM R NATURAL JOIN S` |
| $R \bowtie_P S$ | `SELECT DISTINCT * FROM R JOIN S ON P` |
| $R \mathbin{⟕} S$ | `SELECT DISTINCT * FROM R LEFT OUTER JOIN S` |
| $R \mathbin{⟖} S$ | `SELECT DISTINCT * FROM R RIGHT OUTER JOIN S` |
| $R \mathbin{⟗} S$ | `SELECT DISTINCT * FROM R FULL OUTER JOIN S` |
| $R \cup S$ | `SELECT * FROM R UNION SELECT * FROM S` |
| $R \cap S$ | `SELECT * FROM R INTERSECT SELECT * FROM S` |
| $R - S$ | `SELECT * FROM R EXCEPT SELECT * FROM S` |
| $R(X, Y) \div S(Y)$ | `SELECT DISTINCT r1.X FROM R AS r1 WHERE NOT EXISTS (SELECT * FROM S AS s WHERE NOT EXISTS (SELECT * FROM R AS r2 WHERE r2.X = r1.X AND r2.Y = s.Y))` |

### 8.2 Browser-Compatible Engine Assessment

1. **Custom Pure TypeScript In-Memory Engine (Primary Execution Engine)**:
   - **Footprint**: ~12 KB bundle size, zero external dependencies.
   - **Capabilities**: Step-by-step AST execution visualization, sub-millisecond evaluation, precise source range error diagnostics, and native 3VL set semantics.
   - **Verdict**: Optimal for client-side sandbox and educational AST tree visualizer.
2. **SQLite WASM / SQL Transpiler (SQL Verification Engine)**:
   - **Footprint**: Compiled WebAssembly runner via Web Worker.
   - **Capabilities**: Verifies that RAT's SQL generation translates accurately into standard SQL engine execution.
   - **Verdict**: Dual-engine strategy: In-memory TS engine evaluates RA ASTs; SQLite WASM validates generated SQL queries.

### 8.3 Explicit Non-Supported SQL Boundaries
The following SQL concepts are outside pure Relational Algebra and will produce explicit diagnostic errors if attempted:
- Aggregations (`COUNT`, `SUM`, `AVG`, `GROUP BY`, `HAVING`)
- Result ordering (`ORDER BY`) — mathematical sets are unordered
- Pagination / Slicing (`LIMIT`, `OFFSET`)
- Mutations (`INSERT`, `UPDATE`, `DELETE`, `CREATE TABLE`)
- Window functions and recursive CTEs
