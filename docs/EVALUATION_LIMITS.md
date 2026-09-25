# Relational Algebra Evaluation Limits

The in-browser RA evaluator runs in a dedicated Web Worker with hard caps so explosive joins or Cartesian products cannot freeze the GitHub Pages UI. When a limit is hit, evaluation fails with an actionable `E_RUNTIME_LIMIT` diagnostic — **partial result sets are never shown as complete answers**.

| Limit | Default | Purpose |
| --- | --- | --- |
| `maxOutputRows` | 10,000 | Final result tuple count after duplicate elimination |
| `maxIntermediateRows` | 25,000 | Any single operator’s materialized row count |
| `maxRowOperations` | 2,000,000 | Nested-loop pairings (joins, selections, division checks) |
| `maxExecutionMs` | 15,000 | Wall-clock budget inside the worker |
| `maxTracePreviewRows` | 200 | Rows retained per relation in step-by-step trace previews |

Constants live in `lib/evaluator/limits.ts`. Override via `EvaluationOptions` for tests only.

## Step-by-step trace

When `captureTrace: true` is passed in `EvaluationOptions` (the sandbox Run action does this), the evaluator records a **postorder** list of `EvaluationStep` objects: each step includes the AST node id, source range, operator symbol, bounded input/output relation previews, tuple counts, and a short explanation. Full evaluation semantics and the final result are unchanged; only UI retention is capped via `maxTracePreviewRows`.

Traces are tied to the immutable snapshot used at Run time. If the expression or schema/data version changes afterward, the sandbox marks results and traces as **stale** until you Run again.

## Cancellation

Each Run assigns a monotonic `requestId`. Starting a new run cancels the previous worker job; responses whose `requestId` does not match the latest run are ignored so stale results cannot overwrite the UI.

## Independence from SQL

Algebra evaluation uses `lib/evaluator/`. SQL verification uses `lib/sql/runtime/` (sql.js in a Web Worker) with the same immutable sandbox snapshot materialized into an in-memory SQLite database. Comparison normalizes types and compares unordered tuple sets in `lib/sql/runtime/compare.ts`.

See also [SANDBOX_LIMITS.md](./SANDBOX_LIMITS.md) for dataset size caps in the schema designer.
