# Timing Score Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `evaluateWatchingScore` so a closed story is the only route to 100, the franchise's source status finally influences the verdict, and a stalled adaptation stops being advertised as complete.

**Architecture:** Split the calculation in two pure domain units. `deriveWatchingSituation(summary, now)` classifies a franchise into one of eight mutually exclusive situations; `evaluateWatchingScore(summary, now)` turns that situation into a base score, applies two small modifiers that each contribute a user-facing note, and derives the `ScoreLevel` from the final number. Quality leaves the calculation entirely.

**Tech Stack:** TypeScript strict, Vitest, React 19 / Next 15 App Router (static export), Tailwind.

**Spec:** `docs/superpowers/specs/2026-08-07-timing-score-redesign-design.md`

## Global Constraints

- Node `>=22`. Run `nvm use` before anything else.
- Zero `any`. TypeScript strict mode.
- The domain imports nothing outside itself — no React, no Next, no `fetch`, and **no clock**. `new Date()` never appears in `src/core/domain/`; the current time arrives as a parameter.
- `@/*` maps to `src/*`.
- All user-facing copy is **English**, matching the existing strings in `evaluate-score.ts` and `ScoreCard.tsx`.
- CI order, all four must pass before the work is done: `npm run lint` → `npx tsc --noEmit` → `npm run test` → `npm run build`. `npm run lint` alone does not type check.
- Tests never call `new Date()` with no argument. Every test builds a fixed `Date`.
- Constants, exact values: `MEGA_SERIES_EPISODE_THRESHOLD = 150`, `HYPE_WINDOW_DAYS = 60`, `DE_FACTO_HIATUS_YEARS = 5`, `HYPE_WINDOW_BONUS = 15`, `UNFINISHED_SOURCE_PENALTY = -5`.
- Score table, exact values: finished + finished source `100`, finished + ongoing source `95`, sequel within hype window `85`, mega-series airing `80`, sequel announced `70`, airing normally `50`, de facto hiatus `30`, official hiatus `20`, not released `15`, cancelled `5`.
- Level bands, exact boundaries: `>=90` `PERFECT_TIME`, `>=75` `GOOD_TIME`, `>=60` `RISK_INCOMPLETE`, `>=40` `IF_CANT_WAIT`, `>=10` `NOT_GOOD_TIME`, below that `NOT_RECOMMENDED`.

## File Structure

| File | Responsibility |
|---|---|
| `src/core/domain/services/watching-situation.ts` | **New.** The `WatchingSituation` union and the rules that classify a `FranchiseSummary` into one. Owns the mega-series and de-facto-hiatus thresholds. |
| `src/core/domain/services/watching-situation.test.ts` | **New.** One test per situation plus the threshold boundaries. |
| `src/core/domain/services/evaluate-score.ts` | **Rewritten.** Situation → base score → modifiers → notes → level. Owns the score table, the copy and the hype window. |
| `src/core/domain/services/evaluate-score.test.ts` | **Rewritten.** The score table made executable. |
| `src/core/domain/models/score.ts` | `TimingScore` gains `notes: string[]`. |
| `src/hooks/useAnimeSearch.ts` | Injects the clock at the call site. |
| `src/components/ScoreCard.tsx` | Renders `notes` under the details. |
| `src/components/ScoreCard.test.tsx` | Fixture gains `notes`; new test for rendering them. |
| `docs/SCORING-SYSTEM.md` | Rewritten to describe this system. |

Splitting the situation out of `evaluate-score.ts` is deliberate: classification is where the thresholds and the date arithmetic live, and it is the part most likely to change. Isolating it keeps each file testable on its own and stops `evaluate-score.ts` from growing into a file that both decides *what this is* and *what that's worth*.

**Deviation from the spec, flagged for the reviewer:** the spec puts the UI out of scope. Task 4 renders `notes` anyway, because without it the field is dead weight and nothing the user asked for becomes visible. Rendering `averageScore` separately stays out of scope as the spec says.

---

### Task 1: Situation derivation

**Files:**
- Create: `src/core/domain/services/watching-situation.ts`
- Test: `src/core/domain/services/watching-situation.test.ts`

**Interfaces:**
- Consumes: `FranchiseSummary` from `src/core/domain/models/franchise.ts` — fields used are `status`, `totalEpisodes`, `sourceStatus`, `endYear`.
- Produces:
  - `export type WatchingSituation = "CANCELLED" | "OFFICIAL_HIATUS" | "NOT_RELEASED" | "MEGA_SERIES_ONGOING" | "ONGOING" | "SEQUEL_ANNOUNCED" | "DE_FACTO_HIATUS" | "FINISHED"`
  - `export function deriveWatchingSituation(summary: FranchiseSummary, now: Date): WatchingSituation`
  - `export const MEGA_SERIES_EPISODE_THRESHOLD = 150`
  - `export const DE_FACTO_HIATUS_YEARS = 5`

Background the implementer needs: `FranchiseSummary.status` is our own vocabulary, not AniList's. `ONGOING` is AniList's `RELEASING`, and `NEW_SEASON_COMING` is derived by `summarizeFranchise` — the API never returns it. `sourceStatus` is `"FINISHED" | "ONGOING" | "UNKNOWN"`, where `UNKNOWN` means no source work was linked at all (Steins;Gate is the recorded fixture for this — an anime with no source in AniList's graph).

- [ ] **Step 1: Write the failing test**

Create `src/core/domain/services/watching-situation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { FranchiseSummary } from "../models/franchise";
import { deriveWatchingSituation } from "./watching-situation";

const NOW = new Date("2026-08-07T00:00:00Z");

function summary(overrides: Partial<FranchiseSummary> = {}): FranchiseSummary {
  return {
    startYear: 2013,
    endYear: 2023,
    totalEpisodes: 87,
    averageScore: 80,
    status: "FINISHED",
    nextAiringEpisode: null,
    sourceStatus: "UNKNOWN",
    sourceFormat: null,
    ...overrides,
  };
}

describe("deriveWatchingSituation", () => {
  it("classifies a cancelled franchise", () => {
    expect(deriveWatchingSituation(summary({ status: "CANCELLED" }), NOW)).toBe(
      "CANCELLED",
    );
  });

  it("classifies an officially paused production", () => {
    expect(deriveWatchingSituation(summary({ status: "HIATUS" }), NOW)).toBe(
      "OFFICIAL_HIATUS",
    );
  });

  it("classifies a franchise that has never aired", () => {
    expect(
      deriveWatchingSituation(summary({ status: "NOT_RELEASED" }), NOW),
    ).toBe("NOT_RELEASED");
  });

  it("classifies a mega-series still airing", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "ONGOING", totalEpisodes: 1100 }),
        NOW,
      ),
    ).toBe("MEGA_SERIES_ONGOING");
  });

  it("classifies a normal series still airing", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "ONGOING", totalEpisodes: 8 }),
        NOW,
      ),
    ).toBe("ONGOING");
  });

  it("counts exactly 150 episodes as a mega-series", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "ONGOING", totalEpisodes: 150 }),
        NOW,
      ),
    ).toBe("MEGA_SERIES_ONGOING");
  });

  it("classifies an announced sequel", () => {
    expect(
      deriveWatchingSituation(summary({ status: "NEW_SEASON_COMING" }), NOW),
    ).toBe("SEQUEL_ANNOUNCED");
  });

  it("classifies a closed franchise", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "FINISHED", sourceStatus: "FINISHED" }),
        NOW,
      ),
    ).toBe("FINISHED");
  });

  it("calls a long-abandoned adaptation a de facto hiatus", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "FINISHED", sourceStatus: "ONGOING", endYear: 2018 }),
        NOW,
      ),
    ).toBe("DE_FACTO_HIATUS");
  });

  it("treats exactly five years since the last episode as a de facto hiatus", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "FINISHED", sourceStatus: "ONGOING", endYear: 2021 }),
        NOW,
      ),
    ).toBe("DE_FACTO_HIATUS");
  });

  it("leaves a normal wait between seasons alone", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "FINISHED", sourceStatus: "ONGOING", endYear: 2024 }),
        NOW,
      ),
    ).toBe("FINISHED");
  });

  it("cannot judge staleness without an end year", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "FINISHED", sourceStatus: "ONGOING", endYear: null }),
        NOW,
      ),
    ).toBe("FINISHED");
  });

  it("never calls an original series stalled, since it has no source to outrun", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "FINISHED", sourceStatus: "UNKNOWN", endYear: 1998 }),
        NOW,
      ),
    ).toBe("FINISHED");
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm run test -- watching-situation`
Expected: FAIL — the module `./watching-situation` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/core/domain/services/watching-situation.ts`:

```ts
import { FranchiseSummary } from "../models/franchise";

/** Episodes past which an airing franchise is a binge rather than a weekly wait. */
export const MEGA_SERIES_EPISODE_THRESHOLD = 150;

/**
 * Years of silence after which an unfinished adaptation is treated as
 * abandoned. Deliberately conservative: two to three years is the normal
 * production gap between seasons, so a shorter window would flag the common
 * case and the score would lie.
 */
export const DE_FACTO_HIATUS_YEARS = 5;

/**
 * What kind of moment this franchise is in. Mutually exclusive, and the only
 * thing the score reads. The unfinished source and the hype window are
 * modifiers rather than situations, so they do not appear here.
 */
export type WatchingSituation =
  | "CANCELLED"
  | "OFFICIAL_HIATUS"
  | "NOT_RELEASED"
  | "MEGA_SERIES_ONGOING"
  | "ONGOING"
  | "SEQUEL_ANNOUNCED"
  | "DE_FACTO_HIATUS"
  | "FINISHED";

/**
 * Classifies a franchise, most severe signal first. `summarizeFranchise` has
 * already collapsed the works into a single status; this only refines it.
 */
export function deriveWatchingSituation(
  summary: FranchiseSummary,
  now: Date,
): WatchingSituation {
  const { status, totalEpisodes, sourceStatus, endYear } = summary;

  if (status === "CANCELLED") return "CANCELLED";
  if (status === "HIATUS") return "OFFICIAL_HIATUS";
  if (status === "NOT_RELEASED") return "NOT_RELEASED";

  if (status === "ONGOING") {
    return totalEpisodes >= MEGA_SERIES_EPISODE_THRESHOLD
      ? "MEGA_SERIES_ONGOING"
      : "ONGOING";
  }

  if (status === "NEW_SEASON_COMING") return "SEQUEL_ANNOUNCED";

  // AniList reports no status for "the studio quietly stopped": the franchise
  // simply looks finished. A living source plus years of silence is the only
  // signal we have that the story was left hanging.
  if (
    sourceStatus === "ONGOING" &&
    endYear !== null &&
    now.getUTCFullYear() - endYear >= DE_FACTO_HIATUS_YEARS
  ) {
    return "DE_FACTO_HIATUS";
  }

  return "FINISHED";
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm run test -- watching-situation`
Expected: PASS, 13 tests.

- [ ] **Step 5: Type check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add src/core/domain/services/watching-situation.ts src/core/domain/services/watching-situation.test.ts
git commit -m "feat: classify a franchise into a watching situation"
```

---

### Task 2: Add `notes` to the score model

This task exists on its own so the type change lands green, before any scoring behaviour moves. It adds the field and satisfies it everywhere with an empty array — no verdict changes.

**Files:**
- Modify: `src/core/domain/models/score.ts`
- Modify: `src/core/domain/services/evaluate-score.ts` (every `return`)
- Modify: `src/components/ScoreCard.test.tsx:6-15` (the fixture)

**Interfaces:**
- Produces: `TimingScore.notes: string[]` — the secondary lines a modifier contributes. Empty when no modifier applied. Task 3 fills it, Task 5 renders it.

- [ ] **Step 1: Add the field**

In `src/core/domain/models/score.ts`, extend the interface:

```ts
export interface TimingScore {
  score: number;
  level: ScoreLevel;
  badgeText: string;
  summary: string;
  details: string;
  /** Secondary lines contributed by score modifiers. Empty when none applied. */
  notes: string[];
}
```

- [ ] **Step 2: Run the type check and confirm it fails**

Run: `npx tsc --noEmit`
Expected: FAIL — every `return` in `evaluate-score.ts` and the `ScoreCard.test.tsx` fixture are missing `notes`.

- [ ] **Step 3: Satisfy the field everywhere**

In `src/core/domain/services/evaluate-score.ts`, add `notes: [],` to **all ten** returned objects: `CANCELLED`, `HIATUS`, `NOT_RELEASED`, the three `NEW_SEASON_COMING` branches (hype window, distant, no airing date), the two `ONGOING` branches (mega-series, normal), `FINISHED`, and the trailing unknown-status fallback. This code is replaced wholesale in Task 3; the point here is only to keep the tree compiling.

In `src/components/ScoreCard.test.tsx`, add `notes: []` to the fixture defaults:

```tsx
function timingScore(overrides: Partial<TimingScore> = {}): TimingScore {
  return {
    score: 85,
    level: "PERFECT_TIME",
    badgeText: "Completed Story",
    summary: "Available to watch in full.",
    details: "All episodes and movies are released.",
    notes: [],
    ...overrides,
  };
}
```

- [ ] **Step 4: Verify green**

Run: `npx tsc --noEmit && npm run test && npm run lint`
Expected: all clean, all existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/domain/models/score.ts src/core/domain/services/evaluate-score.ts src/components/ScoreCard.test.tsx
git commit -m "feat: add notes to the timing score model"
```

---

### Task 3: Rewrite the scoring

The core of the plan. `evaluate-score.ts` and its test are both replaced.

**Files:**
- Modify: `src/core/domain/services/evaluate-score.ts` (whole file replaced)
- Modify: `src/core/domain/services/evaluate-score.test.ts` (whole file replaced)
- Modify: `src/hooks/useAnimeSearch.ts:71`

**Interfaces:**
- Consumes: `deriveWatchingSituation`, `WatchingSituation` from Task 1; `TimingScore.notes` from Task 2.
- Produces: `evaluateWatchingScore(summary: FranchiseSummary, now: Date): TimingScore` — **the second parameter is new and required.**

Why the signature changes: the de facto hiatus needs to know how long ago the last episode aired, and the domain must not read the clock. The hype window does not need it — `nextAiringEpisode.timeUntilAiringSeconds` already arrives relative.

Note that the old `"Status Unknown"` fallback disappears. `WatchingSituation` is a closed union and `BASE_SCORES` is a `Record` over it, so the compiler proves every case is handled; an unreachable fallback would only hide a future gap.

- [ ] **Step 1: Write the failing test**

Replace `src/core/domain/services/evaluate-score.test.ts` entirely:

```ts
import { describe, it, expect } from "vitest";
import { FranchiseSummary } from "../models/franchise";
import { NextEpisode } from "../models/franchise-work";
import { evaluateWatchingScore } from "./evaluate-score";

const NOW = new Date("2026-08-07T00:00:00Z");
const DAY_SECONDS = 86_400;

function summary(overrides: Partial<FranchiseSummary> = {}): FranchiseSummary {
  return {
    startYear: 2013,
    endYear: 2023,
    totalEpisodes: 87,
    averageScore: 80,
    status: "FINISHED",
    nextAiringEpisode: null,
    sourceStatus: "UNKNOWN",
    sourceFormat: null,
    ...overrides,
  };
}

function airingIn(days: number): NextEpisode {
  return {
    episode: 1,
    timeUntilAiringSeconds: days * DAY_SECONDS,
    seasonTitle: "Season 2",
  };
}

const score = (overrides: Partial<FranchiseSummary> = {}) =>
  evaluateWatchingScore(summary(overrides), NOW);

describe("evaluateWatchingScore", () => {
  describe("the score table", () => {
    it("gives a closed story with a finished source the only perfect 100", () => {
      const result = score({ status: "FINISHED", sourceStatus: "FINISHED" });

      expect(result.score).toBe(100);
      expect(result.level).toBe("PERFECT_TIME");
    });

    it("scores a closed story whose source is still running at 95", () => {
      const result = score({
        status: "FINISHED",
        sourceStatus: "ONGOING",
        sourceFormat: "MANGA",
        endYear: 2024,
      });

      expect(result.score).toBe(95);
      expect(result.level).toBe("PERFECT_TIME");
    });

    it("scores a sequel inside the hype window at 85", () => {
      const result = score({
        status: "NEW_SEASON_COMING",
        nextAiringEpisode: airingIn(12),
      });

      expect(result.score).toBe(85);
      expect(result.level).toBe("GOOD_TIME");
    });

    it("scores a still-airing mega-series at 80", () => {
      const result = score({ status: "ONGOING", totalEpisodes: 1100 });

      expect(result.score).toBe(80);
      expect(result.level).toBe("GOOD_TIME");
    });

    it("scores a distant sequel at 70", () => {
      const result = score({
        status: "NEW_SEASON_COMING",
        nextAiringEpisode: airingIn(200),
      });

      expect(result.score).toBe(70);
      expect(result.level).toBe("RISK_INCOMPLETE");
    });

    it("scores a normal series airing weekly at 50", () => {
      const result = score({ status: "ONGOING", totalEpisodes: 8 });

      expect(result.score).toBe(50);
      expect(result.level).toBe("IF_CANT_WAIT");
    });

    it("scores a stalled adaptation at 30", () => {
      const result = score({
        status: "FINISHED",
        sourceStatus: "ONGOING",
        sourceFormat: "MANGA",
        endYear: 2015,
      });

      expect(result.score).toBe(30);
      expect(result.level).toBe("NOT_GOOD_TIME");
    });

    it("scores an official hiatus at 20", () => {
      const result = score({ status: "HIATUS" });

      expect(result.score).toBe(20);
      expect(result.level).toBe("NOT_GOOD_TIME");
    });

    it("scores a franchise that has not premiered at 15", () => {
      const result = score({ status: "NOT_RELEASED" });

      expect(result.score).toBe(15);
      expect(result.level).toBe("NOT_GOOD_TIME");
    });

    it("scores a cancelled franchise at 5", () => {
      const result = score({ status: "CANCELLED" });

      expect(result.score).toBe(5);
      expect(result.level).toBe("NOT_RECOMMENDED");
    });
  });

  describe("modifiers", () => {
    it("takes five points off and says so when the source is unfinished", () => {
      const result = score({
        status: "FINISHED",
        sourceStatus: "ONGOING",
        sourceFormat: "MANGA",
        endYear: 2024,
      });

      expect(result.score).toBe(95);
      expect(result.notes).toEqual(["The manga is still being published."]);
    });

    it("names the source format rather than saying 'source'", () => {
      const result = score({
        status: "FINISHED",
        sourceStatus: "ONGOING",
        sourceFormat: "NOVEL",
        endYear: 2024,
      });

      expect(result.notes).toEqual(["The novel is still being published."]);
    });

    it("falls back to generic wording when the format is unknown", () => {
      const result = score({
        status: "FINISHED",
        sourceStatus: "ONGOING",
        sourceFormat: null,
        endYear: 2024,
      });

      expect(result.notes).toEqual([
        "The source material is still being published.",
      ]);
    });

    it("leaves an original series untouched, having no source to finish", () => {
      const result = score({ status: "FINISHED", sourceStatus: "UNKNOWN" });

      expect(result.score).toBe(100);
      expect(result.notes).toEqual([]);
    });

    it("adds fifteen points and counts down when a season is imminent", () => {
      const result = score({
        status: "NEW_SEASON_COMING",
        nextAiringEpisode: airingIn(12),
      });

      expect(result.score).toBe(85);
      expect(result.notes).toEqual(["Season 2 premieres in 12 days."]);
    });

    it("does not count a stalled adaptation's living source twice", () => {
      const result = score({
        status: "FINISHED",
        sourceStatus: "ONGOING",
        sourceFormat: "MANGA",
        endYear: 2015,
      });

      expect(result.score).toBe(30);
      expect(result.notes).toEqual([]);
    });

    it("stacks both modifiers on an imminent sequel with a living source", () => {
      const result = score({
        status: "NEW_SEASON_COMING",
        nextAiringEpisode: airingIn(12),
        sourceStatus: "ONGOING",
        sourceFormat: "MANGA",
      });

      expect(result.score).toBe(80);
      expect(result.notes).toEqual([
        "Season 2 premieres in 12 days.",
        "The manga is still being published.",
      ]);
    });
  });

  describe("boundaries", () => {
    it("counts a season exactly 60 days out as imminent", () => {
      expect(
        score({
          status: "NEW_SEASON_COMING",
          nextAiringEpisode: airingIn(60),
        }).score,
      ).toBe(85);
    });

    it("counts a season 61 days out as distant", () => {
      expect(
        score({
          status: "NEW_SEASON_COMING",
          nextAiringEpisode: airingIn(61),
        }).score,
      ).toBe(70);
    });

    it("treats an announced sequel with no date as distant", () => {
      const result = score({
        status: "NEW_SEASON_COMING",
        nextAiringEpisode: null,
      });

      expect(result.score).toBe(70);
      expect(result.notes).toEqual([]);
    });

    it("keeps every score within 0 and 100", () => {
      const result = score({
        status: "CANCELLED",
        sourceStatus: "ONGOING",
        sourceFormat: "MANGA",
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe("the verdict copy", () => {
    it("no longer calls a stalled adaptation a completed story", () => {
      const result = score({
        status: "FINISHED",
        sourceStatus: "ONGOING",
        sourceFormat: "MANGA",
        endYear: 2015,
      });

      expect(result.badgeText).not.toBe("Completed Story");
      expect(result.badgeText).toBe("Stalled Adaptation");
    });

    it("ignores the AniList rating entirely, judging the moment not the show", () => {
      const acclaimed = score({ status: "FINISHED", averageScore: 95 });
      const panned = score({ status: "FINISHED", averageScore: 30 });

      expect(acclaimed.score).toBe(panned.score);
    });
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm run test -- evaluate-score`
Expected: FAIL. Many failures, plus a type error on the two-argument call — `evaluateWatchingScore` still takes one parameter.

- [ ] **Step 3: Write the implementation**

Replace `src/core/domain/services/evaluate-score.ts` entirely:

```ts
import { FranchiseSummary } from "../models/franchise";
import { SourceFormat } from "../models/franchise-work";
import { ScoreLevel, TimingScore } from "../models/score";
import {
  WatchingSituation,
  deriveWatchingSituation,
} from "./watching-situation";

/** Days before a premiere within which catching up is worth a bonus. */
const HYPE_WINDOW_DAYS = 60;
const HYPE_WINDOW_BONUS = 15;
const UNFINISHED_SOURCE_PENALTY = -5;
const SECONDS_PER_DAY = 86_400;

/**
 * What each situation is worth. A closed story is the only route to 100:
 * the score answers "is this a good moment to watch?", and no amount of
 * backlog beats a story you can finish.
 */
const BASE_SCORES: Record<WatchingSituation, number> = {
  FINISHED: 100,
  MEGA_SERIES_ONGOING: 80,
  SEQUEL_ANNOUNCED: 70,
  ONGOING: 50,
  DE_FACTO_HIATUS: 30,
  OFFICIAL_HIATUS: 20,
  NOT_RELEASED: 15,
  CANCELLED: 5,
};

interface SituationCopy {
  badgeText: string;
  summary: string;
  details: string;
}

const COPY: Record<WatchingSituation, SituationCopy> = {
  FINISHED: {
    badgeText: "Completed Story",
    summary: "Available to watch in full.",
    details:
      "Every episode and film is out. Great time to experience the whole journey.",
  },
  MEGA_SERIES_ONGOING: {
    badgeText: "Great Backlog!",
    summary: "Massive episode backlog available.",
    details:
      "Hundreds of episodes are already out, so you can binge for a long time before the weekly wait catches up with you.",
  },
  SEQUEL_ANNOUNCED: {
    badgeText: "Sequel Announced",
    summary: "A new season is officially on the way.",
    details:
      "The story isn't closed yet. Catch up now if you don't mind waiting for the continuation.",
  },
  ONGOING: {
    badgeText: "Airing Weekly",
    summary: "Currently releasing weekly.",
    details:
      "Episodes drop week by week. Watch now only if you don't mind the wait.",
  },
  DE_FACTO_HIATUS: {
    badgeText: "Stalled Adaptation",
    summary: "No continuation in years.",
    details:
      "The last season aired years ago and the source keeps going, with no sequel announced. This adaptation may never be finished.",
  },
  OFFICIAL_HIATUS: {
    badgeText: "Indefinite Hiatus",
    summary: "Production is currently frozen.",
    details: "The project is on an indefinite pause with no return date.",
  },
  NOT_RELEASED: {
    badgeText: "Not Yet Released",
    summary: "Broadcast hasn't started.",
    details: "This series has not premiered yet.",
  },
  CANCELLED: {
    badgeText: "Cancelled Series",
    summary: "Production was officially cancelled.",
    details: "This franchise was cancelled before completing its story.",
  },
};

const SOURCE_LABELS: Record<SourceFormat, string> = {
  MANGA: "manga",
  NOVEL: "novel",
  ONE_SHOT: "one-shot",
};

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, score));
}

/**
 * The level follows the final score rather than the situation, so a modifier
 * that lifts a franchise into a better band lifts its label too.
 */
function levelForScore(score: number): ScoreLevel {
  if (score >= 90) return "PERFECT_TIME";
  if (score >= 75) return "GOOD_TIME";
  if (score >= 60) return "RISK_INCOMPLETE";
  if (score >= 40) return "IF_CANT_WAIT";
  if (score >= 10) return "NOT_GOOD_TIME";
  return "NOT_RECOMMENDED";
}

/**
 * Is now a good moment to watch this? Deliberately not "is this good" — the
 * AniList rating is shown alongside and never touches this number.
 */
export function evaluateWatchingScore(
  summary: FranchiseSummary,
  now: Date,
): TimingScore {
  const situation = deriveWatchingSituation(summary, now);
  const notes: string[] = [];
  let score = BASE_SCORES[situation];

  const next = summary.nextAiringEpisode;
  if (situation === "SEQUEL_ANNOUNCED" && next !== null) {
    const daysLeft = Math.ceil(next.timeUntilAiringSeconds / SECONDS_PER_DAY);
    if (daysLeft <= HYPE_WINDOW_DAYS) {
      score += HYPE_WINDOW_BONUS;
      const season = next.seasonTitle || "A new season";
      notes.push(`${season} premieres in ${daysLeft} days.`);
    }
  }

  // A stalled adaptation's base already accounts for the source outrunning it;
  // applying the penalty as well would charge it twice for the same fact.
  if (summary.sourceStatus === "ONGOING" && situation !== "DE_FACTO_HIATUS") {
    score += UNFINISHED_SOURCE_PENALTY;
    const label = summary.sourceFormat
      ? SOURCE_LABELS[summary.sourceFormat]
      : "source material";
    notes.push(`The ${label} is still being published.`);
  }

  const finalScore = clampScore(score);

  return {
    score: finalScore,
    level: levelForScore(finalScore),
    ...COPY[situation],
    notes,
  };
}
```

- [ ] **Step 4: Run the test and confirm the domain passes**

Run: `npm run test -- evaluate-score`
Expected: PASS, 23 tests.

- [ ] **Step 5: Inject the clock at the call site**

`npx tsc --noEmit` now fails at `src/hooks/useAnimeSearch.ts:71` — one argument given, two expected. Fix that line:

```ts
setScore(evaluateWatchingScore(collected.summary, new Date()));
```

This is the boundary where the clock enters. Everything below it stays pure.

- [ ] **Step 6: Verify the whole suite green**

Run: `npx tsc --noEmit && npm run test && npm run lint`
Expected: all clean.

- [ ] **Step 7: Commit**

```bash
git add src/core/domain/services/evaluate-score.ts src/core/domain/services/evaluate-score.test.ts src/hooks/useAnimeSearch.ts
git commit -m "feat: score the watching moment on story closure"
```

---

### Task 4: Render the notes

**Files:**
- Modify: `src/components/ScoreCard.tsx:79-82`
- Modify: `src/components/ScoreCard.test.tsx`

**Interfaces:**
- Consumes: `TimingScore.notes` from Task 2, populated by Task 3.

- [ ] **Step 1: Write the failing test**

Add these two tests inside the existing `describe("ScoreCard", ...)` block in `src/components/ScoreCard.test.tsx`:

```tsx
it("shows the modifier notes under the verdict", () => {
  renderScore(
    timingScore({
      notes: [
        "Season 2 premieres in 12 days.",
        "The manga is still being published.",
      ],
    }),
  );

  expect(screen.getByText("Season 2 premieres in 12 days.")).toBeInTheDocument();
  expect(
    screen.getByText("The manga is still being published."),
  ).toBeInTheDocument();
});

it("renders no note list when nothing modified the score", () => {
  renderScore(timingScore({ notes: [] }));

  expect(screen.queryByRole("list")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm run test -- ScoreCard`
Expected: FAIL — "Unable to find an element with the text: Season 2 premieres in 12 days."

- [ ] **Step 3: Render them**

In `src/components/ScoreCard.tsx`, replace the details block (currently lines 79-82):

```tsx
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">{score.summary}</p>
        <p className="text-sm text-gray-300 leading-relaxed">{score.details}</p>
      </div>

      {score.notes.length > 0 && (
        <ul className="space-y-1 border-t border-white/10 pt-3">
          {score.notes.map((note) => (
            <li key={note} className="text-xs text-gray-400">
              {note}
            </li>
          ))}
        </ul>
      )}
```

The list is omitted rather than rendered empty so screen readers do not announce a list with no items.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm run test -- ScoreCard`
Expected: PASS.

- [ ] **Step 5: Verify everything, including the static export**

Run: `npm run lint && npx tsc --noEmit && npm run test && npm run build`
Expected: all four clean. This is the full CI order.

- [ ] **Step 6: Commit**

```bash
git add src/components/ScoreCard.tsx src/components/ScoreCard.test.tsx
git commit -m "feat: show the score's modifier notes on the card"
```

---

### Task 5: Rewrite the scoring documentation

`docs/SCORING-SYSTEM.md` describes the old base-plus-deltas system and is now wrong in every particular.

**Files:**
- Modify: `docs/SCORING-SYSTEM.md`
- Modify: `CLAUDE.md` (the **Scoring** paragraph under Architecture)

- [ ] **Step 1: Read what is there**

Run: `cat docs/SCORING-SYSTEM.md`

Note which sections describe intent worth keeping versus mechanics that changed.

- [ ] **Step 2: Rewrite it**

The document must state:

- The question the score answers: *is now a good moment to watch this?* — not *is this good?* The AniList rating is displayed alongside and deliberately excluded from the calculation, because whether a show is worth your time is the viewer's call.
- The three-step model: situation → base score → modifiers.
- The eight situations with their base scores, as a table.
- The two modifiers, their deltas and their notes.
- The level bands and their exact boundaries.
- The three constants and why `DE_FACTO_HIATUS_YEARS` is 5 and not 2 or 3 — a shorter window flags the normal two-to-three-year gap between seasons, and the score would lie in the most common case.
- The known gap: a franchise whose source has finished but whose anime never adapted all of it still scores 100. Detecting it needs adapted-versus-published chapter counts, which AniList does not report reliably.

- [ ] **Step 3: Correct the architecture summary**

In `CLAUDE.md`, the **Scoring** paragraph still describes `BASE_SCORE = 70`, deltas, a quality bonus, and the two special windows. Replace it with a description of the situation/base/modifier model, the new `now` parameter, and the fact that `deriveWatchingSituation` lives in `src/core/domain/services/watching-situation.ts`.

- [ ] **Step 4: Confirm nothing else cites the old model**

Run: `grep -rn "BASE_SCORE\|quality bonus\|qualityBonus\|HYPE_WINDOW" docs/ CLAUDE.md AGENTS.md ROADMAP.md`
Expected: only the rewritten passages appear. Fix any survivor.

- [ ] **Step 5: Commit**

```bash
git add docs/SCORING-SYSTEM.md CLAUDE.md
git commit -m "docs: describe the closure-first scoring model"
```

---

## Done when

- `npm run lint && npx tsc --noEmit && npm run test && npm run build` all pass.
- Every score in the table in Global Constraints is asserted by a test that names it.
- `grep -rn "averageScore" src/core/domain/services/evaluate-score.ts` returns nothing.
- No `new Date()` anywhere under `src/core/domain/`.
