# 🏗️ Kanketsu Architecture Guide

Kanketsu follows **Hexagonal Architecture (Ports & Adapters)**, separating the pure core domain from the UI framework and the external API. This guide explains each layer, the flow of data, and the rules that keep the boundaries clean.

The central idea: **nothing AniList-shaped crosses the port.** The adapter maps raw GraphQL into our own vocabulary, and the domain never learns where the data came from.

---

## 📐 Layer Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  APP LAYER  (Next.js UI)                                         │
│  src/app/            page, layout, global styles                 │
│  src/ui/components/  SearchBar, SeasonCard, FranchiseCard,       │
│                      ScoreCard, FranchiseTimeline                │
│  src/ui/helpers/     label and format functions                  │
│  src/ui/constants/   presentation data and element ids           │
│  src/hooks/          useAnimeSearch (state + orchestration)      │
├──────────────────────────────────────────────────────────────────┤
│  PORT (Interface)                                                │
│  src/core/ports/  AnimeRepository                                │
├───────────────────────────┬──────────────────────────────────────┤
│  DOMAIN (Pure TS)         │  INFRASTRUCTURE (Adapter)            │
│  src/core/domain/         │  src/infrastructure/adapters/anilist/ │
│   models/    franchise,   │   anilist-graphql-repository.ts      │
│              franchise-   │   dto/      anilist-response.dto.ts  │
│              work, score, │   graphql/  queries.ts               │
│              relation…    │   mappers/  franchise-work-mapper.ts │
│   services/  collector,   │                                      │
│              summarize,   │                                      │
│              situation,   │                                      │
│              evaluate     │                                      │
│   errors/    repository-errors.ts                                │
└───────────────────────────┴──────────────────────────────────────┘
```

---

## 🧱 Layer Responsibilities

### 1. Core Domain — `src/core/domain/`

**Zero external framework dependencies.** Pure TypeScript only — no React, no Next, no `fetch`, and no reading of the clock.

#### Models

| Path                       | Responsibility                                                                                                              |
| :------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| `models/franchise-work.ts` | `FranchiseWork` = `AnimeWork \| SourceWork` discriminated on `kind`, plus `WorkStub` and the `isAnimeWork` / `isSourceWork` guards |
| `models/franchise.ts`      | `Franchise`, `FranchiseSummary`, `FranchiseEdge`, `WorkBatch`                                                                |
| `models/relation.ts`       | `RelationType` + the `MAIN_TIMELINE_RELATIONS` and `CROSSOVER_RELATIONS` sets                                                |
| `models/anime.ts`          | `AnimeFormat` and our `AnimeStatus` vocabulary                                                                               |
| `models/partial-date.ts`   | `PartialDate` and its comparator — AniList may know only part of a date                                                      |
| `models/score.ts`          | `TimingScore` result type + `ScoreLevel`                                                                                     |
| `errors/repository-errors.ts` | `RepositoryError` base + `WorkNotFoundError`, `RateLimitedError`, `RepositoryUnavailableError`                            |

Two model decisions worth knowing:

- **`AnimeStatus` deliberately differs from AniList's.** `RELEASING` becomes `ONGOING`, and `NEW_SEASON_COMING` is derived by `summarizeFranchise` — the API never returns it.
- **`WorkStub` is topology, not content.** The batch query nests `relations` three deep; those nested nodes exist only to reveal ids for the next frontier and are never stored as hydrated nodes.

#### Services

| Path                             | Responsibility                                                                          |
| :------------------------------- | :--------------------------------------------------------------------------------------- |
| `services/franchise-collector.ts` | `FranchiseCollector.collect(rootId)` — frontier-batched traversal producing a `Franchise` |
| `services/summarize-franchise.ts` | Folds the collected works into the `FranchiseSummary` the score consumes                 |
| `services/watching-situation.ts`  | `deriveWatchingSituation(summary, now)` — classifies into one of eight situations         |
| `services/evaluate-score.ts`      | `evaluateWatchingScore(summary, now)` — situation → score, modifiers, `ScoreLevel`        |

**The collector is the only franchise path.** It traverses one *frontier* at a time rather than one node at a time: every unvisited work at the current depth is fetched in a single batched read. Nested topology in each response reveals ids further ahead, so a linear chain costs roughly one request per three entries. One Piece went from ~50 requests to 3.

**Honesty guarantees it upholds:** a work that genuinely does not exist is skipped and traversal continues; a rate limit or outage stops traversal and sets `isComplete: false` with the outstanding ids in `unresolvedIds`. A partial franchise is never presented as a whole one. `rootId` is always the id you passed, so the UI can highlight the entry the user selected.

**Both scoring functions take `now` as a parameter** because the domain must not read the clock. `useAnimeSearch` injects it.

Key rule: **the domain never imports from `@/app`, `next`, React, or any infrastructure module.**

### 2. Port — `src/core/ports/`

One interface, two methods:

```ts
export interface AnimeRepository {
  searchAnime(query: string): Promise<AnimeSearchResult[]>;
  getWorksByIds(ids: number[]): Promise<WorkBatch>;
}
```

- `AnimeSearchResult` — lightweight summary for the search dropdown.
- `WorkBatch` — hydrated works plus the relation topology discovered alongside them (`works`, `edges`, `stubs`).

`getWorksByIds` **throws** `RepositoryError` subclasses rather than returning `null` for a failure. That is the point: a rate limit must not be mistaken for a missing anime, because one means "stop and tell the user" and the other means "skip and keep going".

### 3. Infrastructure — `src/infrastructure/adapters/anilist/`

Implements the port against the **AniList GraphQL API**.

| File                            | Responsibility                                                           |
| :------------------------------ | :------------------------------------------------------------------------ |
| `anilist-graphql-repository.ts` | `AniListGraphQLRepository` implements `AnimeRepository`; chunks ids at 50 |
| `dto/anilist-response.dto.ts`   | Typed DTOs for raw AniList responses (zero `any`)                        |
| `graphql/queries.ts`            | `SEARCH_ANIME_QUERY` + `FRANCHISE_BATCH_QUERY`                           |
| `mappers/franchise-work-mapper.ts` | `mapBatchResponse` — raw DTO → `WorkBatch` in domain vocabulary        |

Two AniList facts the batching depends on:

1. **One ID space across anime and manga.** Omitting the `type` filter returns source works (manga, novels) in the same request, for free.
2. **Rate limiting counts requests, not query complexity.** So `FRANCHISE_BATCH_QUERY` nests `relations` three deep at no extra cost.

Error mapping: HTTP 429 → `RateLimitedError` (carrying `Retry-After` when present); network failure, non-OK status or unparseable body → `RepositoryUnavailableError`. Search degrades differently on purpose — it returns `[]` rather than throwing, because an empty dropdown while typing is not a failure worth interrupting the user for.

### 4. App Layer — `src/app/`, `src/ui/`, `src/hooks/`

React / Next.js boundary. **Components stay presentational; all orchestration lives in the hook.**

- **`src/hooks/useAnimeSearch.ts`** — the single orchestration point:
  - Instantiates the repository and collector at module scope, wired to the port type.
  - 350ms debounced search with cancellation on query change; results gated at ≥3 characters.
  - On selection: `collector.collect(id)` → `evaluateWatchingScore(franchise.summary, new Date())`.
- **`src/ui/components/SearchBar.tsx`** — controlled input + result dropdown.
- **`src/ui/components/SeasonCard.tsx`** — metadata of the entry the user selected.
- **`src/ui/components/FranchiseCard.tsx`** — franchise totals, AniList rating, next-episode countdown.
- **`src/ui/components/ScoreCard.tsx`** — the Timing Score verdict and its notes.
- **`src/ui/components/FranchiseTimeline.tsx`** — release-order strip with `rootId` marked in place; renders nothing below two entries.
- **`src/app/page.tsx`** — composes the hook and components, and handles the empty/loading/failed states.

**A component file holds a component and nothing else.** Every function it would otherwise declare
lives in `src/ui/helpers/`, and every table of presentation data in `src/ui/constants/`; which of
the two a module belongs to is decided by what it exports — functions or values.

Both are **presentation only**. They may import from `core/domain`; nothing in `core` may import
from `ui`. A helper that *decides* something about a franchise rather than giving it a label
belongs in `core/domain/services` instead.

---

## 🔄 Data Flow (Search → Score)

```
 User types "Attack on Titan"
        │
        ▼
useAnimeSearch ── debounce 350ms ──► repository.searchAnime(query)
        │                                      │
        │                            AniList GraphQL (POST)
        │                                      │
        ▼                                      ▼
   results (AnimeSearchResult[]) ◄─── SEARCH_ANIME_QUERY → mapped inline
        │
        ▼
User clicks a result
        │
        ▼
collector.collect(rootId)
        │
        ├─► repository.getWorksByIds(frontier)  ──► FRANCHISE_BATCH_QUERY
        │        ▲                    │                     │
        │        │                    ▼            mapBatchResponse
        │        └── next frontier ── WorkBatch { works, edges, stubs }
        │            (from stubs)
        ▼
   Franchise { rootId, nodes, edges, timeline, related,
               sources, summary, isComplete, unresolvedIds }
        │
        ▼
evaluateWatchingScore(franchise.summary, now)
        │            └─► deriveWatchingSituation(summary, now)
        ▼
   TimingScore { score, level, badgeText, summary, details, notes }
        │
        ▼
SeasonCard + FranchiseCard + ScoreCard + FranchiseTimeline
```

---

## 🚫 Dependency Rules

1. **Outward dependencies only:** `app` → `ports` → `domain`. `infrastructure` → `domain`.
2. **Domain imports nothing** except other domain files (and the port it consumes).
3. **`@/` path alias** maps to `src/` (see `tsconfig.json` `paths`).
4. **Swap adapters without touching the app:** a new provider only requires a new class implementing `AnimeRepository`.
5. **Strict TypeScript:** `strict: true`, zero `any` policy.
6. **No server runtime.** `next.config.ts` sets `output: "export"`, so every AniList call is client-side. No server actions, no route handlers, nothing requiring a Node server.

---

## 🔌 Testability

The port/adapter split is what makes the domain testable without a network:

- **Collector tests** drive `FranchiseCollector` through `InMemoryAnimeRepository` (`src/test/fakes/`), a domain test double that answers batched reads the same way the real adapter does — including the three-hop topology, so crossover leaks are catchable. It also counts requests, which is how request-efficiency claims stay honest.
- **Scoring tests** call `summarizeFranchise`, `deriveWatchingSituation` and `evaluateWatchingScore` directly with constructed summaries and an injected `now`.
- **Mapper tests** replay recorded AniList responses from `src/test/fixtures/anilist/`, so the DTO → domain mapping is verified against shapes the real API actually produced.
- **Component tests** render each card with constructed props; none of them touch the network.

See `docs/TESTING.md` for the layout, the recorded-fixture policy and the hazards each fixture pins.
