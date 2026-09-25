# Release validation plan (Issue #22)

Integrated checks that span feature boundaries before shipping RAT on GitHub Pages.

## 1. Unit and fixture coverage

| Area | Location | Scope |
| --- | --- | --- |
| Operator semantics | `test/evaluator/operators.test.ts`, `test/evaluator/semantic-edge-cases.test.ts` | Duplicates, NULL/3VL, empty relations, division edge cases, rename, runtime limits |
| Incompatible schemas | `test/evaluator/semantic-edge-cases.test.ts`, `test/engine/analyzer.test.ts` | Union/difference/intersection type mismatches |
| Nested joins | `test/evaluator/semantic-edge-cases.test.ts`, `test/evaluator/trace.test.ts` | Theta/natural join chains, trace step order |
| SQL equivalence | `test/sql/runtime/parity.test.ts`, `test/sql/transpile.test.ts` | RA ↔ SQLite parity per operator |
| Reverse translator (optional) | `test/sql/sql-to-ra*.test.ts` | Runs when shipped; does not gate core CI failures beyond existing suite |

## 2. End-to-end learner scenarios (browser logic, no Playwright)

`test/integration/educational-workflow.test.ts` exercises the same APIs the UI uses:

1. Load university preset → sandbox snapshot
2. CSV parse/validate/import path
3. Expression validation diagnostics
4. Evaluate + SQL transpile + compare
5. Evaluation trace ↔ operator-tree step index sync
6. Quiz grading (algebra + SQL subset)
7. Workspace save/reload and share codec round-trip
8. Result CSV export

## 3. Static export smoke

`test/smoke.test.ts` (requires `pnpm build` with `NEXT_PUBLIC_BASE_PATH=/rat`):

- HTML routes including quiz index and sample SSG paths
- `.nojekyll`, `_next/static` chunks
- `/rat/_next/` asset prefix when built for Pages
- `public/sql-wasm/` copied into export
- Root-hosting HTML check via `SMOKE_EXPECT_ROOT=1` after a root build (CI second job)

## 4. Accessibility

`test/a11y/core-surfaces.test.tsx` verifies skip link, main landmark, primary navigation labels, and reduced-motion CSS.

Manual checklist: keyboard-only sandbox run, trace stepping, dialogs, CSV import, mobile nav; screen reader names on editor, results, and operator tree.

## 5. Limits, cancellation, storage

| Concern | Verification |
| --- | --- |
| Sandbox caps | `docs/SANDBOX_LIMITS.md`, `test/sandbox/import-limits.test.ts` |
| Evaluation caps | `docs/EVALUATION_LIMITS.md`, operator runtime limit test |
| Cancellation | `test/evaluator/cancellation.test.ts` |
| Oversized CSV | `test/sandbox/import-limits.test.ts` |
| Storage failures | `test/persistence/storage-failure.test.ts`, `mapDomException` |

## 6. Documentation deliverables

| Document | Purpose |
| --- | --- |
| `ARCH.md` | Architecture, client-only boundaries, base path |
| `docs/LANGUAGE_SPEC.md` | Grammar and RA contract |
| `docs/SQL_DIALECT.md` | Transpiler dialect and learner SQL subset |
| `docs/BROWSERS.md` | Supported browsers and WASM requirements |
| `docs/PRIVACY.md` | Local-only data, share links |
| `docs/LIMITATIONS.md` | Known product limits |
| `README.md` | Local dev, deploy, script index |

## 7. CI (`.github/workflows/validate.yml`)

1. Type-check, lint, unit tests
2. Build with `NEXT_PUBLIC_BASE_PATH=/rat` → `pnpm test:smoke`
3. Build at root → `SMOKE_EXPECT_ROOT=1 pnpm test:smoke`

Core release passes steps 1–2; step 3 guards custom-domain / root hosting.
