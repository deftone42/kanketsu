# 🏗️ AniTime Architecture Guide

AniTime follows **Hexagonal Architecture (Ports & Adapters)**, separating the pure core domain logic from the UI framework and external API providers. This guide explains each layer, the flow of data, and the rules that keep the boundaries clean.

---

## 📐 Layer Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     APP LAYER  (Next.js UI)                  │
│   src/app/         pages, layout, global styles              │
│   src/components/  SearchBar, AnimeDetailCard                │
│   src/hooks/       useAnimeSearch (state + orchestration)    │
├─────────────────────────────────────────────────────────────┤
│                    PORT (Interface)                          │
│   src/core/ports/  AnimeRepository                           │
├──────────────────────┬──────────────────────────────────────┤
│  DOMAIN (Pure TS)    │   INFRASTRUCTURE (Adapter)            │
│  src/core/domain/    │   src/infrastructure/adapters/anilist/ │
│  models/ anime,score │   anilist-graphql-repository.ts       │
│  services/ evaluate- │   dto/ anilist-response.dto.ts        │
│  score               │   graphql/ queries.ts                  │
└──────────────────────┴──────────────────────────────────────┘
```

---

## 🧱 Layer Responsibilities

### 1. Core Domain — `src/core/domain/`

**Zero external framework dependencies.** Pure TypeScript only.

| Path                         | Responsibility                                                |
| :--------------------------- | :------------------------------------------------------------ |
| `models/anime.ts`            | Domain entity `Anime` + `AnimeStatus` + `AnimeRelation` types |
| `models/score.ts`            | `TimingScore` result type + `ScoreLevel` enum                 |
| `services/evaluate-score.ts` | Pure function `evaluateWatchingScore(anime): TimingScore`     |

Key rule: **the domain never imports from `@/app`, `next`, React, or any infrastructure module.**

### 2. Ports — `src/core/ports/`

TypeScript interfaces that define the contract between the app and external adapters.

```ts
export interface AnimeRepository {
  searchAnime(query: string): Promise<AnimeSearchResult[]>;
  getAnimeById(id: number): Promise<Anime | null>;
}
```

- `AnimeSearchResult` — lightweight summary used by the search dropdown.
- `Anime` — full detail model used by `evaluateWatchingScore` and `AnimeDetailCard`.

### 3. Infrastructure — `src/infrastructure/adapters/anilist/`

Implements the port against the **AniList GraphQL API**.

| File                            | Responsibility                                          |
| :------------------------------ | :------------------------------------------------------ |
| `anilist-graphql-repository.ts` | `AniListGraphQLRepository` implements `AnimeRepository` |
| `dto/anilist-response.dto.ts`   | Typed DTOs for raw AniList responses (zero `any`)       |
| `graphql/queries.ts`            | `SEARCH_ANIME_QUERY` + `GET_ANIME_BY_ID_QUERY`          |

Adapter responsibilities:

- Maps raw GraphQL DTOs → domain models.
- Guards against malformed/empty API responses (returns `[]` / `null`).
- Logs errors via `console.error` and degrades gracefully.

### 4. App Layer — `src/app/`, `src/components/`, `src/hooks/`

React / Next.js boundary.

- **`src/hooks/useAnimeSearch.ts`** — The orchestration hub:
  - Instantiates `AniListGraphQLRepository` (wired to the port type `AnimeRepository`).
  - 350ms debounced search with cancellation on query change.
  - Derived state via `useMemo` (`results` only shown when query ≥ 3 chars).
  - On selection: fetches full detail → computes `evaluateWatchingScore`.
- **`src/components/SearchBar.tsx`** — Controlled search input + dropdown.
- **`src/components/AnimeDetailCard.tsx`** — Displays metadata + Timing Score verdict.
- **`src/app/page.tsx`** — Composes the hook + components into the landing page.

---

## 🔄 Data Flow (Search → Score)

```
 User types "One Piece"
        │
        ▼
useAnimeSearch  ── debounce 350ms ──►  repository.searchAnime(query)
        │                                     │
        │                          AniList GraphQL (POST)
        │                                     │
        ▼                                     ▼
   results (AnimeSearchResult[]) ◄─── DTO → Domain mapper
        │
        ▼
User clicks a result ──► repository.getAnimeById(id) ──► Anime
                                                          │
                                                          ▼
                                              evaluateWatchingScore(anime)
                                                          │
                                                          ▼
                                              TimingScore { score, level,
                                                           badgeText, ... }
                                                          │
                                                          ▼
                                          AnimeDetailCard renders verdict
```

---

## 🚫 Dependency Rules

1. **Outward dependencies only:** `app` → `ports` → `domain`. `infrastructure` → `domain`.
2. **Domain imports nothing** except other domain files.
3. **`@/` path alias** maps to `src/` (see `tsconfig.json` `paths`).
4. **Swap adapters without touching the app:** a new provider (e.g. MyAnimeList) only requires a new class implementing `AnimeRepository`.
5. **Strict TypeScript:** `strict: true`, zero `any` policy enforced by ESLint.

---

## 🔌 Testability

The port/adapter split makes mocking trivial:

- **Unit tests** feed hand-crafted `Anime` fixtures directly into `evaluateWatchingScore` (see `src/app/__tests__/fixtures/`).
- **Integration tests** use **MSW** to intercept the AniList endpoint (`https://graphql.anilist.co`) so the real network is never touched.
- Fixtures live in `src/app/__tests__/fixtures/` and represent real series: Frieren, Gintama, One Piece, Sacred Seven.
