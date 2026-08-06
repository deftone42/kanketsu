# 🛠️ AniTime Development Guide

Practical guide for working on the AniTime codebase — setup, commands, project structure, and CI/CD.

---

## 📋 Prerequisites

- **Node.js `>=22.0.0`** (pinned to `v24.18.1` in `.nvmrc`)
- **npm** with `engine-strict=true` (enforced via `.npmrc` — wrong Node version will **fail** installs)

```bash
# Pin the correct Node version
nvm use
```

---

## 🚀 Available Scripts

| Command              | Description                                                      |
| :------------------- | :--------------------------------------------------------------- |
| `npm run dev`        | Start Next.js dev server with hot reload (http://localhost:3000) |
| `npm run build`      | Build static export via `next build` (output: `export`)          |
| `npm run start`      | Serve the production build (`next start`)                        |
| `npm run lint`       | Run ESLint (Next.js core-web-vitals + TypeScript configs)        |
| `npm run test`       | Run Vitest once (CI mode)                                        |
| `npm run test:watch` | Run Vitest in watch mode                                         |
| `npx tsc --noEmit`   | TypeScript compiler check (part of CI)                           |

---

## 📁 Project Structure

```
anitime/
├── .github/workflows/
│   ├── ci.yml           # Lint + typecheck + tests + build (on PRs)
│   └── releases.yml     # Auto version bump + GitHub Release (on main)
├── docs/                # 📘 This documentation set
├── public/
│   └── .nojekyll        # Enables GitHub Pages static hosting
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── __tests__/   # Integration tests + typed fixtures
│   │   ├── globals.css  # Tailwind v4 entry
│   │   ├── layout.tsx   # Root layout (Inter font, dark theme)
│   │   └── page.tsx     # Landing page
│   ├── components/      # SearchBar, AnimeDetailCard
│   ├── core/
│   │   ├── domain/      # Pure TS models + scoring service
│   │   └── ports/       # AnimeRepository interface
│   ├── hooks/           # useAnimeSearch
│   ├── infrastructure/  # AniList GraphQL adapter, DTOs, queries
│   ├── mocks/           # MSW server + handlers
│   ├── test/            # Global test setup
│   ├── components/      # UI components
├── next.config.ts       # Static export + GitHub Pages basePath
├── vitest.config.mjs    # Test runner configuration
├── vitest.setup.tsx     # next/image mock for tests
├── tsconfig.json        # Strict TS + @/* path alias
└── package.json
```

---

## ⚙️ Key Configuration Files

### `next.config.ts`

- `output: "export"` → **static site generation** (no server routes).
- `basePath` / `assetPrefix` → `"/anitime"` in production for **GitHub Pages**.
- `images.unoptimized: true` + remote pattern for `s4.anilist.co` → cover art loads client-side without the Next image optimizer.

### `vitest.config.mjs`

- Uses `@vitejs/plugin-react` for JSX/TSX support.
- `resolve.tsconfigPaths: true` → honors `@/*` alias.
- `environment: "happy-dom"` for DOM tests.
- Setup files: `src/test/setup.ts` (MSW lifecycle) + `vitest.setup.tsx` (image mock).

### `tsconfig.json`

- `strict: true`, target `ES2017`, bundler module resolution.
- Path alias `@/* → ./src/*`.
- Includes Vitest globals + jest-dom matcher types.

---

## 🔄 Static Export & GitHub Pages

The app is configured for **static hosting**:

1. `next build` generates a static `out/` directory.
2. Production builds set `basePath: "/anitime"` so assets resolve under the repo's Pages URL.
3. `public/.nojekyll` prevents GitHub Pages from running Jekyll on the output.

> **Note:** No Pages deploy workflow is currently enabled — see `ROADMAP.md` Phase 4.

---

## 🤖 CI/CD Pipeline

### `ci.yml` — Pull Requests to `main`

Runs on every PR against `main`:

| Step       | Command                                           |
| :--------- | :------------------------------------------------ |
| Checkout   | `actions/checkout@v4`                             |
| Setup Node | `setup-node@v4`, version from `.nvmrc`, npm cache |
| Install    | `npm ci`                                          |
| Lint       | `npm run lint`                                    |
| TypeScript | `npx tsc --noEmit`                                |
| Tests      | `npm run test`                                    |
| Build      | `npm run build`                                   |

### `releases.yml` — Push to `main`

1. **Build & Validate** — same lint + build checks (needed by release job).
2. **Release** (after build succeeds):
   - Auto version bump via `mathieudutour/github-tag-action` (default: patch).
   - Creates a GitHub Release with auto-generated changelog.

---

## 🧱 Coding Standards (from `AGENTS.md`)

1. **Hexagonal architecture** — domain stays pure; adapters implement ports.
2. **Strict TypeScript** — `strict: true`, **zero `any`** policy.
3. **Tailwind CSS** — use the `cn()` helper for conditional classnames.
4. **No heavy dependencies** without explicit request.
5. **Validation gate** — `npm run lint` + `npm run build` must pass before finishing a task.

---

## 🧪 Adding a New Feature (Typical Flow)

1. **Model it in the domain** — extend `src/core/domain/models/` (e.g. add `genres` to `Anime`).
2. **Expose via port** — update `AnimeRepository` if the data source must change.
3. **Update the adapter** — modify `queries.ts` (GraphQL fields) + `dto/` + mapper in `anilist-graphql-repository.ts`.
4. **Update MSW mocks** — add the new fields to `src/mocks/handlers.ts`.
5. **Add a fixture + test** — create/update a fixture in `src/app/__tests__/fixtures/` and assert in the scoring or integration suite.
6. **UI layer** — extend `AnimeDetailCard` / `page.tsx` with Tailwind styling.
7. **Validate** — `npm run lint`, `npm run test`, `npm run build`.

---

## 📚 Documentation Index

- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — Hexagonal layers, data flow, dependency rules
- [`docs/SCORING-SYSTEM.md`](./SCORING-SYSTEM.md) — Timing Score algorithm and cases
- [`docs/TESTING.md`](./TESTING.md) — Test stack, fixtures, MSW, best practices
