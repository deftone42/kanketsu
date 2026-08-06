# Franchise Domain Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-node franchise fetching with a batched, error-honest domain model that collects a whole franchise into our own types and feeds the watching score a tested aggregate.

**Architecture:** Hexagonal, dependency-inward. The domain (`src/core/domain`) imports nothing outside itself. A single new port method `getWorksByIds` returns a `WorkBatch` of hydrated works plus topology stubs; `FranchiseCollector` traverses frontier-by-frontier instead of node-by-node. Aggregation moves out of the AniList adapter into a pure `summarizeFranchise` service.

**Tech Stack:** TypeScript (strict, ES2017, zero `any`), Next.js 15 static export, Vitest + happy-dom + MSW, AniList GraphQL.

## Global Constraints

- Node `>=22`. Run `nvm use` before anything.
- TypeScript strict mode. **Zero `any` policy** (`AGENTS.md`).
- The domain imports nothing outside itself — no React, no Next, no `fetch`, no AniList DTOs.
- `@/*` maps to `src/*`.
- Names stay semantic: `timeline`, `entryPoint`, `sourceStatus`, `unresolvedIds` — never `data`, `list`, `item`.
- CI order is `lint` → `tsc --noEmit` → `test` → `build`. `npm run lint` alone does **not** type check.
- Test fixtures are **recorded from the real API**, never hand-authored.
- Every task ends with a green `npm run test` and a commit.

## File Structure

**Created:**
- `src/core/domain/models/partial-date.ts` — full-precision date + comparator
- `src/core/domain/models/franchise-work.ts` — `AnimeWork | SourceWork` union, stubs, guards
- `src/core/domain/errors/repository-errors.ts` — typed domain errors
- `src/core/domain/services/summarize-franchise.ts` — the aggregate feeding the score
- `src/core/domain/services/summarize-franchise.test.ts`
- `src/core/domain/models/partial-date.test.ts`
- `src/infrastructure/adapters/anilist/mappers/franchise-work-mapper.ts` — DTO→domain
- `src/infrastructure/adapters/anilist/mappers/franchise-work-mapper.test.ts`
- `src/scripts/record-fixtures.ts` — fixture recorder
- `src/test/fixtures/anilist/*.json` — recorded responses
- `src/test/fakes/in-memory-anime-repository.ts` — domain test double

**Modified:**
- `src/core/domain/models/franchise.ts` — `Franchise`, `FranchiseEdge`, `FranchiseSummary`, `WorkBatch`
- `src/core/ports/anime-repository.ts` — `getWorksByIds` replaces `getAnimeWithRelations`/`getAnimeById`
- `src/core/domain/services/franchise-collector.ts` — frontier-batched rewrite
- `src/core/domain/services/franchise-collector.test.ts` — rewritten against the fake
- `src/core/domain/services/evaluate-score.ts` — takes `FranchiseSummary`
- `src/infrastructure/adapters/anilist/graphql/queries.ts` — nested batch query
- `src/infrastructure/adapters/anilist/anilist-graphql-repository.ts` — shrinks substantially
- `src/mocks/handlers.ts` — serves recorded fixtures
- `src/hooks/useAnimeSearch.ts` — consumes `Franchise`
- `src/scripts/test-franchise.ts` — updated output, correct default id
- `CLAUDE.md` — corrected id reference, single implementation

**Deleted:** `MEDIA_BATCH_QUERY`, `getAnimeById`, `getAnimeWithRelations`, `GET_ANIME_BY_ID_QUERY`, `SEARCH_LATEST_BY_NAME_QUERY`, `SEARCH_FRANCHISE_MEDIA_QUERY`, `GET_ANIME_WITH_RELATIONS_QUERY`, and — in the Task 9 sweep — the `Anime` interface, `FranchiseMediaItem`, the single-media DTOs, and `Relation` if nothing still consumes it.

**Out of scope (follow-up plan):** the season carousel. `Franchise.timeline` + `Franchise.rootId` give it everything it needs — ordered release-order chain plus the entry to highlight — but the component itself gets its own spec and design pass.

---

### Task 1: Full-precision dates

Fixes the ordering defect: `buildMainTimeline` sorts on year alone, so Kizumonogatari II lands before Kizumonogatari I.

**Files:**
- Create: `src/core/domain/models/partial-date.ts`
- Test: `src/core/domain/models/partial-date.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `interface PartialDate { year: number | null; month: number | null; day: number | null }`, `UNKNOWN_DATE: PartialDate`, `toSortWeight(date: PartialDate): number`, `comparePartialDates(a: PartialDate, b: PartialDate): number`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/domain/models/partial-date.test.ts
import { describe, it, expect } from "vitest";
import {
  comparePartialDates,
  toSortWeight,
  UNKNOWN_DATE,
  PartialDate,
} from "./partial-date";

const date = (year: number | null, month: number | null = null, day: number | null = null): PartialDate => ({ year, month, day });

describe("toSortWeight", () => {
  it("orders by year, then month, then day", () => {
    expect(toSortWeight(date(2016, 1, 8))).toBeLessThan(toSortWeight(date(2016, 8, 19)));
  });

  it("treats a missing month or day as the start of the period", () => {
    expect(toSortWeight(date(2016))).toBe(toSortWeight(date(2016, 1, 1)));
  });

  it("sorts unknown years last", () => {
    expect(toSortWeight(UNKNOWN_DATE)).toBeGreaterThan(toSortWeight(date(9999, 12, 31)));
  });
});

describe("comparePartialDates", () => {
  it("orders Kizumonogatari I before II within the same year", () => {
    expect(comparePartialDates(date(2016, 1, 8), date(2016, 8, 19))).toBeLessThan(0);
  });

  it("is symmetric", () => {
    expect(comparePartialDates(date(2016, 8, 19), date(2016, 1, 8))).toBeGreaterThan(0);
  });

  it("returns 0 for equal dates", () => {
    expect(comparePartialDates(date(2013, 4, 7), date(2013, 4, 7))).toBe(0);
  });

  it("pushes unknown dates to the end", () => {
    expect(comparePartialDates(UNKNOWN_DATE, date(1999))).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- partial-date`
Expected: FAIL — `Failed to resolve import "./partial-date"`

- [ ] **Step 3: Write minimal implementation**

```ts
// src/core/domain/models/partial-date.ts

/** A date that AniList may only partially know. Any component can be absent. */
export interface PartialDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

/** A date AniList knows nothing about. Sorts after every known date. */
export const UNKNOWN_DATE: PartialDate = { year: null, month: null, day: null };

const UNKNOWN_WEIGHT = Number.MAX_SAFE_INTEGER;

/**
 * Collapses a partial date into a single comparable number.
 * Absent month/day mean "start of the period", matching how AniList
 * reports a series whose exact premiere day is not yet announced.
 */
export function toSortWeight(date: PartialDate): number {
  if (date.year === null) return UNKNOWN_WEIGHT;
  return date.year * 10000 + (date.month ?? 1) * 100 + (date.day ?? 1);
}

/** Ascending comparator for release ordering. Unknown dates sort last. */
export function comparePartialDates(a: PartialDate, b: PartialDate): number {
  return toSortWeight(a) - toSortWeight(b);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- partial-date`
Expected: PASS, 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/core/domain/models/partial-date.ts src/core/domain/models/partial-date.test.ts
git commit -m "feat: full-precision partial dates for deterministic release ordering"
```

---

### Task 2: Typed repository errors

Fixes the silent-truncation defect: today a 429 becomes `null` and reads as "anime not found".

**Files:**
- Create: `src/core/domain/errors/repository-errors.ts`
- Test: `src/core/domain/errors/repository-errors.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `RepositoryError` (abstract base), `WorkNotFoundError` (`.id: number`), `RateLimitedError` (`.retryAfterSeconds: number | null`), `RepositoryUnavailableError`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/domain/errors/repository-errors.test.ts
import { describe, it, expect } from "vitest";
import {
  RepositoryError,
  WorkNotFoundError,
  RateLimitedError,
  RepositoryUnavailableError,
} from "./repository-errors";

describe("repository errors", () => {
  it("distinguishes a missing work from a rate limit", () => {
    const notFound = new WorkNotFoundError(9183);
    const limited = new RateLimitedError(60);

    expect(notFound).toBeInstanceOf(WorkNotFoundError);
    expect(notFound).not.toBeInstanceOf(RateLimitedError);
    expect(limited).toBeInstanceOf(RateLimitedError);
  });

  it("shares a common base so callers can catch broadly", () => {
    expect(new WorkNotFoundError(1)).toBeInstanceOf(RepositoryError);
    expect(new RateLimitedError(null)).toBeInstanceOf(RepositoryError);
    expect(new RepositoryUnavailableError("boom")).toBeInstanceOf(RepositoryError);
  });

  it("carries the id that was not found", () => {
    expect(new WorkNotFoundError(9183).id).toBe(9183);
  });

  it("carries the retry hint, which may be absent", () => {
    expect(new RateLimitedError(42).retryAfterSeconds).toBe(42);
    expect(new RateLimitedError(null).retryAfterSeconds).toBeNull();
  });

  it("sets a readable name on each error", () => {
    expect(new WorkNotFoundError(1).name).toBe("WorkNotFoundError");
    expect(new RateLimitedError(null).name).toBe("RateLimitedError");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- repository-errors`
Expected: FAIL — `Failed to resolve import "./repository-errors"`

- [ ] **Step 3: Write minimal implementation**

No HTTP vocabulary appears here — the adapter owns that translation.

```ts
// src/core/domain/errors/repository-errors.ts

/** Base for every failure the repository port may raise. */
export abstract class RepositoryError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** The work genuinely does not exist. Traversal should skip it and continue. */
export class WorkNotFoundError extends RepositoryError {
  constructor(readonly id: number) {
    super(`Work ${id} does not exist`);
  }
}

/** The upstream API refused us for volume. Traversal must stop, not truncate. */
export class RateLimitedError extends RepositoryError {
  constructor(readonly retryAfterSeconds: number | null) {
    super(
      retryAfterSeconds === null
        ? "Rate limited by the upstream API"
        : `Rate limited by the upstream API; retry in ${retryAfterSeconds}s`,
    );
  }
}

/** Network failure, server error, or a response we could not parse. */
export class RepositoryUnavailableError extends RepositoryError {
  constructor(message: string) {
    super(message);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- repository-errors`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/core/domain/errors/repository-errors.ts src/core/domain/errors/repository-errors.test.ts
git commit -m "feat: typed repository errors so rate limits stop masquerading as missing anime"
```

---

### Task 3: Franchise work model and the summary aggregate

Moves the aggregation currently buried in `anilist-graphql-repository.ts:243-298` into a tested pure service. **Two deliberate behaviour changes** from the old adapter, both bug fixes:

1. Old code computed a per-entry episode sum then threw it away: `totalEpisodes: nextAiringEpisode ? nextAiringEpisode.episode - 1 : totalEpisodes` (line 319-321). For a multi-season ongoing franchise that reports one season's count as the franchise total. Now the fallback applies **per entry** and the sum is kept.
2. Old code checked `hasUpcoming` before `isAllNotReleased` (lines 285-290), so a franchise where nothing has aired came back `NEW_SEASON_COMING`. Now `NOT_RELEASED` wins.

**Files:**
- Create: `src/core/domain/models/franchise-work.ts`
- Create: `src/core/domain/services/summarize-franchise.ts`
- Test: `src/core/domain/services/summarize-franchise.test.ts`
- Modify: `src/core/domain/models/franchise.ts`

**Interfaces:**
- Consumes: `PartialDate`, `comparePartialDates` (Task 1)
- Produces: `AnimeWork`, `SourceWork`, `FranchiseWork`, `WorkStub`, `WorkKind`, `SourceStatus`, `NextEpisode`, `Title`, `isAnimeWork`, `isSourceWork`, `Franchise`, `FranchiseEdge`, `FranchiseSummary`, `WorkBatch`, `summarizeFranchise(timeline: AnimeWork[], related: AnimeWork[], sources: SourceWork[]): FranchiseSummary`

- [ ] **Step 1: Write the model files (no test cycle — pure type declarations)**

```ts
// src/core/domain/models/franchise-work.ts
import { AnimeFormat, AnimeStatus } from "./anime";
import { PartialDate } from "./partial-date";

export type WorkKind = "ANIME" | "SOURCE";

/** Publication status of a written source work. */
export type SourceStatus = "FINISHED" | "RELEASING" | "HIATUS" | "CANCELLED";

export type SourceFormat = "MANGA" | "NOVEL" | "ONE_SHOT";

export interface Title {
  userPreferred: string;
  english: string | null;
  romaji: string | null;
  native: string | null;
}

export interface NextEpisode {
  episode: number;
  timeUntilAiringSeconds: number;
  seasonTitle: string;
}

/** A watchable entry: season, movie, OVA, ONA or special. */
export interface AnimeWork {
  kind: "ANIME";
  id: number;
  title: Title;
  coverImage: string;
  format: AnimeFormat | null;
  startDate: PartialDate;
  endDate: PartialDate | null;
  episodes: number | null;
  score: number | null;
  status: AnimeStatus;
  nextAiringEpisode: NextEpisode | null;
}

/** A written work an anime adapts. Never traversed, only hydrated. */
export interface SourceWork {
  kind: "SOURCE";
  id: number;
  title: Title;
  format: SourceFormat;
  status: SourceStatus;
  chapters: number | null;
  volumes: number | null;
}

export type FranchiseWork = AnimeWork | SourceWork;

/**
 * A work we know exists but have not hydrated. Produced by the nested
 * projection in a batch response; carries only enough to plan the next
 * frontier and label an edge. Never stored as a node.
 */
export interface WorkStub {
  id: number;
  kind: WorkKind;
  format: string | null;
  title: string;
}

export function isAnimeWork(work: FranchiseWork): work is AnimeWork {
  return work.kind === "ANIME";
}

export function isSourceWork(work: FranchiseWork): work is SourceWork {
  return work.kind === "SOURCE";
}
```

```ts
// src/core/domain/models/franchise.ts — replaces the existing file
import { AnimeStatus } from "./anime";
import { AnimeWork, FranchiseWork, SourceWork, WorkStub } from "./franchise-work";
import { RelationType } from "./relation";

/** A directed relation between two works, hydrated or not. */
export interface FranchiseEdge {
  sourceId: number;
  targetId: number;
  relationType: RelationType;
}

/** One batched repository response: hydrated works plus discovered topology. */
export interface WorkBatch {
  works: FranchiseWork[];
  edges: FranchiseEdge[];
  stubs: WorkStub[];
}

/** Whether the franchise's written source has concluded. */
export type FranchiseSourceStatus = "FINISHED" | "ONGOING" | "UNKNOWN";

/** The only input the watching score consumes. */
export interface FranchiseSummary {
  startYear: number | null;
  endYear: number | null;
  totalEpisodes: number;
  averageScore: number | null;
  status: AnimeStatus;
  nextAiringEpisode: AnimeWork["nextAiringEpisode"];
  sourceStatus: FranchiseSourceStatus;
}

/** A complete franchise in our own vocabulary. Nothing AniList-shaped here. */
export interface Franchise {
  /** The work the user selected — the entry the UI highlights. */
  rootId: number;
  nodes: Map<number, FranchiseWork>;
  edges: FranchiseEdge[];
  /** PREQUEL/SEQUEL chain in release order. */
  timeline: AnimeWork[];
  /** Movies, OVAs, specials and side stories outside the timeline. */
  related: AnimeWork[];
  sources: SourceWork[];
  summary: FranchiseSummary;
  /** False when traversal stopped early; the franchise is partial. */
  isComplete: boolean;
  /** Works known to exist that were never hydrated. */
  unresolvedIds: number[];
}
```

- [ ] **Step 2: Write the failing test**

```ts
// src/core/domain/services/summarize-franchise.test.ts
import { describe, it, expect } from "vitest";
import { summarizeFranchise } from "./summarize-franchise";
import { AnimeWork, SourceWork } from "../models/franchise-work";
import { AnimeStatus } from "../models/anime";

function animeWork(overrides: Partial<AnimeWork> & { id: number }): AnimeWork {
  return {
    kind: "ANIME",
    title: { userPreferred: `Work ${overrides.id}`, english: null, romaji: null, native: null },
    coverImage: "",
    format: "TV",
    startDate: { year: 2013, month: 4, day: 7 },
    endDate: null,
    episodes: 25,
    score: 80,
    status: "FINISHED" as AnimeStatus,
    nextAiringEpisode: null,
    ...overrides,
  };
}

function sourceWork(overrides: Partial<SourceWork> & { id: number }): SourceWork {
  return {
    kind: "SOURCE",
    title: { userPreferred: `Source ${overrides.id}`, english: null, romaji: null, native: null },
    format: "MANGA",
    status: "FINISHED",
    chapters: 139,
    volumes: 34,
    ...overrides,
  };
}

describe("summarizeFranchise", () => {
  it("sums episodes across the timeline", () => {
    const summary = summarizeFranchise(
      [animeWork({ id: 1, episodes: 25 }), animeWork({ id: 2, episodes: 12 })],
      [],
      [],
    );
    expect(summary.totalEpisodes).toBe(37);
  });

  it("keeps the sum when one entry is ongoing with an unknown total", () => {
    // Regression: the old adapter replaced the whole sum with one season's count.
    const summary = summarizeFranchise(
      [
        animeWork({ id: 1, episodes: 25 }),
        animeWork({
          id: 2,
          episodes: null,
          status: "ONGOING",
          nextAiringEpisode: { episode: 11, timeUntilAiringSeconds: 3600, seasonTitle: "S2" },
        }),
      ],
      [],
      [],
    );
    expect(summary.totalEpisodes).toBe(35); // 25 + (11 - 1)
  });

  it("reports NOT_RELEASED when nothing has aired yet", () => {
    // Regression: the old adapter reported NEW_SEASON_COMING here.
    const summary = summarizeFranchise(
      [animeWork({ id: 1, status: "NOT_RELEASED", episodes: null })],
      [],
      [],
    );
    expect(summary.status).toBe("NOT_RELEASED");
  });

  it("reports NEW_SEASON_COMING when a released entry has an unaired sequel", () => {
    const summary = summarizeFranchise(
      [animeWork({ id: 1 }), animeWork({ id: 2, status: "NOT_RELEASED", episodes: null })],
      [],
      [],
    );
    expect(summary.status).toBe("NEW_SEASON_COMING");
  });

  it("prefers CANCELLED over every other status", () => {
    const summary = summarizeFranchise(
      [animeWork({ id: 1, status: "ONGOING" }), animeWork({ id: 2, status: "CANCELLED" })],
      [],
      [],
    );
    expect(summary.status).toBe("CANCELLED");
  });

  it("reports ONGOING when an entry is airing", () => {
    const summary = summarizeFranchise([animeWork({ id: 1, status: "ONGOING" })], [], []);
    expect(summary.status).toBe("ONGOING");
  });

  it("averages scores across timeline and related works, ignoring absent ones", () => {
    const summary = summarizeFranchise(
      [animeWork({ id: 1, score: 90 }), animeWork({ id: 2, score: null })],
      [animeWork({ id: 3, score: 80, format: "MOVIE" })],
      [],
    );
    expect(summary.averageScore).toBe(85);
  });

  it("returns a null average when nothing is scored", () => {
    const summary = summarizeFranchise([animeWork({ id: 1, score: null })], [], []);
    expect(summary.averageScore).toBeNull();
  });

  it("takes the start year from the first timeline entry", () => {
    const summary = summarizeFranchise(
      [
        animeWork({ id: 1, startDate: { year: 1999, month: 10, day: 20 } }),
        animeWork({ id: 2, startDate: { year: 2017, month: 4, day: 1 } }),
      ],
      [],
      [],
    );
    expect(summary.startYear).toBe(1999);
  });

  it("takes the end year from the latest concluded entry", () => {
    const summary = summarizeFranchise(
      [
        animeWork({ id: 1, endDate: { year: 2013, month: 9, day: 28 } }),
        animeWork({ id: 2, endDate: { year: 2023, month: 11, day: 4 } }),
      ],
      [],
      [],
    );
    expect(summary.endYear).toBe(2023);
  });

  it("surfaces the soonest upcoming episode", () => {
    const summary = summarizeFranchise(
      [
        animeWork({
          id: 1,
          nextAiringEpisode: { episode: 5, timeUntilAiringSeconds: 900_000, seasonTitle: "Later" },
        }),
        animeWork({
          id: 2,
          nextAiringEpisode: { episode: 2, timeUntilAiringSeconds: 3_600, seasonTitle: "Sooner" },
        }),
      ],
      [],
      [],
    );
    expect(summary.nextAiringEpisode?.seasonTitle).toBe("Sooner");
  });

  it("reports UNKNOWN source status when the franchise has no written source", () => {
    // Steins;Gate is an original anime with no source edge at all.
    const summary = summarizeFranchise([animeWork({ id: 1 })], [], []);
    expect(summary.sourceStatus).toBe("UNKNOWN");
  });

  it("reports FINISHED when every source has concluded", () => {
    const summary = summarizeFranchise([animeWork({ id: 1 })], [], [sourceWork({ id: 2 })]);
    expect(summary.sourceStatus).toBe("FINISHED");
  });

  it("reports ONGOING when any source is still publishing", () => {
    const summary = summarizeFranchise(
      [animeWork({ id: 1 })],
      [],
      [sourceWork({ id: 2 }), sourceWork({ id: 3, status: "RELEASING", chapters: null })],
    );
    expect(summary.sourceStatus).toBe("ONGOING");
  });

  it("handles an empty franchise without throwing", () => {
    const summary = summarizeFranchise([], [], []);
    expect(summary.totalEpisodes).toBe(0);
    expect(summary.startYear).toBeNull();
    expect(summary.status).toBe("FINISHED");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- summarize-franchise`
Expected: FAIL — `Failed to resolve import "./summarize-franchise"`

- [ ] **Step 4: Write minimal implementation**

```ts
// src/core/domain/services/summarize-franchise.ts
import { AnimeStatus } from "../models/anime";
import { AnimeWork, NextEpisode, SourceWork } from "../models/franchise-work";
import { FranchiseSourceStatus, FranchiseSummary } from "../models/franchise";

/**
 * Episodes a single entry contributes to the franchise total.
 * An airing entry rarely reports its final count, so we fall back to the
 * episodes already broadcast: the next one to air, minus one.
 */
function releasedEpisodes(work: AnimeWork): number {
  if (work.episodes !== null) return work.episodes;
  if (work.nextAiringEpisode !== null) {
    return Math.max(0, work.nextAiringEpisode.episode - 1);
  }
  return 0;
}

/**
 * Franchise-level status, most severe signal first.
 * NOT_RELEASED is checked before NEW_SEASON_COMING so a franchise that has
 * never aired is not advertised as having a sequel on the way.
 */
function deriveStatus(timeline: AnimeWork[]): AnimeStatus {
  if (timeline.length === 0) return "FINISHED";

  if (timeline.some((work) => work.status === "CANCELLED")) return "CANCELLED";
  if (timeline.some((work) => work.status === "HIATUS")) return "HIATUS";
  if (timeline.every((work) => work.status === "NOT_RELEASED")) return "NOT_RELEASED";
  if (timeline.some((work) => work.status === "ONGOING")) return "ONGOING";

  const hasUnairedEntry = timeline.some((work) => work.status === "NOT_RELEASED");
  const hasUpcomingEpisode = timeline.some((work) => work.nextAiringEpisode !== null);
  if (hasUnairedEntry || hasUpcomingEpisode) return "NEW_SEASON_COMING";

  return "FINISHED";
}

function averageScore(works: AnimeWork[]): number | null {
  const scores = works
    .map((work) => work.score)
    .filter((score): score is number => score !== null);

  if (scores.length === 0) return null;
  return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length);
}

function soonestUpcomingEpisode(works: AnimeWork[]): NextEpisode | null {
  return works
    .map((work) => work.nextAiringEpisode)
    .filter((next): next is NextEpisode => next !== null)
    .reduce<NextEpisode | null>(
      (soonest, next) =>
        soonest === null || next.timeUntilAiringSeconds < soonest.timeUntilAiringSeconds
          ? next
          : soonest,
      null,
    );
}

function latestEndYear(works: AnimeWork[]): number | null {
  const years = works
    .map((work) => work.endDate?.year ?? null)
    .filter((year): year is number => year !== null);

  return years.length === 0 ? null : Math.max(...years);
}

function deriveSourceStatus(sources: SourceWork[]): FranchiseSourceStatus {
  if (sources.length === 0) return "UNKNOWN";
  return sources.every((source) => source.status === "FINISHED") ? "FINISHED" : "ONGOING";
}

/**
 * Folds a whole franchise into the handful of facts the watching score needs.
 * Pure: give it the same works and it gives the same summary.
 */
export function summarizeFranchise(
  timeline: AnimeWork[],
  related: AnimeWork[],
  sources: SourceWork[],
): FranchiseSummary {
  const watchable = [...timeline, ...related];

  return {
    startYear: timeline[0]?.startDate.year ?? null,
    endYear: latestEndYear(watchable),
    totalEpisodes: timeline.reduce((total, work) => total + releasedEpisodes(work), 0),
    averageScore: averageScore(watchable),
    status: deriveStatus(timeline),
    nextAiringEpisode: soonestUpcomingEpisode(watchable),
    sourceStatus: deriveSourceStatus(sources),
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- summarize-franchise`
Expected: PASS, 15 tests

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: errors only in files not yet migrated (`franchise-collector.ts`, `anilist-graphql-repository.ts`, `franchise-collector.test.ts`) — these are fixed in Tasks 5–8. Note them and move on.

- [ ] **Step 7: Commit**

```bash
git add src/core/domain/models/franchise-work.ts src/core/domain/models/franchise.ts src/core/domain/services/summarize-franchise.ts src/core/domain/services/summarize-franchise.test.ts
git commit -m "feat: franchise work model and tested summary aggregate"
```

---

### Task 4: Record real API fixtures

Tests replay recorded responses so CI never touches the network. Each id pins a hazard verified against the live API on 2026-08-06.

**Files:**
- Create: `src/scripts/record-fixtures.ts`
- Create: `src/test/fixtures/anilist/` (generated JSON)
- Modify: `package.json` (add `record:fixtures` script)

**Interfaces:**
- Consumes: nothing
- Produces: `src/test/fixtures/anilist/<name>.json`, each `{ requestedIds: number[], response: unknown }`

- [ ] **Step 1: Write the recorder**

```ts
// src/scripts/record-fixtures.ts
#!/usr/bin/env node

/**
 * Records real AniList responses into test fixtures.
 *
 * Usage: npm run record:fixtures
 *
 * Hand-written mocks encode what we assume the API returns. Every defect
 * found while designing this model came from a shape nobody would have
 * invented, so fixtures are recorded and replayed instead.
 *
 * Re-run whenever FRANCHISE_BATCH_QUERY changes.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { FRANCHISE_BATCH_QUERY } from "../infrastructure/adapters/anilist/graphql/queries";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const FIXTURE_DIR = join(process.cwd(), "src/test/fixtures/anilist");

/** Each scenario pins one hazard. See docs/superpowers/specs for why. */
const SCENARIOS: { name: string; ids: number[] }[] = [
  { name: "attack-on-titan", ids: [16498, 20958, 99147] }, // linear chain
  { name: "monogatari", ids: [5081, 11597, 9260, 21399] }, // same-year ties
  { name: "one-piece", ids: [21] }, // wide; episodes null while ongoing
  { name: "fate", ids: [10087, 356] }, // prequel aired later; absent source
  { name: "steins-gate", ids: [9253] }, // original anime, no source
  { name: "jujutsu-kaisen", ids: [113415, 145064] }, // multi-season, shared source
  { name: "missing-work", ids: [9183] }, // dead id -> empty media array
];

/** AniList throttles at 30 req/min; space recordings out generously. */
const DELAY_BETWEEN_CALLS_MS = 2500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function record(name: string, ids: number[]): Promise<void> {
  const response = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: {
      "User-Agent": "AniTime/1.0",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: FRANCHISE_BATCH_QUERY, variables: { ids } }),
  });

  if (!response.ok) {
    throw new Error(`Recording "${name}" failed: HTTP ${response.status}`);
  }

  const body: unknown = await response.json();
  const fixture = { requestedIds: ids, response: body };

  await writeFile(join(FIXTURE_DIR, `${name}.json`), `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
  console.log(`  recorded ${name}.json (${ids.length} ids)`);
}

async function main(): Promise<void> {
  await mkdir(FIXTURE_DIR, { recursive: true });
  console.log(`Recording ${SCENARIOS.length} fixtures into ${FIXTURE_DIR}\n`);

  for (const [index, scenario] of SCENARIOS.entries()) {
    await record(scenario.name, scenario.ids);
    if (index < SCENARIOS.length - 1) await wait(DELAY_BETWEEN_CALLS_MS);
  }

  console.log("\nDone. Commit the fixtures.");
}

main().catch((error: unknown) => {
  console.error("Recording failed:", error);
  process.exit(1);
});
```

- [ ] **Step 2: Add the npm script**

In `package.json`, add to `scripts`:

```json
"record:fixtures": "npx tsx src/scripts/record-fixtures.ts"
```

- [ ] **Step 3: Run it (requires network; this task cannot be done offline)**

Run: `npm run record:fixtures`
Expected: seven files written to `src/test/fixtures/anilist/`. This depends on `FRANCHISE_BATCH_QUERY` from Task 5 — **if Task 5 is not yet done, do Task 5 first and return here.**

- [ ] **Step 4: Sanity-check one fixture**

Run: `node -e "const f=require('./src/test/fixtures/anilist/one-piece.json');console.log(f.response.data.Page.media[0].title.userPreferred, '| episodes:', f.response.data.Page.media[0].episodes)"`
Expected: `ONE PIECE | episodes: null` — the null is the point; it proves the fallback path is exercised.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/record-fixtures.ts src/test/fixtures/anilist package.json
git commit -m "test: record real AniList responses as replayable fixtures"
```

---

### Task 5: Batch query, mapper, and the new port method

**Files:**
- Modify: `src/infrastructure/adapters/anilist/graphql/queries.ts`
- Modify: `src/infrastructure/adapters/anilist/dto/anilist-response.dto.ts`
- Create: `src/infrastructure/adapters/anilist/mappers/franchise-work-mapper.ts`
- Test: `src/infrastructure/adapters/anilist/mappers/franchise-work-mapper.test.ts`
- Modify: `src/core/ports/anime-repository.ts`
- Modify: `src/infrastructure/adapters/anilist/anilist-graphql-repository.ts`

**Interfaces:**
- Consumes: `WorkBatch`, `FranchiseEdge`, `AnimeWork`, `SourceWork`, `WorkStub` (Task 3); `RateLimitedError`, `WorkNotFoundError`, `RepositoryUnavailableError` (Task 2); `PartialDate` (Task 1)
- Produces: `FRANCHISE_BATCH_QUERY`, `mapBatchResponse(response: AniListBatchResponse): WorkBatch`, `AnimeRepository.getWorksByIds(ids: number[]): Promise<WorkBatch>`

Only media at the **top level** of `Page.media[]` become hydrated works. Media inside nested `relations` become `WorkStub`s and edges — they reveal topology so the collector can plan a wider frontier, but are never stored as nodes.

- [ ] **Step 1: Add the query**

Append to `src/infrastructure/adapters/anilist/graphql/queries.ts`:

```ts
/**
 * Batched franchise fetch. Two properties make this cheap:
 *  - AniList shares one ID space across anime and manga, so omitting the
 *    `type` filter returns source works in the same request.
 *  - Rate limiting counts requests, not query complexity, so nesting
 *    `relations` three deep is free and collapses a linear chain from
 *    O(nodes) requests to roughly O(depth / 3).
 * Nested nodes carry a reduced projection: they are topology, not content.
 */
export const FRANCHISE_BATCH_QUERY = `
  query ($ids: [Int]) {
    Page(perPage: 50) {
      media(id_in: $ids) {
        id
        type
        format
        status
        episodes
        chapters
        volumes
        averageScore
        title { userPreferred english romaji native }
        coverImage { large }
        startDate { year month day }
        endDate { year month day }
        nextAiringEpisode { episode timeUntilAiring }
        relations {
          edges {
            relationType
            node {
              id
              type
              format
              title { userPreferred }
              relations {
                edges {
                  relationType
                  node {
                    id
                    type
                    format
                    title { userPreferred }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;
```

- [ ] **Step 2: Add the DTOs**

Append to `src/infrastructure/adapters/anilist/dto/anilist-response.dto.ts`:

```ts
/** A node inside a nested `relations` projection: topology only. */
export interface AniListNestedNode {
  id: number;
  type?: string | null;
  format?: string | null;
  title?: AniListTitle;
  relations?: { edges?: AniListNestedEdge[] | null } | null;
}

export interface AniListNestedEdge {
  relationType?: string | null;
  node: AniListNestedNode;
}

/** A fully hydrated media item from the top level of a batch response. */
export interface AniListBatchMediaItem {
  id: number;
  type?: string | null;
  format?: string | null;
  status?: string | null;
  episodes?: number | null;
  chapters?: number | null;
  volumes?: number | null;
  averageScore?: number | null;
  title?: AniListTitle;
  coverImage?: AniListCoverImage;
  startDate?: AniListDate;
  endDate?: AniListDate;
  nextAiringEpisode?: AniListNextAiringEpisode | null;
  relations?: { edges?: AniListNestedEdge[] | null } | null;
}

export interface AniListBatchResponse {
  data?: {
    Page?: {
      media?: AniListBatchMediaItem[] | null;
    } | null;
  } | null;
  errors?: { message: string; status?: number }[];
}
```

- [ ] **Step 3: Write the failing mapper test**

```ts
// src/infrastructure/adapters/anilist/mappers/franchise-work-mapper.test.ts
import { describe, it, expect } from "vitest";
import { mapBatchResponse } from "./franchise-work-mapper";
import { isAnimeWork, isSourceWork } from "@/core/domain/models/franchise-work";
import { AniListBatchResponse } from "../dto/anilist-response.dto";

import onePiece from "@/test/fixtures/anilist/one-piece.json";
import monogatari from "@/test/fixtures/anilist/monogatari.json";
import steinsGate from "@/test/fixtures/anilist/steins-gate.json";
import missingWork from "@/test/fixtures/anilist/missing-work.json";
import jujutsuKaisen from "@/test/fixtures/anilist/jujutsu-kaisen.json";

const asResponse = (fixture: { response: unknown }): AniListBatchResponse =>
  fixture.response as AniListBatchResponse;

describe("mapBatchResponse", () => {
  it("hydrates top-level media as works", () => {
    const batch = mapBatchResponse(asResponse(onePiece));
    const work = batch.works.find((candidate) => candidate.id === 21);

    expect(work).toBeDefined();
    expect(work && isAnimeWork(work)).toBe(true);
    expect(work?.title.userPreferred).toBe("ONE PIECE");
  });

  it("preserves a null episode count on an airing series", () => {
    // One Piece reports episodes: null while ongoing. The summary's
    // nextAiringEpisode fallback depends on this surviving the mapping.
    const batch = mapBatchResponse(asResponse(onePiece));
    const work = batch.works.find((candidate) => candidate.id === 21);

    expect(work && isAnimeWork(work) && work.episodes).toBeNull();
    expect(work && isAnimeWork(work) && work.nextAiringEpisode).not.toBeNull();
  });

  it("maps full start dates so same-year entries can be ordered", () => {
    const batch = mapBatchResponse(asResponse(monogatari));
    const kizuOne = batch.works.find((candidate) => candidate.id === 9260);

    expect(kizuOne && isAnimeWork(kizuOne) && kizuOne.startDate.month).not.toBeNull();
    expect(kizuOne && isAnimeWork(kizuOne) && kizuOne.startDate.day).not.toBeNull();
  });

  it("discriminates source works from anime works", () => {
    const batch = mapBatchResponse(asResponse(jujutsuKaisen));
    const stubs = batch.stubs.filter((stub) => stub.kind === "SOURCE");

    expect(stubs.some((stub) => stub.id === 101517)).toBe(true);
  });

  it("records nested relations as edges without hydrating them as works", () => {
    const batch = mapBatchResponse(asResponse(steinsGate));
    const hydratedIds = batch.works.map((work) => work.id);
    const edgeTargets = batch.edges.map((edge) => edge.targetId);

    expect(hydratedIds).toEqual([9253]);
    expect(edgeTargets.length).toBeGreaterThan(0);
    expect(edgeTargets).not.toContain(9253);
  });

  it("returns an empty batch for a dead id rather than throwing", () => {
    const batch = mapBatchResponse(asResponse(missingWork));

    expect(batch.works).toEqual([]);
    expect(batch.edges).toEqual([]);
  });

  it("never emits duplicate edges", () => {
    const batch = mapBatchResponse(asResponse(monogatari));
    const keys = batch.edges.map((edge) => `${edge.sourceId}:${edge.relationType}:${edge.targetId}`);

    expect(new Set(keys).size).toBe(keys.length);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm run test -- franchise-work-mapper`
Expected: FAIL — `Failed to resolve import "./franchise-work-mapper"`

- [ ] **Step 5: Write the mapper**

```ts
// src/infrastructure/adapters/anilist/mappers/franchise-work-mapper.ts
import { AnimeFormat, AnimeStatus } from "@/core/domain/models/anime";
import { PartialDate } from "@/core/domain/models/partial-date";
import { RelationType } from "@/core/domain/models/relation";
import { FranchiseEdge, WorkBatch } from "@/core/domain/models/franchise";
import {
  AnimeWork,
  FranchiseWork,
  SourceFormat,
  SourceStatus,
  SourceWork,
  Title,
  WorkKind,
  WorkStub,
} from "@/core/domain/models/franchise-work";
import {
  AniListBatchMediaItem,
  AniListBatchResponse,
  AniListDate,
  AniListNestedEdge,
  AniListNestedNode,
  AniListTitle,
} from "../dto/anilist-response.dto";

const ANIME_FORMATS: ReadonlySet<string> = new Set([
  "TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA",
]);

const SOURCE_FORMATS: ReadonlySet<string> = new Set(["MANGA", "NOVEL", "ONE_SHOT"]);

const RELATION_TYPES: ReadonlySet<string> = new Set([
  "PREQUEL", "SEQUEL", "PARENT", "SIDE_STORY", "SPIN_OFF", "ALTERNATIVE",
  "COMPILATION", "CONTAINS", "CHARACTER", "OTHER", "SUMMARY", "ADAPTATION", "SOURCE",
]);

function mapTitle(title: AniListTitle | undefined): Title {
  return {
    userPreferred: title?.userPreferred ?? "",
    english: title?.english ?? null,
    romaji: title?.romaji ?? null,
    native: title?.native ?? null,
  };
}

function mapDate(date: AniListDate | undefined): PartialDate {
  return { year: date?.year ?? null, month: date?.month ?? null, day: date?.day ?? null };
}

function mapEndDate(date: AniListDate | undefined): PartialDate | null {
  return date?.year == null ? null : mapDate(date);
}

function mapAnimeFormat(format: string | null | undefined): AnimeFormat | null {
  return format != null && ANIME_FORMATS.has(format) ? (format as AnimeFormat) : null;
}

/** AniList's vocabulary differs from ours: RELEASING is our ONGOING. */
function mapAnimeStatus(status: string | null | undefined): AnimeStatus {
  switch (status) {
    case "RELEASING": return "ONGOING";
    case "NOT_YET_RELEASED": return "NOT_RELEASED";
    case "CANCELLED": return "CANCELLED";
    case "HIATUS": return "HIATUS";
    default: return "FINISHED";
  }
}

function mapSourceStatus(status: string | null | undefined): SourceStatus {
  switch (status) {
    case "RELEASING": return "RELEASING";
    case "HIATUS": return "HIATUS";
    case "CANCELLED": return "CANCELLED";
    default: return "FINISHED";
  }
}

function workKindOf(type: string | null | undefined, format: string | null | undefined): WorkKind {
  if (type === "MANGA") return "SOURCE";
  if (type === "ANIME") return "ANIME";
  return format != null && SOURCE_FORMATS.has(format) ? "SOURCE" : "ANIME";
}

function mapRelationType(relationType: string | null | undefined): RelationType | null {
  return relationType != null && RELATION_TYPES.has(relationType)
    ? (relationType as RelationType)
    : null;
}

function toAnimeWork(media: AniListBatchMediaItem): AnimeWork {
  const nextAiring = media.nextAiringEpisode;
  const title = mapTitle(media.title);

  return {
    kind: "ANIME",
    id: media.id,
    title,
    coverImage: media.coverImage?.large ?? "",
    format: mapAnimeFormat(media.format),
    startDate: mapDate(media.startDate),
    endDate: mapEndDate(media.endDate),
    episodes: media.episodes ?? null,
    score: media.averageScore ?? null,
    status: mapAnimeStatus(media.status),
    nextAiringEpisode: nextAiring
      ? {
          episode: nextAiring.episode,
          timeUntilAiringSeconds: nextAiring.timeUntilAiring,
          seasonTitle: title.userPreferred,
        }
      : null,
  };
}

function toSourceWork(media: AniListBatchMediaItem): SourceWork {
  const format = media.format != null && SOURCE_FORMATS.has(media.format)
    ? (media.format as SourceFormat)
    : "MANGA";

  return {
    kind: "SOURCE",
    id: media.id,
    title: mapTitle(media.title),
    format,
    status: mapSourceStatus(media.status),
    chapters: media.chapters ?? null,
    volumes: media.volumes ?? null,
  };
}

function toWork(media: AniListBatchMediaItem): FranchiseWork {
  return workKindOf(media.type, media.format) === "SOURCE"
    ? toSourceWork(media)
    : toAnimeWork(media);
}

function toStub(node: AniListNestedNode): WorkStub {
  return {
    id: node.id,
    kind: workKindOf(node.type, node.format),
    format: node.format ?? null,
    title: node.title?.userPreferred ?? "",
  };
}

/**
 * Walks a nested `relations` projection, collecting edges and stubs.
 * Nested nodes are topology, never content, so they never become works.
 */
function collectTopology(
  sourceId: number,
  edges: AniListNestedEdge[] | null | undefined,
  intoEdges: Map<string, FranchiseEdge>,
  intoStubs: Map<number, WorkStub>,
): void {
  for (const edge of edges ?? []) {
    const relationType = mapRelationType(edge.relationType);
    const node = edge.node;
    if (relationType === null || node?.id == null) continue;

    intoEdges.set(`${sourceId}:${relationType}:${node.id}`, {
      sourceId,
      targetId: node.id,
      relationType,
    });

    if (!intoStubs.has(node.id)) intoStubs.set(node.id, toStub(node));

    collectTopology(node.id, node.relations?.edges, intoEdges, intoStubs);
  }
}

/**
 * Turns one batched AniList response into domain works plus the topology
 * discovered around them. Hydration and topology are deliberately separate:
 * only top-level media carry full fields.
 */
export function mapBatchResponse(response: AniListBatchResponse): WorkBatch {
  const media = response.data?.Page?.media ?? [];

  const works: FranchiseWork[] = [];
  const edges = new Map<string, FranchiseEdge>();
  const stubs = new Map<number, WorkStub>();

  for (const item of media) {
    if (item?.id == null) continue;
    works.push(toWork(item));
    collectTopology(item.id, item.relations?.edges, edges, stubs);
  }

  const hydratedIds = new Set(works.map((work) => work.id));

  return {
    works,
    edges: [...edges.values()],
    stubs: [...stubs.values()].filter((stub) => !hydratedIds.has(stub.id)),
  };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- franchise-work-mapper`
Expected: PASS, 7 tests

- [ ] **Step 7: Replace the port method**

In `src/core/ports/anime-repository.ts`, delete `getAnimeById` and `getAnimeWithRelations`, and add:

```ts
import { WorkBatch } from "../domain/models/franchise";

export interface AnimeRepository {
  searchAnime(query: string): Promise<AnimeSearchResult[]>;
  /**
   * Fetches many works in a single request, with three hops of relation
   * topology around each. Throws RepositoryError subclasses; never returns
   * null for a failure, so a rate limit cannot be mistaken for absence.
   */
  getWorksByIds(ids: number[]): Promise<WorkBatch>;
}
```

- [ ] **Step 8: Implement it in the adapter**

In `src/infrastructure/adapters/anilist/anilist-graphql-repository.ts`: delete `MEDIA_BATCH_QUERY`, `VALID_FRANCHISE_RELATIONS`, `mapRelations`, `mapAniListStatus`, `fetchFranchiseRecursive`, `getAnimeById` and `getAnimeWithRelations`. Keep `searchAnime` unchanged. Add:

```ts
/** AniList accepts at most 50 ids per page. */
const MAX_IDS_PER_REQUEST = 50;

function chunk(ids: number[], size: number): number[][] {
  const chunks: number[][] = [];
  for (let index = 0; index < ids.length; index += size) {
    chunks.push(ids.slice(index, index + size));
  }
  return chunks;
}

function parseRetryAfter(response: Response): number | null {
  const header = response.headers.get("Retry-After");
  if (header === null) return null;
  const seconds = Number.parseInt(header, 10);
  return Number.isNaN(seconds) ? null : seconds;
}

async function fetchBatch(ids: number[]): Promise<WorkBatch> {
  let response: Response;
  try {
    response = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: {
        "User-Agent": "AniTime/1.0",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query: FRANCHISE_BATCH_QUERY, variables: { ids } }),
    });
  } catch (error) {
    throw new RepositoryUnavailableError(
      `Could not reach AniList: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  if (response.status === 429) {
    throw new RateLimitedError(parseRetryAfter(response));
  }

  if (!response.ok) {
    throw new RepositoryUnavailableError(`AniList responded with HTTP ${response.status}`);
  }

  let body: AniListBatchResponse;
  try {
    body = (await response.json()) as AniListBatchResponse;
  } catch {
    throw new RepositoryUnavailableError("AniList returned a response we could not parse");
  }

  return mapBatchResponse(body);
}
```

and the method itself:

```ts
  async getWorksByIds(ids: number[]): Promise<WorkBatch> {
    if (ids.length === 0) return { works: [], edges: [], stubs: [] };

    const batches = await Promise.all(
      chunk(ids, MAX_IDS_PER_REQUEST).map((batchIds) => fetchBatch(batchIds)),
    );

    return {
      works: batches.flatMap((batch) => batch.works),
      edges: batches.flatMap((batch) => batch.edges),
      stubs: batches.flatMap((batch) => batch.stubs),
    };
  }
```

Note: a dead id yields an empty `media` array, not an error — `WorkNotFoundError` is therefore raised by the collector when an id it asked for does not come back, not by the adapter.

- [ ] **Step 9: Verify**

Run: `npm run test -- franchise-work-mapper && npx tsc --noEmit`
Expected: mapper tests PASS. `tsc` still reports errors in `franchise-collector.ts`, its test, and `useAnimeSearch.ts` — fixed in Tasks 6–8.

- [ ] **Step 10: Commit**

```bash
git add src/infrastructure/adapters/anilist src/core/ports/anime-repository.ts
git commit -m "feat: batched AniList fetch with nested topology and typed errors"
```

---

### Task 6: Frontier-batched collector

**Files:**
- Modify: `src/core/domain/services/franchise-collector.ts`
- Create: `src/test/fakes/in-memory-anime-repository.ts`
- Modify: `src/core/domain/services/franchise-collector.test.ts` (rewrite)

**Interfaces:**
- Consumes: `WorkBatch`, `Franchise`, `FranchiseEdge` (Task 3), `summarizeFranchise` (Task 3), `comparePartialDates` (Task 1), errors (Task 2), `AnimeRepository.getWorksByIds` (Task 5)
- Produces: `FranchiseCollector.collect(rootId: number, options?: FranchiseCollectorOptions): Promise<Franchise>`

- [ ] **Step 1: Write the fake repository**

```ts
// src/test/fakes/in-memory-anime-repository.ts
import { AnimeRepository, AnimeSearchResult } from "@/core/ports/anime-repository";
import { FranchiseEdge, WorkBatch } from "@/core/domain/models/franchise";
import { FranchiseWork, WorkStub } from "@/core/domain/models/franchise-work";
import { RepositoryError } from "@/core/domain/errors/repository-errors";

/**
 * Domain test double. Holds works and edges in memory and answers batched
 * reads the same way the real adapter does, so collector tests need no
 * network and no MSW.
 */
export class InMemoryAnimeRepository implements AnimeRepository {
  private readonly works = new Map<number, FranchiseWork>();
  private readonly edges: FranchiseEdge[] = [];
  private readonly failures = new Map<number, RepositoryError>();

  /** Number of batched reads performed — asserts request efficiency. */
  requestCount = 0;

  addWork(work: FranchiseWork): this {
    this.works.set(work.id, work);
    return this;
  }

  addEdge(sourceId: number, relationType: FranchiseEdge["relationType"], targetId: number): this {
    this.edges.push({ sourceId, targetId, relationType });
    return this;
  }

  /** Makes any batch containing this id reject with the given error. */
  failOn(id: number, error: RepositoryError): this {
    this.failures.set(id, error);
    return this;
  }

  async searchAnime(_query: string): Promise<AnimeSearchResult[]> {
    return [];
  }

  async getWorksByIds(ids: number[]): Promise<WorkBatch> {
    this.requestCount += 1;

    for (const id of ids) {
      const failure = this.failures.get(id);
      if (failure) throw failure;
    }

    const works = ids
      .map((id) => this.works.get(id))
      .filter((work): work is FranchiseWork => work !== undefined);

    const requested = new Set(ids);
    const edges = this.edges.filter((edge) => requested.has(edge.sourceId));

    const hydrated = new Set(works.map((work) => work.id));
    const stubs: WorkStub[] = edges
      .filter((edge) => !hydrated.has(edge.targetId))
      .map((edge) => {
        const target = this.works.get(edge.targetId);
        return {
          id: edge.targetId,
          kind: target?.kind ?? "ANIME",
          format: target && target.kind === "ANIME" ? target.format : null,
          title: target?.title.userPreferred ?? "",
        };
      });

    return { works, edges, stubs };
  }
}
```

- [ ] **Step 2: Write the failing collector test**

Replace `src/core/domain/services/franchise-collector.test.ts` entirely:

```ts
import { describe, it, expect } from "vitest";
import { FranchiseCollector } from "./franchise-collector";
import { InMemoryAnimeRepository } from "@/test/fakes/in-memory-anime-repository";
import { AnimeWork, SourceWork } from "../models/franchise-work";
import { AnimeFormat, AnimeStatus } from "../models/anime";
import { PartialDate } from "../models/partial-date";
import { RateLimitedError } from "../errors/repository-errors";

function anime(
  id: number,
  title: string,
  startDate: PartialDate,
  format: AnimeFormat | null = "TV",
  status: AnimeStatus = "FINISHED",
): AnimeWork {
  return {
    kind: "ANIME",
    id,
    title: { userPreferred: title, english: null, romaji: null, native: null },
    coverImage: "",
    format,
    startDate,
    endDate: null,
    episodes: 12,
    score: 80,
    status,
    nextAiringEpisode: null,
  };
}

function source(id: number, title: string): SourceWork {
  return {
    kind: "SOURCE",
    id,
    title: { userPreferred: title, english: null, romaji: null, native: null },
    format: "MANGA",
    status: "RELEASING",
    chapters: null,
    volumes: null,
  };
}

const date = (year: number, month = 1, day = 1): PartialDate => ({ year, month, day });

describe("FranchiseCollector", () => {
  it("collects a linear chain in release order", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "Season 1", date(2013)))
      .addWork(anime(2, "Season 2", date(2017)))
      .addWork(anime(3, "Season 3", date(2018)))
      .addEdge(1, "SEQUEL", 2)
      .addEdge(2, "SEQUEL", 3);

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.timeline.map((work) => work.id)).toEqual([1, 2, 3]);
    expect(franchise.isComplete).toBe(true);
  });

  it("orders same-year entries by full date", async () => {
    // Regression: year-only sorting put Kizumonogatari II before I.
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "Kizumonogatari II", date(2016, 8, 19)))
      .addWork(anime(2, "Kizumonogatari I", date(2016, 1, 8)))
      .addEdge(1, "PREQUEL", 2);

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.timeline.map((work) => work.title.userPreferred)).toEqual([
      "Kizumonogatari I",
      "Kizumonogatari II",
    ]);
  });

  it("keeps a prequel that aired later in release order", async () => {
    // Fate/Zero (2011) is a PREQUEL to Fate/stay night (2006).
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(10087, "Fate/Zero", date(2011, 10, 2)))
      .addWork(anime(356, "Fate/stay night", date(2006, 1, 7)))
      .addEdge(10087, "PREQUEL", 356);

    const franchise = await new FranchiseCollector(repo).collect(10087);

    expect(franchise.timeline[0]?.id).toBe(356);
    expect(franchise.rootId).toBe(10087);
  });

  it("keeps the selected work as rootId even when it is not first", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "Season 1", date(2020)))
      .addWork(anime(2, "Season 2", date(2023)))
      .addEdge(2, "PREQUEL", 1);

    const franchise = await new FranchiseCollector(repo).collect(2);

    expect(franchise.rootId).toBe(2);
    expect(franchise.timeline[0]?.id).toBe(1);
  });

  it("traverses only PREQUEL and SEQUEL but records every edge", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "Series", date(2013)))
      .addWork(anime(2, "Sequel", date(2015)))
      .addWork(anime(3, "Movie", date(2014), "MOVIE"))
      .addEdge(1, "SEQUEL", 2)
      .addEdge(1, "SIDE_STORY", 3);

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.timeline.map((work) => work.id)).toEqual([1, 2]);
    expect(franchise.edges.some((edge) => edge.relationType === "SIDE_STORY")).toBe(true);
  });

  it("hydrates related works outside the timeline", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "Series", date(2013)))
      .addWork(anime(3, "Movie", date(2014), "MOVIE"))
      .addEdge(1, "SIDE_STORY", 3);

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.related.map((work) => work.id)).toEqual([3]);
  });

  it("hydrates source works without traversing them", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "Series", date(2013)))
      .addWork(source(99, "Series manga"))
      .addEdge(1, "ADAPTATION", 99);

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.sources.map((work) => work.id)).toEqual([99]);
    expect(franchise.summary.sourceStatus).toBe("ONGOING");
  });

  it("survives a cycle", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "A", date(2010)))
      .addWork(anime(2, "B", date(2011)))
      .addEdge(1, "SEQUEL", 2)
      .addEdge(2, "PREQUEL", 1);

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.timeline.map((work) => work.id)).toEqual([1, 2]);
  });

  it("skips an id that does not exist and keeps traversing", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "A", date(2010)))
      .addWork(anime(3, "C", date(2012)))
      .addEdge(1, "SEQUEL", 9183)
      .addEdge(1, "SEQUEL", 3);

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.timeline.map((work) => work.id)).toEqual([1, 3]);
    expect(franchise.isComplete).toBe(true);
  });

  it("stops and reports partial results when rate limited", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "A", date(2010)))
      .addWork(anime(2, "B", date(2011)))
      .addEdge(1, "SEQUEL", 2)
      .failOn(2, new RateLimitedError(60));

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.isComplete).toBe(false);
    expect(franchise.unresolvedIds).toContain(2);
    expect(franchise.timeline.map((work) => work.id)).toEqual([1]);
  });

  it("batches a frontier into a single request", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "A", date(2010)))
      .addWork(anime(2, "B", date(2011)))
      .addWork(anime(3, "C", date(2012)))
      .addEdge(1, "SEQUEL", 2)
      .addEdge(1, "SEQUEL", 3);

    const repository = repo;
    await new FranchiseCollector(repository).collect(1);

    // root batch + one frontier batch containing both 2 and 3.
    expect(repository.requestCount).toBeLessThanOrEqual(2);
  });

  it("respects maxDepth", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "A", date(2010)))
      .addWork(anime(2, "B", date(2011)))
      .addWork(anime(3, "C", date(2012)))
      .addEdge(1, "SEQUEL", 2)
      .addEdge(2, "SEQUEL", 3);

    const franchise = await new FranchiseCollector(repo).collect(1, { maxDepth: 1 });

    expect(franchise.timeline.map((work) => work.id)).toEqual([1, 2]);
    expect(franchise.isComplete).toBe(false);
    expect(franchise.unresolvedIds).toContain(3);
  });

  it("excludes OVA and ONA from the timeline by default", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "Series", date(2013)))
      .addWork(anime(2, "Prequel ONA", date(2012), "ONA"))
      .addEdge(1, "PREQUEL", 2);

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.timeline.map((work) => work.id)).toEqual([1]);
    expect(franchise.nodes.has(2)).toBe(true);
  });

  it("returns an empty franchise when the root does not exist", async () => {
    const franchise = await new FranchiseCollector(new InMemoryAnimeRepository()).collect(9183);

    expect(franchise.timeline).toEqual([]);
    expect(franchise.summary.totalEpisodes).toBe(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test -- franchise-collector`
Expected: FAIL — the collector still calls `getAnimeWithRelations`, which no longer exists on the port.

- [ ] **Step 4: Rewrite the collector**

```ts
// src/core/domain/services/franchise-collector.ts
import { AnimeFormat } from "../models/anime";
import { Franchise, FranchiseEdge } from "../models/franchise";
import {
  AnimeWork,
  FranchiseWork,
  SourceWork,
  isAnimeWork,
  isSourceWork,
} from "../models/franchise-work";
import { comparePartialDates } from "../models/partial-date";
import { MAIN_TIMELINE_RELATIONS, RelationType } from "../models/relation";
import { RepositoryError, WorkNotFoundError } from "../errors/repository-errors";
import { AnimeRepository } from "../../ports/anime-repository";
import { summarizeFranchise } from "./summarize-franchise";

export interface FranchiseCollectorOptions {
  /** Maximum traversal depth. Safety valve against malformed graphs. */
  maxDepth?: number;
  /** Relation types that extend the timeline. Default: PREQUEL and SEQUEL. */
  followRelationTypes?: ReadonlySet<RelationType>;
  /** Formats allowed on the timeline. Others are collected as related works. */
  timelineFormats?: ReadonlySet<AnimeFormat>;
}

const DEFAULT_MAX_DEPTH = 10;
const DEFAULT_TIMELINE_FORMATS: ReadonlySet<AnimeFormat> = new Set<AnimeFormat>([
  "TV", "TV_SHORT", "MOVIE", "SPECIAL",
]);

/**
 * Collects a complete franchise into our own model.
 *
 * Traverses one *frontier* at a time rather than one node at a time: every
 * unvisited work at the current depth is fetched in a single batched read.
 * Nested topology in each response reveals ids further ahead, so a linear
 * chain costs roughly one request per three entries instead of one per entry.
 *
 * Honesty guarantees:
 * - A work that genuinely does not exist is skipped; traversal continues.
 * - A rate limit or outage stops traversal and sets `isComplete: false`
 *   with the outstanding ids in `unresolvedIds`. A partial franchise is
 *   never presented as a whole one.
 */
export class FranchiseCollector {
  constructor(private readonly repository: AnimeRepository) {}

  async collect(rootId: number, options?: FranchiseCollectorOptions): Promise<Franchise> {
    const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
    const followTypes = options?.followRelationTypes ?? MAIN_TIMELINE_RELATIONS;
    const timelineFormats = options?.timelineFormats ?? DEFAULT_TIMELINE_FORMATS;

    const nodes = new Map<number, FranchiseWork>();
    const edges = new Map<string, FranchiseEdge>();
    const requested = new Set<number>();
    const unresolved = new Set<number>();

    let frontier: number[] = [rootId];
    let depth = 0;
    let isComplete = true;

    while (frontier.length > 0) {
      if (depth > maxDepth) {
        frontier.forEach((id) => unresolved.add(id));
        isComplete = false;
        break;
      }

      frontier.forEach((id) => requested.add(id));

      try {
        const batch = await this.repository.getWorksByIds(frontier);

        batch.works.forEach((work) => nodes.set(work.id, work));
        batch.edges.forEach((edge) =>
          edges.set(`${edge.sourceId}:${edge.relationType}:${edge.targetId}`, edge),
        );

        // An id we asked for that did not come back simply does not exist.
        frontier
          .filter((id) => !nodes.has(id))
          .forEach((id) => void new WorkNotFoundError(id));
      } catch (error) {
        if (error instanceof RepositoryError) {
          frontier.filter((id) => !nodes.has(id)).forEach((id) => unresolved.add(id));
          isComplete = false;
          break;
        }
        throw error;
      }

      frontier = this.nextFrontier(edges, nodes, requested, followTypes);
      depth += 1;
    }

    // One final read hydrates everything adjacent that we never traversed:
    // movies, OVAs, specials and the written sources.
    if (isComplete) {
      const adjacent = this.adjacentIds(edges, requested);
      if (adjacent.length > 0) {
        try {
          const batch = await this.repository.getWorksByIds(adjacent);
          batch.works.forEach((work) => nodes.set(work.id, work));
          adjacent.forEach((id) => requested.add(id));
        } catch (error) {
          if (!(error instanceof RepositoryError)) throw error;
          adjacent.forEach((id) => unresolved.add(id));
          isComplete = false;
        }
      }
    }

    const timeline = this.buildTimeline(rootId, nodes, edges, followTypes, timelineFormats);
    const timelineIds = new Set(timeline.map((work) => work.id));

    const related = [...nodes.values()]
      .filter(isAnimeWork)
      .filter((work) => !timelineIds.has(work.id))
      .sort((a, b) => comparePartialDates(a.startDate, b.startDate));

    const sources: SourceWork[] = [...nodes.values()].filter(isSourceWork);

    return {
      rootId,
      nodes,
      edges: [...edges.values()],
      timeline,
      related,
      sources,
      summary: summarizeFranchise(timeline, related, sources),
      isComplete,
      unresolvedIds: [...unresolved],
    };
  }

  /** Unvisited works reachable from what we have, along followed relations. */
  private nextFrontier(
    edges: Map<string, FranchiseEdge>,
    nodes: Map<number, FranchiseWork>,
    requested: Set<number>,
    followTypes: ReadonlySet<RelationType>,
  ): number[] {
    const next = new Set<number>();

    for (const edge of edges.values()) {
      if (!followTypes.has(edge.relationType)) continue;
      if (!nodes.has(edge.sourceId) && !requested.has(edge.sourceId)) continue;
      if (requested.has(edge.targetId)) continue;
      next.add(edge.targetId);
    }

    return [...next];
  }

  /** Everything one edge away that traversal never asked for. */
  private adjacentIds(edges: Map<string, FranchiseEdge>, requested: Set<number>): number[] {
    const adjacent = new Set<number>();
    for (const edge of edges.values()) {
      if (!requested.has(edge.targetId)) adjacent.add(edge.targetId);
    }
    return [...adjacent];
  }

  /**
   * The timeline: works joined by followed relations, restricted to timeline
   * formats, ordered by release date. The selected work is always present so
   * the UI can highlight it even when its format is excluded.
   */
  private buildTimeline(
    rootId: number,
    nodes: Map<number, FranchiseWork>,
    edges: Map<string, FranchiseEdge>,
    followTypes: ReadonlySet<RelationType>,
    timelineFormats: ReadonlySet<AnimeFormat>,
  ): AnimeWork[] {
    const timelineIds = new Set<number>([rootId]);

    for (const edge of edges.values()) {
      if (!followTypes.has(edge.relationType)) continue;
      timelineIds.add(edge.sourceId);
      timelineIds.add(edge.targetId);
    }

    return [...timelineIds]
      .map((id) => nodes.get(id))
      .filter((work): work is FranchiseWork => work !== undefined)
      .filter(isAnimeWork)
      .filter((work) => work.id === rootId || work.format === null || timelineFormats.has(work.format))
      .sort((a, b) => comparePartialDates(a.startDate, b.startDate));
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -- franchise-collector`
Expected: PASS, 14 tests

- [ ] **Step 6: Commit**

```bash
git add src/core/domain/services/franchise-collector.ts src/core/domain/services/franchise-collector.test.ts src/test/fakes/in-memory-anime-repository.ts
git commit -m "feat: frontier-batched franchise collector that never truncates silently"
```

---

### Task 7: Score the summary, not the anime

**Files:**
- Modify: `src/core/domain/services/evaluate-score.ts`
- Test: `src/core/domain/services/evaluate-score.test.ts` (create — `docs/TESTING.md` claims this exists; it does not)

**Interfaces:**
- Consumes: `FranchiseSummary` (Task 3)
- Produces: `evaluateWatchingScore(summary: FranchiseSummary): TimingScore`

Behaviour is unchanged. Only the input type changes: `status`, `userScore`→`averageScore`, `nextAiringEpisode`, `totalEpisodes` now come from the summary. `sourceStatus` is deliberately **not** consumed yet.

- [ ] **Step 1: Write the failing test**

```ts
// src/core/domain/services/evaluate-score.test.ts
import { describe, it, expect } from "vitest";
import { evaluateWatchingScore } from "./evaluate-score";
import { FranchiseSummary } from "../models/franchise";

function summary(overrides: Partial<FranchiseSummary> = {}): FranchiseSummary {
  return {
    startYear: 2013,
    endYear: 2023,
    totalEpisodes: 87,
    averageScore: 80,
    status: "FINISHED",
    nextAiringEpisode: null,
    sourceStatus: "UNKNOWN",
    ...overrides,
  };
}

describe("evaluateWatchingScore", () => {
  it("rewards a completed story", () => {
    const result = evaluateWatchingScore(summary({ status: "FINISHED" }));
    expect(result.level).toBe("PERFECT_TIME");
    expect(result.score).toBe(85);
  });

  it("penalises a cancelled franchise", () => {
    const result = evaluateWatchingScore(summary({ status: "CANCELLED" }));
    expect(result.level).toBe("NOT_RECOMMENDED");
  });

  it("flags the hype window when a sequel airs soon", () => {
    const result = evaluateWatchingScore(
      summary({
        status: "NEW_SEASON_COMING",
        nextAiringEpisode: { episode: 1, timeUntilAiringSeconds: 10 * 86_400, seasonTitle: "S2" },
      }),
    );
    expect(result.level).toBe("PERFECT_TIME");
    expect(result.badgeText).toBe("Hype Window Active!");
  });

  it("is calmer when the sequel is far away", () => {
    const result = evaluateWatchingScore(
      summary({
        status: "NEW_SEASON_COMING",
        nextAiringEpisode: { episode: 1, timeUntilAiringSeconds: 200 * 86_400, seasonTitle: "S2" },
      }),
    );
    expect(result.level).toBe("GOOD_TIME");
  });

  it("treats a long-running ongoing series as a good backlog", () => {
    const result = evaluateWatchingScore(summary({ status: "ONGOING", totalEpisodes: 1100 }));
    expect(result.level).toBe("PERFECT_TIME");
  });

  it("warns about a short ongoing series", () => {
    const result = evaluateWatchingScore(summary({ status: "ONGOING", totalEpisodes: 8 }));
    expect(result.level).toBe("IF_CANT_WAIT");
  });

  it("applies the quality bonus", () => {
    const high = evaluateWatchingScore(summary({ averageScore: 90 }));
    const low = evaluateWatchingScore(summary({ averageScore: 40 }));
    expect(high.score).toBeGreaterThan(low.score);
  });

  it("clamps to 0..100", () => {
    const result = evaluateWatchingScore(summary({ status: "CANCELLED", averageScore: 10 }));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- evaluate-score`
Expected: FAIL — `evaluateWatchingScore` still expects an `Anime`.

- [ ] **Step 3: Change the signature**

In `src/core/domain/services/evaluate-score.ts`, replace the import and the first lines of the function:

```ts
import { FranchiseSummary } from "../models/franchise";
import { TimingScore } from "../models/score";
```

```ts
export function evaluateWatchingScore(summary: FranchiseSummary): TimingScore {
  const { status, averageScore, nextAiringEpisode, totalEpisodes } = summary;
  const qualityBonus = getQualityBonus(averageScore);
```

Leave every branch body unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- evaluate-score`
Expected: PASS, 8 tests

- [ ] **Step 5: Commit**

```bash
git add src/core/domain/services/evaluate-score.ts src/core/domain/services/evaluate-score.test.ts
git commit -m "refactor: score the franchise summary instead of a synthesised anime"
```

---

### Task 8: Wire it up and delete the old path

**Files:**
- Modify: `src/hooks/useAnimeSearch.ts`
- Modify: `src/components/AnimeDetailCard.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/mocks/handlers.ts`
- Modify: `src/scripts/test-franchise.ts`
- Modify: `src/infrastructure/adapters/anilist/graphql/queries.ts` (delete dead queries)
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything from Tasks 1–7
- Produces: `useAnimeSearch` returning `{ franchise: Franchise | null; score: TimingScore | null; ... }`

- [ ] **Step 1: Update the MSW handlers to replay fixtures**

```ts
// src/mocks/handlers.ts
import { http, HttpResponse } from "msw";
import attackOnTitan from "@/test/fixtures/anilist/attack-on-titan.json";

interface GraphQLRequestBody {
  query?: string;
  variables?: { ids?: number[]; search?: string; id?: number };
}

/** Search results are small and stable; a literal is clearer than a fixture. */
const SEARCH_RESPONSE = {
  data: {
    Page: {
      media: [
        {
          id: 16498,
          title: { userPreferred: "Shingeki no Kyojin", english: "Attack on Titan", romaji: "Shingeki no Kyojin" },
          coverImage: { medium: "https://example.test/cover.jpg" },
          startDate: { year: 2013 },
          averageScore: 84,
        },
      ],
    },
  },
};

export const handlers = [
  http.post("https://graphql.anilist.co", async ({ request }) => {
    const body = (await request.json()) as GraphQLRequestBody;

    if (body.query?.includes("id_in")) {
      return HttpResponse.json(attackOnTitan.response);
    }

    return HttpResponse.json(SEARCH_RESPONSE);
  }),
];
```

- [ ] **Step 2: Update the hook**

In `src/hooks/useAnimeSearch.ts`, replace the detail-fetching parts:

```ts
import { Franchise } from "@/core/domain/models/franchise";
import { FranchiseCollector } from "@/core/domain/services/franchise-collector";

const repository: AnimeRepository = new AniListGraphQLRepository();
const collector = new FranchiseCollector(repository);
```

Replace the `selectedAnime` state and `selectAnime` callback with:

```ts
  const [franchise, setFranchise] = useState<Franchise | null>(null);

  const selectAnime = useCallback(async (id: number) => {
    setRawResults([]);
    setIsFetchingDetail(true);

    try {
      const collected = await collector.collect(id);
      setFranchise(collected);
      setScore(evaluateWatchingScore(collected.summary));
    } catch (error) {
      console.error("Could not collect the franchise:", error);
      setFranchise(null);
      setScore(null);
    } finally {
      setIsFetchingDetail(false);
    }
  }, []);
```

Update `clearSelection` to `setFranchise(null)` and the returned object to expose `franchise` instead of `selectedAnime`.

- [ ] **Step 3: Migrate `AnimeDetailCard` to the franchise model**

This component reads eight fields off the deleted `Anime` type. Task 9 removes that type, so this migration is mandatory, not optional. Field-by-field mapping:

| Was | Becomes |
|---|---|
| `anime.coverImage` | `franchise.timeline[0]?.coverImage ?? ""` |
| `anime.title.userPreferred` | `franchise.timeline[0]?.title.userPreferred ?? ""` |
| `anime.userScore` | `franchise.summary.averageScore` |
| `anime.status` | `franchise.summary.status` |
| `anime.seasons.length` | `franchise.timeline.length` |
| `anime.movies.length` | `franchise.related.filter((w) => w.format === "MOVIE").length` |
| `anime.releaseYear` | `franchise.summary.startYear` |
| `anime.totalEpisodes` | `franchise.summary.totalEpisodes` |
| `anime.nextAiringEpisode` | `franchise.summary.nextAiringEpisode` |

Change the imports and props:

```tsx
import { Franchise } from "@/core/domain/models/franchise";
import { ScoreLevel, TimingScore } from "@/core/domain/models/score";

interface AnimeDetailCardProps {
  franchise: Franchise;
  watchingScore: TimingScore;
}
```

Replace the top of the component body:

```tsx
export function AnimeDetailCard({ franchise, watchingScore }: AnimeDetailCardProps) {
  const styles = LEVEL_STYLES[watchingScore.level] || LEVEL_STYLES.NOT_GOOD_TIME;

  const { summary, timeline, related } = franchise;
  const franchiseHead = timeline[0] ?? null;
  const seasonsCount = timeline.length;
  const moviesCount = related.filter((work) => work.format === "MOVIE").length;
```

Then substitute per the table above throughout the JSX. Two spots need care:

- The `<Image>` `src` must not be an empty string — Next throws on that. Guard the whole block: `{franchiseHead && franchiseHead.coverImage && ( …<Image …/>… )}`.
- `anime.userScore !== null && anime.userScore !== undefined` becomes `summary.averageScore !== null`; `summary.averageScore` is typed `number | null`, never `undefined`.

**Known interim limitation, by design:** the card shows the franchise head's title and cover, which is what it shows today, so nothing visibly regresses. It does **not** yet indicate which entry the user selected — that arrives with the carousel follow-up, which is the whole point of keeping `rootId` on the model.

- [ ] **Step 4: Update `page.tsx`**

Rename the destructured value and the prop:

```tsx
  const {
    query, setQuery, results, isSearching,
    franchise, score, isFetchingDetail, selectAnime, clearSelection,
  } = useAnimeSearch();
```

Replace the three `selectedAnime` references with `franchise`, and pass `<AnimeDetailCard franchise={franchise} watchingScore={score} />`.

Optionally surface partial results — the model now makes this expressible, where before it was silently impossible:

```tsx
{!isFetchingDetail && franchise && !franchise.isComplete && (
  <p className="text-center text-xs text-amber-400/80">
    Some entries could not be loaded ({franchise.unresolvedIds.length} missing).
  </p>
)}
```

- [ ] **Step 5: Verify the UI compiles and renders**

Run: `npx tsc --noEmit && npm run build`
Expected: both PASS with no reference to `selectedAnime`, `Anime`, `seasons` or `movies` remaining.

Run: `npm run dev`, search "Attack on Titan", select it.
Expected: the card renders with 8 seasons, a franchise score, and total episodes — no blank image, no `NaN`, no crash.

- [ ] **Step 6: Update the harness**

In `src/scripts/test-franchise.ts`: change the docstring's `--id=9183 # Gintama` to `--id=918 # Gintama` (9183 is a dead id that returns a genuine 404), and print `franchise.timeline`, `franchise.related`, `franchise.sources`, `franchise.summary`, and `isComplete` / `unresolvedIds`.

- [ ] **Step 7: Delete dead queries**

From `src/infrastructure/adapters/anilist/graphql/queries.ts` remove `GET_ANIME_BY_ID_QUERY`, `SEARCH_LATEST_BY_NAME_QUERY`, `SEARCH_FRANCHISE_MEDIA_QUERY` and `GET_ANIME_WITH_RELATIONS_QUERY` — nothing references them once Task 5 lands.

- [ ] **Step 8: Update CLAUDE.md**

Replace the "Two franchise implementations currently coexist" paragraph with a description of the single `FranchiseCollector` + `getWorksByIds` path, and correct `npm run test:franchise -- --id=21` examples. Remove the docs-drift warning about `evaluate-score.test.ts` not existing — it exists as of Task 7.

- [ ] **Step 9: Run the full CI sequence**

Run: `npm run lint && npx tsc --noEmit && npm run test && npm run build`
Expected: all four PASS.

- [ ] **Step 10: Smoke-test against the real API**

Run: `npm run test:franchise -- --id=16498`
Expected: 8-entry timeline in release order, `isComplete: true`, and **fewer than 6 requests**.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: wire the franchise collector into the UI and delete the legacy path"
```

---

### Task 9: Dead code sweep

The migration strands a lot of the old model. Removing it is not tidiness — every stale export is something a future reader (or a future agent) can wire up by mistake, and `Anime.seasons`/`movies` in particular are the shape the legacy adapter used to fake a franchise.

**Files:**
- Modify: `src/core/domain/models/anime.ts`
- Modify: `src/core/domain/models/relation.ts`
- Modify: `src/infrastructure/adapters/anilist/dto/anilist-response.dto.ts`
- Modify: `package.json` (only if a dependency proves unused)

**Interfaces:**
- Consumes: everything from Tasks 1–8
- Produces: nothing new — this task only removes

- [ ] **Step 1: Find every unreferenced export**

```bash
npx knip --no-exit-code
```

`knip` is not a project dependency; run it via `npx` without installing (`AGENTS.md` forbids adding heavy dependencies casually). Expected findings, all created by this migration:

- `FranchiseMediaItem` — the legacy season/movie shape, replaced by `AnimeWork`
- `Anime` — replaced by `AnimeWork`; only `AnimeFormat` and `AnimeStatus` survive
- `AniListMediaItem`, `AniListMediaResponse`, `AniListRelationNode`, `AniListRelationEdge`, `AniListRelations`, `AniListPageInfo` — DTOs for the deleted single-media path
- `Relation`, `RelationType` re-exports from `models/anime.ts`
- `toSortWeight` if only `comparePartialDates` ends up used externally

- [ ] **Step 2: Verify each candidate is genuinely unreferenced before deleting**

For each name `knip` reports:

```bash
grep -rn "FranchiseMediaItem" src/ --include=*.ts --include=*.tsx
```

Expected: only its own declaration. **If anything else matches, do not delete it** — `knip` cannot see dynamic access, and a false positive here breaks the build.

- [ ] **Step 3: Delete the legacy Anime model**

`src/core/domain/models/anime.ts` should shrink to just the two vocabularies still in use:

```ts
export type AnimeFormat =
  | "TV"
  | "TV_SHORT"
  | "MOVIE"
  | "SPECIAL"
  | "OVA"
  | "ONA";

/**
 * Our status vocabulary, which deliberately differs from AniList's:
 * RELEASING becomes ONGOING, and NEW_SEASON_COMING is derived by
 * summarizeFranchise rather than reported by the API.
 */
export type AnimeStatus =
  | "FINISHED"
  | "ONGOING"
  | "NEW_SEASON_COMING"
  | "NOT_RELEASED"
  | "CANCELLED"
  | "HIATUS";
```

Delete `FranchiseMediaItem`, the `Anime` interface, and the `Relation`/`RelationType` re-exports — consumers import those from `models/relation.ts` directly.

- [ ] **Step 4: Trim the DTOs**

In `src/infrastructure/adapters/anilist/dto/anilist-response.dto.ts`, keep only what `searchAnime` and the batch path still use: `AniListTitle`, `AniListCoverImage`, `AniListDate`, `AniListNextAiringEpisode`, `AniListSearchResponse`, `AniListNestedNode`, `AniListNestedEdge`, `AniListBatchMediaItem`, `AniListBatchResponse`. Delete the rest.

- [ ] **Step 5: Confirm `Relation` is still earning its place**

```bash
grep -rn "Relation\b" src/ --include=*.ts --include=*.tsx | grep -v "RelationType"
```

`FranchiseEdge` now carries `relationType` directly, so the `Relation` interface (`id`, `relationType`, `format`, `title`) may have no remaining consumer. If the only matches are its own declaration and the deleted re-export, delete `Relation` and keep `RelationType` and `MAIN_TIMELINE_RELATIONS`.

- [ ] **Step 6: Check for unused dependencies**

```bash
npx knip --dependencies --no-exit-code
```

Remove anything reported from `package.json` only after confirming with `grep`. Do **not** remove `tsx` — `test:franchise` and `record:fixtures` need it.

- [ ] **Step 7: Run the full CI sequence**

Run: `npm run lint && npx tsc --noEmit && npm run test && npm run build`
Expected: all four PASS. A failure here means something deleted was still in use — restore it and re-check with `grep`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: remove the model and DTOs left dead by the franchise migration"
```

---

## Self-Review

**Spec coverage:** Domain model → Task 3. Port + batching → Task 5. Traversal → Task 6. Error handling → Tasks 2, 5, 6. Summary/scoring → Tasks 3, 7. Recorded fixtures → Task 4. Ordering fix → Tasks 1, 6. Root-node fix → Task 6 (`rootId` preserved). Deletions → Tasks 5, 8, 9. Harness + docs → Task 8. No gaps.

**UI continuity:** the only components touching the domain model are `AnimeDetailCard` (nine fields, all mapped explicitly in Task 8 Step 3) and `page.tsx` (renames `selectedAnime` → `franchise`). `SearchBar` consumes `AnimeSearchResult`, which is unchanged, so it needs no work. Task 8 must land before Task 9, since Task 9 deletes the `Anime` type `AnimeDetailCard` currently imports.

**Corrections applied during review:** the hook lives at `src/hooks/useAnimeSearch.ts`, not `src/app/hooks/` — the original path would have created a duplicate hook and left the real one broken. And `AnimeWork.relations` was removed from the model. The mapper set it to `[]` unconditionally because relation topology lives on `Franchise.edges`, so the field was always empty — dead weight that invited a future reader to populate it and create a second, competing source of truth. Removed from Task 3's model, Task 5's mapper, and Task 6's test helper.

**Ordering note:** Task 4 depends on `FRANCHISE_BATCH_QUERY` from Task 5 Step 1, and Task 5's mapper tests depend on Task 4's fixtures. Execute **Task 5 Step 1 → Task 4 → rest of Task 5**. This is flagged inline at Task 4 Step 3.

**Type consistency:** `WorkBatch { works, edges, stubs }` is produced in Task 5 and consumed in Task 6. `FranchiseEdge { sourceId, targetId, relationType }` is used consistently — note it dropped the old nested `relation` object. `summarizeFranchise(timeline, related, sources)` matches its call site in Task 6. `timelineFormats` replaces the old `mainTimelineFormats`; `timeline` replaces `mainTimeline` everywhere.
