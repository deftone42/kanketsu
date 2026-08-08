# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Conventions

- **Zero `any`.** TypeScript runs in strict mode; type the DTOs and the mocks too.
- **No heavy dependencies without asking.** Runtime deps are deliberately four: `next`, `react`, `react-dom`, `lucide-react`, plus `@vercel/analytics`. Reach for the platform before a package.
- **Tailwind for styling.** Conditional classes are plain template literals with ternaries (see `FranchiseTimeline.tsx`); there is no `cn()` helper and no `clsx`/`tailwind-merge`, so don't import one.
- **Comments explain *why*, not *what*.** The existing ones record the API hazard or the rejected alternative that made the code look the way it does — match that.

## Commands

```bash
npm run dev                          # Next dev server (http://localhost:3000)
npm run build                        # next build → static export to out/
npm run lint                         # eslint (flat config, eslint.config.mjs)
npx tsc --noEmit                     # type check — part of CI, not covered by lint
npm run test                         # vitest run (single pass)
npm run test:watch                   # vitest watch
npm run test -- franchise-collector  # single test file (substring match on path)
npm run test -- -t "cycle"           # single test by name
npm run test:franchise -- --id=21    # CLI harness: real AniList call + BFS dump (default id 21 = One Piece)
```

CI (`.github/workflows/ci.yml`, on PRs to `main`) runs, in order: `lint` → `tsc --noEmit` → `test` → `build`. Match that before declaring work done — `npm run lint` alone does not type check.

Node `>=22` is enforced via `.nvmrc` + `engines` with `engine-strict=true` (`.npmrc`); use `nvm use` first.

## Architecture

Hexagonal, with a single port. Dependency direction: `app`/`components`/`hooks` → `core/ports` → `core/domain`, and `infrastructure` → `core/domain`. The domain imports nothing outside itself (no React, no Next, no fetch). `@/*` maps to `src/*`.

**Port** — `src/core/ports/anime-repository.ts` declares two methods:

- `searchAnime(query)` → lightweight `AnimeSearchResult[]` for the dropdown.
- `getWorksByIds(ids)` → a batched `WorkBatch` of hydrated works plus discovered relation topology. Throws `RepositoryError` subclasses (`RateLimitedError`, `WorkNotFoundError`, `RepositoryUnavailableError`) — it never returns `null` for a failure, so a rate limit cannot be mistaken for a missing anime.

**One franchise implementation.** `src/core/domain/services/franchise-collector.ts` (`FranchiseCollector`) is the single path: a frontier-batched traversal that fetches every unvisited work at the current depth in one request. It returns a `Franchise` — `timeline` (PREQUEL/SEQUEL chain in release order), `related` (movies, OVAs, specials), `sources` (manga/novels), `summary`, and `isComplete`/`unresolvedIds` when traversal stopped early. `rootId` is always the id you passed, so the UI can highlight the entry the user selected.

Two AniList facts the batching depends on: the API shares **one ID space** across anime and manga (so omitting the `type` filter returns source works for free), and it rate-limits **per request, not per query complexity** (so `FRANCHISE_BATCH_QUERY` nests `relations` three deep at no cost). Nested nodes are *topology stubs* — they reveal ids for planning the next frontier and never become hydrated nodes.

**Aggregation lives in the domain.** `summarizeFranchise` folds the collected works into the `FranchiseSummary` that `evaluateWatchingScore` consumes. It is pure and unit-tested; nothing about franchise-level totals or status lives in the adapter any more.

**Scoring** — two pure functions, both taking the current time as a parameter because the domain must not read the clock (`useAnimeSearch` injects it). `deriveWatchingSituation(summary, now)` in `src/core/domain/services/watching-situation.ts` classifies a franchise into one of eight mutually exclusive `WatchingSituation`s; `evaluateWatchingScore(summary, now)` in `evaluate-score.ts` maps that to a base score, applies two modifiers that each contribute a line to `TimingScore.notes`, and derives the `ScoreLevel` from the final number by bands. **A closed story is the only route to 100** — the score answers "is now a good moment", not "is this good", so the AniList rating never enters the calculation. Situations worth knowing: `DE_FACTO_HIATUS` is inferred (`FINISHED` + source still publishing + last episode ≥`DE_FACTO_HIATUS_YEARS` ago) because AniList has no status for a quietly abandoned adaptation, and `MEGA_SERIES_ONGOING` is `ONGOING` past `MEGA_SERIES_EPISODE_THRESHOLD` (150). `docs/SCORING-SYSTEM.md` documents the full table and the intent. Note the domain status vocabulary differs from AniList's (`RELEASING` → `ONGOING`; `NEW_SEASON_COMING` is derived by the adapter, never returned by the API).

**App layer** — `useAnimeSearch` is the only orchestration point: it instantiates the repository at module scope, debounces 350ms with cancellation, gates results at ≥3 chars, and on selection fetches detail then computes the score. Components stay presentational.

**Static export** — `next.config.ts` sets `output: "export"`, and Vercel serves the resulting `out/` at the domain root, so there is no `basePath`/`assetPrefix` (they used to point at `/anitime` for GitHub Pages; that host was dropped because publishing a private repo needs a paid plan). No server runtime exists: all AniList calls are client-side, so avoid server actions, route handlers, or anything requiring a Node server.

## Testing

Vitest + happy-dom + RTL, globals on. Setup files: `src/test/setup.ts` (MSW lifecycle, `onUnhandledRequest: "error"`) and `vitest.setup.tsx` (mocks `next/image` → plain `<img>`). MSW handlers in `src/mocks/handlers.ts` branch on the GraphQL body (a query containing `id_in` gets the recorded Attack on Titan batch, anything else a literal search page) — but **no test currently reaches them**: nothing renders `page.tsx`, `useAnimeSearch` or the real adapter, so the integration test of the full journey is still missing and a stale handler fails nothing.

Domain traversal tests use `InMemoryAnimeRepository` (`src/test/fakes/`) instead — it answers batched reads like the real adapter, models the three-hop topology so crossover leaks are catchable, and counts requests.

**Fixtures are recorded, never hand-written.** `npm run record:fixtures` hits the real API and writes `src/test/fixtures/anilist/*.json`; tests replay those offline. Re-record when `FRANCHISE_BATCH_QUERY` changes. Each fixture pins a hazard found against the live API: One Piece reports `episodes: null` while airing, Monogatari's sequels adapt five *different* source novels, Steins;Gate has no source work at all, and **id 9183 is a dead id** (AniList 404s it — real Gintama is `918`, and `docs/` may still cite 9183 wrongly).

`docs/ARCHITECTURE.md` and `docs/TESTING.md` were rewritten against the current tree and are safe to cite.

## Docs

`docs/ARCHITECTURE.md`, `docs/SCORING-SYSTEM.md`, `docs/TESTING.md`, `docs/DEVELOPMENT.md`, plus `ROADMAP.md` for what's in flight (franchise/sequel UI breakdown, genre recommendations; deployment pipeline is on hold).
