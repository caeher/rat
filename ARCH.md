# RAT (Relational Algebra Translator) — Architecture Guide

## 1. System Overview & Core Purpose

**RAT** is an educational learning tool, compiler, and interactive sandbox for Relational Algebra (RA). It translates formal relational expressions into optimized query execution trees and equivalent SQL representations, providing instant feedback and schema inspection.

---

## 2. Architectural Boundaries & Non-Negotiables

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
│                                                             │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │    Pages Router UI      │   │   Relational Engine     │  │
│  │ (Next 16.3.6 / Radix)   │◄──┤ (Lexer, Parser, AST)    │  │
│  └────────────┬────────────┘   └────────────┬────────────┘  │
│               │                             │               │
│               ▼                             ▼               │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │ Deterministic URL State │   │   In-Memory Relations   │  │
│  │   & LocalStorage        │   │     & SQLite/WASM       │  │
│  └─────────────────────────┘   └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
               (Static Deployment to GitHub Pages)
                              ▼
           Zero Backend / No SSR / No Server Actions
```

1. **Purely Client-Side Execution**:
   - **No Backend**: All parsing, AST transformation, algebraic optimization, query evaluation, and SQL generation occur 100% in the user's browser.
   - **No API Routes / Server Actions**: `next export` produces purely static assets (`.html`, `.js`, `.css`). No server-side code or Node.js runtime is required in production.

2. **Hydration & Browser-Only Libraries**:
   - Web workers, LocalStorage, WebAssembly, and interactive canvas components must load safely after client hydration.
   - Use the `ClientOnly` boundary (`components/common/ClientOnly.tsx`) and the `useIsMounted()` hook (`lib/browser/useIsMounted.ts`) to avoid hydration mismatch errors during static pre-rendering.

3. **Dual Base Path Support (Root vs. `/rat`)**:
   - When deployed to GitHub Pages, the site is hosted under `/rat`.
   - In local development or custom domains, the site may be hosted at root `/`.
   - **Strategy**:
     - Standard page links use Next.js `<Link href="/sandbox">` (which handles `basePath` automatically).
     - Static public assets, Web Worker scripts, and WASM bundles use `withBasePath(path)` from `lib/paths.ts` or `resolveAssetPath(path)`.
     - Static export uses `trailingSlash: true` so all pages export to `route/index.html`, ensuring clean URL refreshing without server URL rewriting.

4. **Design System & Aesthetics (`LL.md`)**:
   - **Parchment Atelier Palette**:
     - Canvas: Parchment `#f7f7f4`
     - Surfaces/Cards: Bone `#f2f1ed`
     - Borders: Stone `#cdcdc9` (hairline 1px)
     - Text/Actions: Ink `#26251e`
     - Accents: Ember `#f54e00` (text accent/emphasis), Amber `#c08532` (product actions), Forest `#34785c` (success/PR actions)
   - **Typography**:
     - Display & UI: CursorGothic / Inter fallback (weight 400 with tight tracking)
     - Editorial prose: EB Garamond serif
     - Code & metadata: berkeleyMono / Consolas monospace
   - **Corner Geometry**: 4px radius across buttons, cards, tiles, and inputs.

---

## 3. Directory Layout

```
rat/
├── .github/
│   └── workflows/
│       ├── validate.yml         # PR validation workflow (least-privilege)
│       └── deploy.yml           # GitHub Pages production deployment workflow
├── components/
│   ├── common/                  # ClientOnly and ErrorBoundary
│   ├── layout/                  # NavigationBar, Footer, Layout
│   └── ui/                      # Button, Card, WindowFrame, TerminalSnippet, Tag
├── lib/
│   ├── browser/                 # useIsMounted and browser environment utilities
│   ├── engine/                  # RA AST, evaluation types, and compiler interfaces
│   └── paths.ts                 # BasePath resolver (withBasePath, resolveAssetPath)
├── pages/
│   ├── _app.tsx                 # Root layout and TooltipProvider
│   ├── _document.tsx            # HTML document shell and Google Fonts
│   ├── 404.tsx                  # Static 404 page (handles unmapped routes)
│   ├── index.tsx                # Overview landing page
│   ├── sandbox.tsx              # Interactive query editor and evaluator
│   ├── exercises.tsx            # Practice problem sets and catalogues
│   ├── reference.tsx            # Formal RA operator reference guide
│   └── components.tsx           # Component showcase and design tokens
├── public/
│   └── .nojekyll                # Disables Jekyll processing on GitHub Pages
├── styles/
│   └── globals.css              # LL.md custom properties and Tailwind v4 theme
├── test/
│   ├── setup.ts                 # Vitest testing setup
│   ├── paths.test.ts            # BasePath and asset resolver test suite
│   ├── ClientOnly.test.tsx      # Hydration boundary test suite
│   ├── routes.test.tsx          # Page rendering test suite
│   └── smoke.test.ts            # Static export & asset path smoke verification
├── next.config.ts               # Static export and basePath configuration
├── package.json                 # Pinned dependencies (Next.js 16.3.6, pnpm@11.25.0)
└── pnpm-workspace.yaml          # PNPM configuration
```

---

## 4. Package Manager & Script Standards

Strictly use `pnpm`:
- `pnpm dev`: Starts Next.js development server.
- `pnpm build`: Produces static export output in `out/`.
- `pnpm type-check`: Strict TypeScript type validation (`tsc --noEmit`).
- `pnpm lint`: ESLint 9 validation.
- `pnpm test`: Runs Vitest unit and component test suites.
- `pnpm test:smoke`: Runs static export verification tests against `out/`.
- `pnpm test:all`: Runs both unit/component and static export smoke tests.

---

## 5. GitHub Pages Deployment Architecture & Security

- **Repository Pages Configuration**: Source must be configured to **GitHub Actions** under repository settings.
- **Published Location**: `https://caeher.github.io/rat/`
- **Security Boundary**:
  - Pull request validation runs in isolation with `contents: read` permissions. Fork pull requests cannot access OIDC tokens or deployment credentials.
  - Production deployments on `main` split into a `build` job (`contents: read`) and a gated `deploy` job (`pages: write`, `id-token: write`).
- **Asset Integrity**:
  - `.nojekyll` prevents Jekyll from ignoring `_next/static` assets.
  - `trailingSlash: true` ensures clean route loading and direct URL refreshes without server rewrite rules.

