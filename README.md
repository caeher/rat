# RAT — Relational Algebra Translator & Sandbox

> An educational learning tool and browser sandbox for Relational Algebra expression translation, visualization, and execution.

---

## Features

- **Interactive Query Sandbox**: Compose relational algebra expressions using mathematical notation ($\sigma, \pi, \rho, \bowtie, \times, \cup, -, \cap, \div$) with real-time in-memory evaluation.
- **Progressive Exercises**: Structured problem sets ranging from introductory selections to complex multi-relation joins and division queries.
- **Operator Reference Guide**: Formal set-theoretic definitions, operational semantics, algebraic equivalence laws, and ANSI SQL mappings.
- **Zero-Server Static Runtime**: Fully client-side parsing and evaluation deployable directly to GitHub Pages without backend dependencies.
- **Warm Parchment Atelier UI**: Clean editorial design system with 4px border geometry, restrained typography, and Radix UI primitives.

---

## Tech Stack

- **Framework**: Next.js `16.3.6` (Pages Router)
- **Package Manager**: Strictly `pnpm` (`pnpm@11.25.0`)
- **Language**: TypeScript `5.7.3` (Strict mode)
- **UI & Primitives**: Radix UI, Tailwind CSS v4, Lucide Icons
- **Testing**: Vitest + React Testing Library + JSDOM
- **Hosting**: Static Export (`output: 'export'`) on GitHub Pages

---

## Getting Started

### Prerequisites

- Node.js `>=20.9.0` (Recommended: Node 22+)
- `pnpm` `>=11.0.0`

### Installation

```bash
# Clone the repository
git clone https://github.com/caeher/rat.git
cd rat

# Install dependencies strictly using pnpm
pnpm install
```

### Development

```bash
# Run local development server
pnpm dev
```

Navigate to `http://localhost:3000` to access the application.

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `pnpm dev` | `next dev` | Launches local development server |
| `pnpm build` | `next build` | Compiles and exports static output to `./out` |
| `pnpm type-check` | `tsc --noEmit` | Runs strict TypeScript type checks |
| `pnpm lint` | `eslint .` | Runs ESLint validation |
| `pnpm test` | `vitest run --exclude "test/smoke.test.ts"` | Runs unit and component test suites |
| `pnpm test:watch` | `vitest --exclude "test/smoke.test.ts"` | Runs test runner in interactive watch mode |
| `pnpm test:smoke` | `vitest run test/smoke.test.ts` | Runs static export smoke checks on `./out` |
| `pnpm test:all` | `vitest run` | Runs all unit, component, and smoke tests |

---

## Static Export & Base Path Configuration

To build with the `/rat` base path for GitHub Pages deployment:

```bash
# Set base path environment variable and build
NEXT_PUBLIC_BASE_PATH=/rat pnpm build

# Run static export smoke tests
pnpm test:smoke
```

The static HTML and assets will be output to the `./out` directory with `.nojekyll` preserved to ensure `_next` chunks and stylesheets are served properly.

---

## GitHub Pages Deployment & CI/CD Pipeline

The application is deployed as a zero-server static site using GitHub Actions.

- **Published Live URL**: [https://caeher.github.io/rat/](https://caeher.github.io/rat/)
- **Repository Pages Settings**:
  1. Open repository **Settings** > **Pages**.
  2. Under **Build and deployment** > **Source**, select **GitHub Actions**.

### CI/CD Security & Workflows

1. **Pull Request Validation (`.github/workflows/validate.yml`)**:
   - Triggers on pull requests targeting `main`.
   - Operates with strict least-privilege permissions (`contents: read`).
   - Fork PRs are isolated and cannot publish or access deployment tokens.
   - Runs TypeScript validation, linting, unit tests, static export build with `/rat` base path, and post-build smoke checks.
2. **Production Pages Deployment (`.github/workflows/deploy.yml`)**:
   - Triggers on pushes to `main` and manual `workflow_dispatch`.
   - Enforces sequential execution via `concurrency: { group: 'pages', cancel-in-progress: false }`.
   - Staged into:
     - **Build Job**: Runs full validation, generates static export, executes smoke verification, and uploads the Pages artifact.
     - **Deploy Job**: Executes under the `github-pages` environment with `pages: write` and `id-token: write` permissions, reporting the published site URL.

---

## Architecture & Contribution

Please review [ARCH.md](file:///c:/Users/echoe/Desktop/rat/ARCH.md) for architectural boundaries, state management strategies, and design token guidelines.

---

## License

MIT License.
