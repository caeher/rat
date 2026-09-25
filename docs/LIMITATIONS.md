# Known limitations

Educational scope choices and browser constraints. Not an exhaustive bug list.

## Language and SQL

- RA syntax follows [LANGUAGE_SPEC.md](./LANGUAGE_SPEC.md); exotic or vendor-specific SQL may not reverse-translate.
- Quiz SQL is read-only `SELECT` only ([SQL_DIALECT.md](./SQL_DIALECT.md)).
- Division requires compatible schemas; incompatible operands are rejected at analyze or transpile time.

## Sandbox capacity

Hard caps in [SANDBOX_LIMITS.md](./SANDBOX_LIMITS.md): relations, rows, CSV size, identifier lengths. Imports are atomic—one invalid cell blocks the whole file.

## Evaluation

Intermediate and output row caps in [EVALUATION_LIMITS.md](./EVALUATION_LIMITS.md). Cartesian products that exceed limits return `E_RUNTIME_LIMIT` rather than partial results.

## Persistence

- IndexedDB quota is browser-dependent; full storage surfaces a recoverable error (`StorageNoticeBanner`).
- Multi-tab edits use broadcast hints but are not a full CRDT; last write wins on save.

## Accessibility

Core flows target WCAG-oriented patterns (skip link, labels, reduced motion). Complex diagrams (operator tree canvas) expose a parallel textual tree for keyboard and screen-reader use.

## Offline

After first load, cached assets may work offline; initial WASM and font fetch require network unless you self-host a complete mirror.

## Optional features

SQL → RA translation ships behind the sandbox panel when present; parity tests run in CI but missing features must not block the core algebra sandbox release.
