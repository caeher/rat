# SQL dialect and transpiler subset

RAT generates **SQLite-compatible** SQL from validated relational algebra. The in-browser compare path executes that SQL via **sql.js** (WebAssembly build of SQLite 3.x).

## Forward translation (RA → SQL)

- Identifiers are double-quoted when needed (`lib/sql/quote.ts`).
- `NULL` uses SQL three-valued logic consistent with the RA evaluator.
- Set operators emit `UNION`, `INTERSECT`, and `EXCEPT` with duplicate elimination matching RA bag/set semantics configured per operator.
- Joins map to explicit `JOIN` / `ON` forms; outer joins use SQLite’s `LEFT OUTER JOIN` patterns.
- Division is emitted only when schemas are provably compatible; otherwise transpilation reports an error instead of guessing.

See operator-by-operator mappings in [LANGUAGE_SPEC.md](./LANGUAGE_SPEC.md) § SQL transpilation.

## Learner SQL subset (quizzes and reverse path)

Quiz SQL answers and the optional **SQL → RA** translator accept a **read-only subset**:

- Single-statement `SELECT` queries (including `DISTINCT`, `WHERE`, joins, grouping where exercises allow).
- No `INSERT`, `UPDATE`, `DELETE`, DDL, or pragma statements (`validateLearnerSql` in `lib/quiz/sql-subset.ts`).

The reverse translator covers the same subset documented in `lib/sql/translate-subset.ts`; unsupported constructs return structured diagnostics rather than partial algebra.

## Parity testing

`test/sql/runtime/parity.test.ts` runs each core operator against the university fixture and asserts algebra results match SQLite execution of transpiled SQL.
