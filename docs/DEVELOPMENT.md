# 🛠️ Kanketsu Development Guide

Practical guide for working on the Kanketsu codebase — setup, commands, project structure, and CI/CD.

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

| Command                       | Description                                                      |
| :---------------------------- | :--------------------------------------------------------------- |
| `npm run dev`                 | Start Next.js dev server with hot reload (http://localhost:3000) |
| `npm run build`               | Build static export via `next build` → `out/`                    |
| `npm run start`               | Serve the production build (`next start`)                        |
| `npm run lint`                | Run ESLint (flat config, `eslint.config.mjs`)                    |
| `npx tsc --noEmit`            | TypeScript compiler check — **part of CI, not covered by lint**  |
| `npm run test`                | Run Vitest once (CI mode)                                        |
| `npm run test:watch`          | Run Vitest in watch mode                                         |
| `npm run test -- <substring>` | Run one test file (substring match on path)                      |
| `npm run test -- -t "<name>"` | Run one test by name                                             |

Two scripts hit the **real AniList API** and are never part of CI:

| Command                             | Description                                                    |
| :---------------------------------- | :------------------------------------------------------------- |
| `npm run record:fixtures`           | Re-record `src/test/fixtures/anilist/*.json` from the live API |
| `npm run test:franchise -- --id=21` | CLI harness: real call + BFS dump (default id 21 = One Piece)  |

---

## 📁 Project Structure

```
kanketsu/
├── .github/workflows/
│   └── ci.yml            # Lint + typecheck + tests + build (on PRs)
├── docs/                 # 📘 This documentation set
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── globals.css   # Tailwind v4 entry
│   │   ├── layout.tsx    # Root layout (dark theme)
│   │   └── page.tsx      # Landing page — composes hook + cards
│   ├── components/       # SearchBar, SeasonCard, FranchiseCard,
│   │                     #   ScoreCard, FranchiseTimeline (+ .test.tsx)
│   ├── core/
│   │   ├── domain/
│   │   │   ├── models/   # Franchise, FranchiseWork, score, relation…
│   │   │   ├── services/ # collector, summarize, situation, evaluate
│   │   │   └── errors/   # RepositoryError hierarchy
│   │   └── ports/        # AnimeRepository interface
│   ├── hooks/            # useAnimeSearch — the only orchestration point
│   ├── infrastructure/
│   │   └── adapters/anilist/  # repository, dto/, graphql/, mappers/
│   ├── mocks/            # MSW server + handlers
│   ├── scripts/          # record-fixtures, test-franchise (live API)
│   └── test/
│       ├── fakes/        # InMemoryAnimeRepository
│       ├── fixtures/     # Recorded AniList responses (JSON)
│       └── setup.ts      # jest-dom + MSW lifecycle
├── next.config.ts        # Static export, served at the domain root
├── vitest.config.mjs     # Test runner configuration
├── vitest.setup.tsx      # next/image mock for tests
├── tsconfig.json         # Strict TS + @/* path alias
└── package.json
```

> Tests live beside the code they cover. There is no `src/app/__tests__/`.

---

## ⚙️ Key Configuration Files

### `next.config.ts`

- `output: "export"` → **static site generation**. No server runtime exists, so avoid server actions, route handlers, or anything needing a Node server: every AniList call is client-side.
- **No `basePath` / `assetPrefix`.**
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

## 🔄 Static Export & Deployment

`next build` generates a static `out/` directory, deployed to **Vercel** (Hobby) from the private repo: push to `main` ships production, every PR gets a preview URL.

Vercel's build runs `build` only. **Quality is gated by CI on PRs, not by the deploy** — a push straight to `main` ships whatever it contains.

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

`ci.yml` is the only workflow. The automated GitHub Release workflow was removed — it was not being used.

---

## 🧱 Coding Standards (from `CLAUDE.md`)

1. **Hexagonal architecture** — domain stays pure; adapters implement ports.
2. **Strict TypeScript** — `strict: true`, **zero `any`** policy.
3. **Tailwind CSS** — conditional classes are template literals with ternaries. There is no `cn()` helper, and neither `clsx` nor `tailwind-merge` is a dependency.
4. **No heavy dependencies** without explicit request.
5. **Validation gate** — the full CI order: `npm run lint` → `npx tsc --noEmit` → `npm run test` → `npm run build`.

---

## 🧪 Adding a New Feature (Typical Flow)

1. **Model it in the domain** — extend `src/core/domain/models/` (e.g. add `genres` to `AnimeWork`).
2. **Expose via port** — update `AnimeRepository` only if the data source contract must change.
3. **Update the adapter** — new GraphQL fields in `queries.ts`, then `dto/` and `mappers/franchise-work-mapper.ts`.
4. **Re-record fixtures** — `npm run record:fixtures`, because `FRANCHISE_BATCH_QUERY` changed. A fixture recorded against an older query silently lacks the new fields.
5. **Test at the right layer** — traversal against `InMemoryAnimeRepository`, mapping against a recorded fixture, scoring against a constructed summary with an injected `now`.
6. **Update MSW handlers** — `src/mocks/handlers.ts`. Nothing fails if you forget (no test reaches MSW yet), so this one is on you.
7. **UI layer** — extend the relevant card; keep components presentational and orchestration in `useAnimeSearch`.
8. **Validate the full CI order** — `npm run lint` → `npx tsc --noEmit` → `npm run test` → `npm run build`.

---

## 📚 Documentation Index

- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) — Hexagonal layers, data flow, dependency rules
- [`docs/SCORING-SYSTEM.md`](./SCORING-SYSTEM.md) — Timing Score algorithm and cases
- [`docs/TESTING.md`](./TESTING.md) — Test stack, fixtures, MSW, best practices
