# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

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

**Port** — `src/core/ports/anime-repository.ts` declares three methods, and the distinction between the last two matters:

- `searchAnime(query)` → lightweight `AnimeSearchResult[]` for the dropdown.
- `getAnimeById(id)` → a **franchise-aggregated** `Anime`: the adapter recursively walks PREQUEL/SEQUEL edges itself and folds the whole franchise into one entity (`seasons`, `movies`, summed `totalEpisodes`, averaged `userScore`, franchise-level derived `status`). The returned `id`/`title` are the *earliest TV entry*, not necessarily the id you passed.
- `getAnimeWithRelations(id)` → a **single** entry with raw `relations` edges and empty `seasons`/`movies`. Exists purely to feed `FranchiseCollector`'s traversal.

**Two franchise implementations currently coexist.** `AniListGraphQLRepository.getAnimeById` does its own recursive batch fetch (`MEDIA_BATCH_QUERY`, `id_in`, 50/page) and is what the live UI uses. `src/core/domain/services/franchise-collector.ts` is the newer, tested, domain-level BFS (`FranchiseCollector`, depth-limited, cycle-safe, error-resilient, returns a `Franchise` graph of nodes + edges + `mainTimeline`) and is currently only exercised by its unit test and the `test:franchise` script. It is not wired into the UI yet — check which one a change belongs in before editing.

**Scoring** — `evaluateWatchingScore(anime)` in `src/core/domain/services/evaluate-score.ts` is a pure function branching on the franchise-level `AnimeStatus`, starting from `BASE_SCORE = 70` and applying deltas plus a quality bonus, clamped to 0–100. `NEW_SEASON_COMING` within `HYPE_WINDOW_DAYS` (60) and `ONGOING` past `MEGA_SERIES_EPISODE_THRESHOLD` (150) are the two special windows. `docs/SCORING-SYSTEM.md` documents the intent. Note the domain status vocabulary differs from AniList's (`RELEASING` → `ONGOING`; `NEW_SEASON_COMING` is derived by the adapter, never returned by the API).

**App layer** — `useAnimeSearch` is the only orchestration point: it instantiates the repository at module scope, debounces 350ms with cancellation, gates results at ≥3 chars, and on selection fetches detail then computes the score. Components stay presentational.

**Static export** — `next.config.ts` sets `output: "export"` with `basePath`/`assetPrefix` of `/anitime` under `NODE_ENV=production`. No server runtime exists: all AniList calls are client-side, so avoid server actions, route handlers, or anything requiring a Node server.

## Testing

Vitest + happy-dom + RTL, globals on. Setup files: `src/test/setup.ts` (MSW lifecycle, `onUnhandledRequest: "error"`) and `vitest.setup.tsx` (mocks `next/image` → plain `<img>`). MSW handlers in `src/mocks/handlers.ts` branch on the GraphQL body to serve either a search page or a media detail; when you change `graphql/queries.ts` or the DTOs, update the handlers or every integration test starts failing on unmocked requests.

Docs drift warning: `docs/TESTING.md` and `docs/ARCHITECTURE.md` describe `src/core/domain/services/evaluate-score.test.ts` and `src/app/__tests__/` fixtures (Gintama, Frieren, One Piece, Sacred Seven) that **do not currently exist** in the tree — the only test file is `franchise-collector.test.ts`. Verify before citing those docs.

## Docs

`docs/ARCHITECTURE.md`, `docs/SCORING-SYSTEM.md`, `docs/TESTING.md`, `docs/DEVELOPMENT.md`, plus `ROADMAP.md` for what's in flight (franchise/sequel UI breakdown, genre recommendations; deployment pipeline is on hold).
