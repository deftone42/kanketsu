# 🧪 Kanketsu Testing Guide

Kanketsu uses **Vitest** with **React Testing Library** for components and **MSW** for network interception.

The governing rule: **fixtures are recorded from the real AniList API, never hand-written.** Hand-written mocks encode what we _assume_ the API returns, and every defect found while designing the franchise model came from a shape nobody would have invented.

---

## 🛠️ Tooling Stack

| Tool                      | Purpose                                                 |
| :------------------------ | :------------------------------------------------------ |
| **Vitest**                | Test runner (Vite-based), `globals: true`               |
| **React Testing Library** | Render components & query them like a user              |
| **MSW**                   | Intercept `https://graphql.anilist.co` network requests |
| **happy-dom**             | Lightweight DOM environment for component tests         |
| **jest-dom**              | Custom matchers (`toBeInTheDocument`, etc.)             |

Configured in `vitest.config.mjs`.

---

## 🚀 Running Tests

```bash
npm run test                          # single run (CI)
npm run test:watch                    # watch mode
npm run test -- franchise-collector   # one file (substring match on path)
npm run test -- -t "cycle"            # one test by name
```

CI (`.github/workflows/ci.yml`) runs `lint` → `tsc --noEmit` → `test` → `build`. **`npm run lint` does not type check** — run `npx tsc --noEmit` too before calling work done.

Two scripts hit the real network and are **never** part of CI:

```bash
npm run record:fixtures               # re-record src/test/fixtures/anilist/*.json
npm run test:franchise -- --id=21     # real AniList call + BFS dump (default: One Piece)
```

---

## 📁 Test Layout

Tests sit beside the code they cover.

| Path                                                       | Coverage                                              |
| :--------------------------------------------------------- | :---------------------------------------------------- |
| `src/core/domain/services/franchise-collector.test.ts`     | Traversal: ordering, crossovers, cycles, failures      |
| `src/core/domain/services/summarize-franchise.test.ts`     | Folding works into `FranchiseSummary`                  |
| `src/core/domain/services/watching-situation.test.ts`      | The eight `WatchingSituation` classifications          |
| `src/core/domain/services/evaluate-score.test.ts`          | Situation → score, modifiers, `ScoreLevel` bands       |
| `src/core/domain/models/partial-date.test.ts`              | Ordering with partially-known dates                    |
| `src/core/domain/errors/repository-errors.test.ts`         | Error identity and `retryAfterSeconds`                 |
| `src/infrastructure/.../mappers/franchise-work-mapper.test.ts` | DTO → domain against recorded fixtures            |
| `src/ui/components/*.test.tsx`                              | `SeasonCard`, `FranchiseCard`, `ScoreCard`, `FranchiseTimeline` |
| `src/ui/helpers/*.test.ts`                                  | Label and format helpers, unit tested in isolation     |
| `src/test/fakes/in-memory-anime-repository.ts`             | Domain test double implementing `AnimeRepository`      |
| `src/test/fixtures/anilist/*.json`                         | Recorded AniList responses                             |
| `src/mocks/handlers.ts` / `server.ts`                      | MSW handlers + server instance                         |
| `src/test/setup.ts`                                        | jest-dom matchers + MSW lifecycle                      |
| `vitest.setup.tsx`                                         | Mocks `next/image` → native `<img>`                    |

---

## 🔌 Global Setup

Both setup files run for every test (`setupFiles` in `vitest.config.mjs`).

### `src/test/setup.ts`

```ts
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

`onUnhandledRequest: "error"` means any unmocked API call **fails the test** rather than silently hanging or hitting the real API.

### `vitest.setup.tsx`

Mocks `next/image` as a plain `<img>`, stripping the `fill` / `sizes` / `priority` props that a native element rejects.

---

## 🎭 Test Doubles: which one, and when

Three layers of substitution, each for a different question.

### `InMemoryAnimeRepository` — for traversal logic

`src/test/fakes/in-memory-anime-repository.ts` implements `AnimeRepository` over in-memory maps, built up fluently:

```ts
const repository = new InMemoryAnimeRepository()
  .addWork(anime(1, "Season 1", { year: 2013 }))
  .addWork(anime(2, "Season 2", { year: 2017 }))
  .addEdge(1, "SEQUEL", 2);
```

Two details make it worth more than a stub:

- **It models three-hop topology, not one.** `FRANCHISE_BATCH_QUERY` nests `relations` three deep, so a real response carries edges leaving the requested works _and_ edges leaving their neighbours. A fake that returned only the first hop would hide the crossover leak these tests exist to catch.
- **It counts requests** (`requestCount`), which is how "a frontier costs one request" stays an assertion instead of a claim.

It can also be told to fail: `failOn(id, new RateLimitedError(60))` drives the partial-franchise paths.

### Recorded fixtures — for the mapping

The mapper tests replay real responses, so the DTO → domain boundary is checked against shapes AniList actually produced.

### MSW — for the network boundary

`src/mocks/handlers.ts` intercepts `POST https://graphql.anilist.co` and branches on the request body: a query containing `id_in` gets the recorded Attack on Titan batch, anything else gets a small literal search page.

> **Current state:** no test renders `page.tsx`, `useAnimeSearch` or `AniListGraphQLRepository`, so nothing currently reaches MSW — the lifecycle runs, but no handler is exercised. The wiring is in place for the integration test of the full journey (debounced search → dropdown → collect → verdict), which has not been written yet. Until it exists, changing `queries.ts` or the DTOs will **not** be caught by a failing handler.

---

## 📼 Recorded Fixtures

`npm run record:fixtures` calls the real API with `FRANCHISE_BATCH_QUERY` and writes `src/test/fixtures/anilist/*.json` as `{ requestedIds, response }`. Tests replay them offline; CI never touches the network.

**Re-record whenever `FRANCHISE_BATCH_QUERY` changes** — a fixture recorded against an older query is missing the new fields, and the mapper will read `undefined` while the tests still pass.

Each fixture pins a hazard found against the live API:

| Fixture                 | IDs                    | Hazard it pins                                                             |
| :---------------------- | :--------------------- | :-------------------------------------------------------------------------- |
| `attack-on-titan.json`  | 16498, 20958, 99147    | A plain linear chain — the happy path                                       |
| `monogatari.json`       | 5081, 11597, 9260, 21399 | Entries sharing a release year; ordering must fall through to month/day    |
| `one-piece.json`        | 21                     | `episodes: null` while still airing, and a very wide `related` set          |
| `fate.json`             | 10087, 356             | A prequel that aired **later** than its sequel; source work absent          |
| `steins-gate.json`      | 9253                   | An original anime with no source work at all                                |
| `jujutsu-kaisen.json`   | 113415, 145064         | Multiple seasons adapting one shared source                                 |
| `missing-work.json`     | 9183                   | A **dead id** — AniList returns an empty `media` array, not an error        |

> ⚠️ **9183 is not Gintama.** It is a dead id, which is exactly why it is recorded. Real Gintama is `918`. Older notes in this repo cite 9183 as if it were a real series — it is not.

The recording script spaces calls 2.5s apart: AniList is throttled to **30 requests/minute**.

---

## ✅ What the suites actually assert

**`franchise-collector.test.ts`** is the largest and the most opinionated. Beyond ordering and batching it pins the boundary of a franchise:

- A crossover is not membership. Following `CHARACTER` edges reaches Dragon Ball Z and Toriko from One Piece — along with a Nissan commercial and a Lakers promo. Those edges are recorded as topology and never traversed.
- A disconnected sequel chain stays out; a cycle does not hang; a dead id is skipped and traversal continues; a rate limit stops traversal and reports `isComplete: false` with `unresolvedIds`.
- `rootId` survives even when the selected work is not first in the timeline.

**Scoring suites** construct summaries directly and inject `now`, so nothing depends on the wall clock. The reference scenario is HUNTER×HUNTER (2011): a `FINISHED` anime whose manga never concluded, which must read as a stalled adaptation rather than a completed story. See `docs/SCORING-SYSTEM.md`.

**Component suites** render each card with constructed props and query by role, label and text.

---

## 🧠 Best Practices for This Repo

1. **Record fixtures, don't write them.** If you need a new API shape, add a scenario to `src/scripts/record-fixtures.ts` and run it. A hand-written mock only proves the code agrees with your assumptions.
2. **Pick the right double.** Traversal logic → `InMemoryAnimeRepository`. Mapping → recorded fixture. Network/HTTP behaviour → MSW.
3. **Inject `now`.** Never let a test depend on the real date; both scoring functions take time as a parameter for this reason.
4. **Keep MSW handlers in step with `queries.ts`** — nothing fails loudly if you forget, so this one is on you until the integration test lands.
5. **Test behavior, not implementation** — query by role/label/text, avoid `container.querySelector`.
6. **Zero `any`** — mocks and DTOs must be typed.
