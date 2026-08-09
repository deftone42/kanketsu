# 🎯 Kanketsu Scoring System (Timing Score)

The **Timing Score** answers one question: _"Is now a good moment to start watching this franchise?"_

It deliberately does **not** answer "is this anime good". The AniList community rating is displayed alongside the score and never enters the calculation — whether a show is worth your time is your call, not the app's.

Two pure domain functions produce it:

- `deriveWatchingSituation(summary, now)` — `src/core/domain/services/watching-situation.ts`
- `evaluateWatchingScore(summary, now)` — `src/core/domain/services/evaluate-score.ts`

Both take a `FranchiseSummary` (produced by `summarizeFranchise`) and the current time. The clock is a parameter because the domain must stay pure and testable without mocking time; `useAnimeSearch` injects it.

---

## 🧮 The model

Three steps:

1. **Situation** — the franchise is classified into one of eight mutually exclusive situations.
2. **Base score** — fixed by the situation.
3. **Modifiers** — small deltas that also contribute a user-facing note.

The result is clamped to 0–100.

### Situations and base scores

| Situation             | Base | Meaning                                                    |
| :-------------------- | ---: | :--------------------------------------------------------- |
| `FINISHED`            |  100 | The story is closed and watchable in full                   |
| `MEGA_SERIES_ONGOING` |   80 | Still airing, but ≥150 episodes of backlog exist            |
| `SEQUEL_ANNOUNCED`    |   70 | A continuation is on the way; the story is not closed       |
| `DE_FACTO_HIATUS`     |   55 | Looks finished; the source outran it and nothing followed   |
| `ONGOING`             |   50 | Airing weekly with no meaningful backlog                    |
| `OFFICIAL_HIATUS`     |   20 | AniList reports production frozen                           |
| `NOT_RELEASED`        |   15 | Has not premiered                                           |
| `CANCELLED`           |    5 | Cancelled before completing its story                       |

**A closed story is the only route to 100.** No amount of backlog beats a story you can actually finish. This is the central inversion from the previous system, which ranked a hype window (95) and a mega-series (90) above a completed franchise (85), leaving nothing able to reach 100.

The large gap between 50 and 70 is deliberate: above it you can watch something right now without waiting week to week, below it you cannot.

**`DE_FACTO_HIATUS` sits just above `ONGOING`, and that is the point.** Every episode is already out and there is nothing left to wait for. It was 30 until the situation was found to hold two different franchises that the data cannot tell apart: HUNTER×HUNTER, abandoned mid-arc with no ending to watch, and Baccano!, whose anime closes the arcs it adapts while Narita's light novel simply never ends. Both read as "finished anime, living source, years of silence". Separating them needs adapted-versus-published chapter counts, which AniList does not report reliably, so the band says *"if you can't wait"* rather than pretending to know which one it is looking at. The copy carries the same hedge: the adaptation *may* have closed an arc, or *may* have stopped mid-story.

### Modifiers

| Condition                                     | Delta | Note added                                    |
| :-------------------------------------------- | ----: | :-------------------------------------------- |
| `sourceStatus === "ONGOING"`                   |  `-5` | "The {manga/novel/one-shot} is still being published." |
| Next episode within `HYPE_WINDOW_DAYS`         | `+15` | "{Season title} premieres in N days."         |

The notes land in `TimingScore.notes` and render as secondary lines under the verdict on the `ScoreCard`.

Two rules govern them:

- **The hype bonus only applies to `SEQUEL_ANNOUNCED`.** Applying it to a closed story would break the invariant that closure is the ceiling.
- **`DE_FACTO_HIATUS` never takes the source penalty.** Its base of 55 already accounts for the source outrunning the adaptation; charging the −5 as well would count the same fact twice.

`sourceStatus === "UNKNOWN"` — an original series with no source work linked in AniList, such as the recorded Steins;Gate fixture — takes no penalty and gets no note. There is no source that could be left unfinished, so a completed original scores a clean 100.

---

## 📊 Score levels

The `ScoreLevel` follows the **final score**, not the situation, so a modifier that lifts a franchise into a better band lifts its label with it. A single source of truth means no special case is needed when a modifier crosses a boundary.

| Final score | Level             |
| :---------- | :---------------- |
| `≥ 90`      | `PERFECT_TIME`    |
| `≥ 75`      | `GOOD_TIME`       |
| `≥ 60`      | `RISK_INCOMPLETE` |
| `≥ 40`      | `IF_CANT_WAIT`    |
| `≥ 10`      | `NOT_GOOD_TIME`   |
| below       | `NOT_RECOMMENDED` |

There is no unknown-status fallback. `WatchingSituation` is a closed union and the score table is a `Record` over it, so the compiler proves every case is handled; an unreachable fallback would only hide a future gap.

---

## ⚙️ Constants

| Constant                        | Value | Purpose                                            |
| :------------------------------ | :---- | :------------------------------------------------- |
| `MEGA_SERIES_EPISODE_THRESHOLD` | `150` | Episodes past which airing means backlog, not wait |
| `HYPE_WINDOW_DAYS`              | `60`  | Days before a premiere that earn the bonus         |
| `DE_FACTO_HIATUS_YEARS`         | `5`   | Years of silence that mean abandonment             |
| `HYPE_WINDOW_BONUS`             | `15`  | The hype modifier                                  |
| `UNFINISHED_SOURCE_PENALTY`     | `-5`  | The unfinished-source modifier                     |

`DE_FACTO_HIATUS_YEARS` is deliberately conservative. Two to three years is the **normal** production gap between seasons, so a shorter window would flag the most common case in the industry and the score would lie about it. At five years, only flagrant abandonment triggers.

---

## 🕳️ The de facto hiatus

AniList has no status for _"the studio quietly stopped"_. A franchise whose last season aired eight years ago, whose manga is still running, and which has no sequel announced, reports as plain `FINISHED`.

The old system gave that case the badge "Completed Story" and a top score — the highest possible mark for the situation a viewer most wants to avoid.

We infer it instead: **`FINISHED` + source still publishing + last episode aired ≥5 years ago**. All three are required. Without an `endYear` the age cannot be measured and the franchise stays `FINISHED`; without a living source there is nothing left to adapt.

### Reference scenario: HUNTER×HUNTER (2011)

The case this rule exists for. The anime is `FINISHED` — it ended in 2014 — but the manga never concluded and the adaptation simply stops mid-arc. There is no ending to watch.

| Signal         | Value                                          |
| :------------- | :--------------------------------------------- |
| `status`       | `FINISHED`                                     |
| `endYear`      | `2014`                                         |
| `sourceStatus` | `ONGOING` (the manga is itself on hiatus)      |
| Result         | `DE_FACTO_HIATUS` → **55**, "Stalled Adaptation" |

Note why `sourceStatus` reads `ONGOING` rather than `HIATUS`: `deriveSourceStatus` collapses source works to `FINISHED` only when *every* one has finished. A paused manga is an unfinished manga, which is exactly the signal we want.

`FINISHED` anime **+** a source that outlives it is not a completed story. The measure is distinct from the two that ask *how much* content exists — this one asks whether it **concludes**.

### Counterweight: Baccano!

Why the situation is worth 55 and not 30. Baccano!'s anime ended in 2008 and its light novel is still `RELEASING` — Narita never concluded it — so it reads identically to HUNTER×HUNTER. But the anime adapts three arcs and closes them: nothing was abandoned.

The rule cannot see the difference, because the difference is *how much of the source the anime covered*, and AniList does not report it. So the score stops short of condemning: 55 puts both in "if you can't wait" instead of burying a complete adaptation next to a cancelled one.

Both scenarios are pinned by tests in `evaluate-score.test.ts`.

---

## 🚧 Known gap

A franchise whose **source has finished** but whose anime never adapted all of it still scores 100 as a completed story. Detecting it would need adapted-versus-published chapter counts, which AniList does not report reliably. Deliberately out of scope.

---

## 🧪 Tests

- `src/core/domain/services/watching-situation.test.ts` — one test per situation, plus the 150-episode and 5-year boundaries.
- `src/core/domain/services/evaluate-score.test.ts` — the score table above made executable: one test per row asserting the exact number, plus the modifiers, the band boundaries and the clamp.

Every test pins a fixed `now`. Nothing in `src/core/domain/` calls `new Date()`.
