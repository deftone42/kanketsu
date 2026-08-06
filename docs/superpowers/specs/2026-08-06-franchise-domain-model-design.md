# Franchise Domain Model — Design

**Date:** 2026-08-06
**Status:** Approved for planning

## Problem

Three defects, one shared cause.

1. **The API cuts us off.** `FranchiseCollector.collect()` issues one sequential HTTP request per node via `getAnimeWithRelations` (`Media(id:)`). AniList's limit is currently **30 req/min** (degraded from 90). Monogatari costs 14 requests; two searches exhaust the budget.

2. **Failures masquerade as success.** `anilist-graphql-repository.ts:348` collapses every non-OK response to `null`. The collector reads `null` as "anime not found" (`franchise-collector.ts:99`), skips the node **and its entire unexplored subtree**, and returns a franchise that looks complete but isn't. A rate-limited search silently returns a truncated franchise.

3. **The root node is wrong.** `getAnimeById` discards the requested id and substitutes `sortedTv[0]`, the earliest TV entry (`anilist-graphql-repository.ts:220-221`). Searching Fate/Zero returns Fate/stay night.

Plus two structural gaps:

- **Ordering is year-granular.** `buildMainTimeline` sorts on `releaseYear` alone (`franchise-collector.ts:174-178`), so same-year entries fall back to non-deterministic BFS insertion order. Observed: Kizumonogatari II ordered before Kizumonogatari I.
- **No bridge to scoring.** `evaluateWatchingScore` needs franchise-level aggregates. Only the legacy `getAnimeById` produces them — imperatively, inside the adapter, untested (`anilist-graphql-repository.ts:243-298`).

## Product framing

The app answers one question: *is now a good time to watch this?*

Earlier designs tried to collapse a franchise into a single "face" entry. That fails on real data because franchises are not one shape. Jujutsu Kaisen S2 is a *season* of a continuous work; Fate/Zero is a *standalone work* in a shared universe. No single rule serves both.

**We stop trying.** A complete answer has three parts, none of which requires picking a winner:

1. **What the user selected** — the header. Always their choice, no heuristic, never wrong.
2. **Where to start** — `timeline[0]`, surfaced as guidance ("Start from: Jujutsu Kaisen (2020)").
3. **The verdict** — a franchise-level score computed across every entry.

The UI renders the timeline as a carousel/list in release order with the selected entry highlighted. "Each entry is independent" becomes something the timeline *displays* rather than something the model must resolve.

### Rejected: grouping by source work

Tested and discarded. "Entries sharing a source work are one series" groups JJK S1/S2 correctly (both adapt manga 101517) but fails on real data:

- **Monogatari** — Bakemonogatari adapts novel 44893, Nisemonogatari 143703, Second Season five further novels. Would split one series into six.
- **Steins;Gate** — original anime, no source edge at all. No signal.
- **Code Geass** — S1 and R2 sources *intersect* but are not identical.

Source data is still collected, for its original purpose: "has the manga finished" is a genuine scoring signal.

## Architecture

Hexagonal, dependency-inward. The domain imports nothing outside itself; no AniList-shaped type crosses the port. Names stay semantic (`timeline`, `sourceStatus`, `unresolvedIds`).

### Domain model — `src/core/domain/models/`

```ts
type FranchiseWork = AnimeWork | SourceWork;   // discriminated on `kind`

interface AnimeWork {
  kind: "ANIME";
  id: number;
  title: Title;
  coverImage: string;
  format: AnimeFormat | null;
  startDate: PartialDate;          // { year, month, day } — full date, for deterministic ordering
  endDate: PartialDate | null;
  episodes: number | null;
  score: number | null;
  status: AnimeStatus;
  nextAiringEpisode: NextEpisode | null;
  relations: Relation[];
}

interface SourceWork {
  kind: "SOURCE";
  id: number;
  title: Title;
  format: "MANGA" | "NOVEL" | "ONE_SHOT";
  status: SourceStatus;            // FINISHED | RELEASING | HIATUS | CANCELLED
  chapters: number | null;
  volumes: number | null;
}

interface Franchise {
  rootId: number;                  // what the user selected → the highlighted card
  nodes: Map<number, FranchiseWork>;
  edges: FranchiseEdge[];
  timeline: AnimeWork[];           // PREQUEL/SEQUEL chain, release order by full startDate
  related: AnimeWork[];            // movies, OVAs, specials, side stories
  sources: SourceWork[];
  summary: FranchiseSummary;
  isComplete: boolean;
  unresolvedIds: number[];         // known to exist, never hydrated
}

interface FranchiseSummary {       // the score's only input
  startYear: number | null;
  endYear: number | null;
  totalEpisodes: number;           // summed; preserves the `nextAiringEpisode - 1` fallback
  averageScore: number | null;
  status: AnimeStatus;             // franchise-level
  nextAiringEpisode: NextEpisode | null;
  sourceStatus: "FINISHED" | "ONGOING" | "UNKNOWN";
}
```

`timeline` + `rootId` is the carousel: render `timeline`, highlight `rootId`.

`evaluateWatchingScore` changes signature from `Anime` to `FranchiseSummary`. Blast radius is small — `evaluate-score.test.ts` does not exist despite `docs/TESTING.md` claiming it does.

`sourceStatus` is wired but **not yet consumed** by the scorer. Changing the model and the scoring rules in one step would make regressions untraceable; tuning is separate work.

### Port — `src/core/ports/anime-repository.ts`

```ts
getWorksByIds(ids: number[]): Promise<FranchiseWork[]>
```

Replaces per-node `getAnimeWithRelations`. Batched, 3-hop nested, no `type` filter.

### Traversal

`FranchiseCollector` becomes **frontier-batched**: fetch the entire current frontier in one call, absorb 3 hops of edges from the response, compute the next frontier from what remains unvisited, repeat. A final batch hydrates non-traversed anime relatives and source works.

**Hydrated nodes vs. topology stubs.** Only media returned at the *top level* of a batch (`Page.media[]`) carry full fields and become hydrated `FranchiseWork` nodes. Media appearing inside nested `relations` carry a reduced projection — `id`, `type`, `format`, `title` — and are **topology stubs**: they reveal graph shape and ids ahead of time, letting the collector plan a wider frontier per request, but they are never stored as nodes. A stub becomes a node only when it appears top-level in a later batch. This is what makes the nesting valuable without making it a correctness hazard.

Traversal still follows **only PREQUEL/SEQUEL**. All edge types are still recorded. `maxDepth`, cycle detection, and format filtering are preserved.

Two verified AniList facts make this work:

- **One shared ID space** across anime and manga — dropping `type: ANIME` returns both in a single `id_in` batch, so source works cost nothing.
- **Rate limiting counts requests, not query complexity** — nesting `relations` three levels deep is free, collapsing a linear chain from O(nodes) to O(depth/3).

Measured effect:

| Franchise | Today | Designed |
|---|---|---|
| Attack on Titan (linear, 8 entries) | 9 | ~4 |
| Monogatari (14 nodes) | 14 | ~4 |
| One Piece + movies/OVAs/manga | ~50 | ~3 |

Linear chains benefit least: stubs let each request hydrate roughly three new entries instead of one, so an 8-entry chain lands near 4 requests rather than 9. Wide franchises benefit most — One Piece's ~46 relatives collapse into a single hydration batch.

`getAnimeById` and `MEDIA_BATCH_QUERY` are **deleted** once `useAnimeSearch` moves over. The two coexisting franchise implementations collapse to one.

## Error handling

Typed domain errors in `src/core/domain/errors/`. No HTTP vocabulary crosses the port:

```ts
class RateLimitedError           extends RepositoryError { retryAfterSeconds: number | null }
class WorkNotFoundError          extends RepositoryError { id: number }
class RepositoryUnavailableError extends RepositoryError {}
```

The adapter owns translation: `429 + Retry-After` → `RateLimitedError`; `404` / `Media: null` → `WorkNotFoundError`; network, 5xx, malformed → `RepositoryUnavailableError`.

The collector distinguishes them:

- **`WorkNotFoundError`** → skip the node, continue. A dead id is data, not failure.
- **`RateLimitedError` / `RepositoryUnavailableError`** → stop traversal, set `isComplete: false`, record `unresolvedIds`. Never fabricate a complete-looking franchise.

**Decision: fail fast on rate limit.** No automatic wait-and-retry. Chosen because the request count drops to ~3, making the cap unlikely to bind, and because a retry that silently costs 60 seconds behind a loader is worse than a UI that reports the problem and lets the user retry. Revisit if the cap proves to bind in practice.

The UI renders what it has and states what is missing, rather than quietly lying.

## Testing

Fixtures are **recorded from real AniList responses**, never hand-authored. Hand-written mocks encode what we assume the API returns; every defect found during investigation came from shapes nobody would have invented.

A recording script hits the live API and writes JSON to `src/test/fixtures/anilist/`. Tests replay those files — CI never touches the network. Re-record when queries change.

**Domain tests** run against an in-memory fake repository — pure, no MSW, no network. This is the payoff of the hexagonal boundary.

| Fixture | Pins |
|---|---|
| Attack on Titan (16498) | linear 8-chain, correct release order |
| Monogatari (5081) | same-year ties → Kizumonogatari I before II |
| One Piece (21) | wide relatives; `episodes: null` while ongoing → `nextAiringEpisode - 1` fallback |
| Fate (10087 / 356) | prequel released later; timeline stays release-ordered; absent source work |
| Steins;Gate (9253) | no source work → `sourceStatus: "UNKNOWN"` |
| Jujutsu Kaisen (113415 / 145064) | multi-season continuous work |
| id 9183 | genuine 404 → `WorkNotFoundError`, traversal continues |
| 429 mid-traversal | `isComplete: false`, `unresolvedIds` populated, no silent truncation |
| cycle | existing guarantee preserved |

**Adapter tests** use MSW over DTO→domain mapping only: nested 3-hop absorption, anime vs manga discrimination, partial dates, HTTP→domain error translation. `src/mocks/handlers.ts` must be updated in lockstep or every integration test fails on unmocked requests.

**`test:franchise` harness stays** as the real-API smoke test. Its `--id=9183` reference is corrected — 9183 is a dead id, real Gintama is 918.

## Out of scope

- Tuning `evaluateWatchingScore` to consume `sourceStatus`.
- UI implementation of the carousel.
- Genre recommendations and the deployment pipeline (`ROADMAP.md`).
