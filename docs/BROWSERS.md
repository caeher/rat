# Supported browsers

RAT is a static Next.js export that runs entirely in the browser. You need a modern evergreen browser with:

- **WebAssembly** (required for sql.js SQLite execution and compare)
- **Web Workers** (recommended for RA evaluation and SQL; main-thread fallback exists for RA only)
- **IndexedDB** (workspace persistence; in-memory fallback when unavailable)
- **ES2022** language features used by the compiled bundle

## Tested targets

| Browser | Minimum | Notes |
| --- | --- | --- |
| Chromium (Chrome, Edge, Brave) | Last two major versions | Primary development target |
| Firefox | Last two major versions | Worker + WASM supported |
| Safari (macOS / iOS) | Last two major versions | Requires WASM; test share links on iOS |

Internet Explorer is not supported.

## Hosting paths

- **GitHub Pages**: `https://caeher.github.io/rat/` (`NEXT_PUBLIC_BASE_PATH=/rat`)
- **Root hosting**: build without `NEXT_PUBLIC_BASE_PATH`; asset helpers in `lib/paths.ts` resolve workers and WASM from `/`.

## Performance expectations

Large cartesian products and unbounded imports are capped (see [SANDBOX_LIMITS.md](./SANDBOX_LIMITS.md) and [EVALUATION_LIMITS.md](./EVALUATION_LIMITS.md)). Slow devices may hit evaluation timeouts; cancel a run from the sandbox toolbar before starting a new query.
