# Relational Algebra Evaluation Limits

The in-browser RA evaluator runs in a dedicated Web Worker with hard caps so explosive joins or Cartesian products cannot freeze the GitHub Pages UI. When a limit is hit, evaluation fails with an actionable `E_RUNTIME_LIMIT` diagnostic — **partial result sets are never shown as complete answers**.

| Limit | Default | Purpose |
| --- | --- | --- |
| `maxOutputRows` | 10,000 | Final result tuple count after duplicate elimination |
| `maxIntermediateRows` | 25,000 | Any single operator’s materialized row count |
| `maxRowOperations` | 2,000,000 | Nested-loop pairings (joins, selections, division checks) |
| `maxExecutionMs` | 15,000 | Wall-clock budget inside the worker |

Constants live in `lib/evaluator/limits.ts`. Override via `EvaluationOptions` for tests only.

## Cancellation

Each Run assigns a monotonic `requestId`. Starting a new run cancels the previous worker job; responses whose `requestId` does not match the latest run are ignored so stale results cannot overwrite the UI.

## Independence from SQL

Evaluation uses `lib/evaluator/` only. SQL transpilation and future SQLite WASM verification remain separate paths for apples-to-apples comparison later.

See also [SANDBOX_LIMITS.md](./SANDBOX_LIMITS.md) for dataset size caps in the schema designer.
