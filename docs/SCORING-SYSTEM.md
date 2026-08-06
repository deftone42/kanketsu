# 🎯 AniTime Scoring System (Timing Score)

The **Timing Score** answers one question: _"Is it the right moment to start watching this anime?"_

It is computed by the pure domain function `evaluateWatchingScore(anime: Anime): TimingScore` located at `src/core/domain/services/evaluate-score.ts`.

---

## 📊 Score Levels

| Level             | Meaning                                            | Typical Range |
| :---------------- | :------------------------------------------------- | :------------ |
| `PERFECT_TIME`    | Ideal moment — binge or huge backlog available     | ~90–100       |
| `GOOD_TIME`       | Good moment — completed season or announced sequel | ~80–85        |
| `IF_CANT_WAIT`    | Watch only if impatient — weekly release           | ~55–60        |
| `RISK_INCOMPLETE` | Risky — production limbo, incomplete arc risk      | ~40–45        |
| `NOT_GOOD_TIME`   | Bad moment — hiatus, unreleased, or status unclear | ~20–50        |
| `NOT_RECOMMENDED` | Avoid — officially cancelled                       | ~10–15        |

Each result also includes a human-readable `badgeText`, `summary`, and `details`.

---

## ⚙️ Core Constants

| Constant                        | Value | Purpose                                     |
| :------------------------------ | :---- | :------------------------------------------ |
| `BASE_SCORE`                    | `70`  | Starting point for all evaluations          |
| `LIMBO_THRESHOLD_YEARS`         | `3`   | Years without news → production limbo       |
| `MEGA_SERIES_EPISODE_THRESHOLD` | `150` | Episodes needed to qualify as a mega-series |
| `HYPE_WINDOW_DAYS`              | `60`  | Days before a sequel airs → hype window     |

---

## ➕ Quality Bonus

The community score (AniList `averageScore`) nudges the result:

| User Score       | Bonus |
| :--------------- | :---- |
| `≥ 85`           | `+5`  |
| `≤ 50`           | `-5`  |
| otherwise / null | `0`   |

Example: a `FINISHED` season with `userScore = 91` → `70 + 10 + 5 = 85`.

---

## 🧮 Evaluation Cases (in priority order)

The function evaluates the anime **top to bottom** and returns on the **first matching case**.

### Case 1 — CANCELLED 🚫 (`NOT_RECOMMENDED`)

```
score = 70 - 60 + qualityBonus  →  ≈ 10–15
badge: "Cancelled Series"
```

Production was officially cancelled before completing the story.

### Case 2 — HIATUS ⏸️ (`NOT_GOOD_TIME`)

```
score = 70 - 40 + qualityBonus  →  ≈ 30–35
badge: "Indefinite Hiatus"
```

Production is frozen with no announced return date.

### Case 3 — NOT_YET_RELEASED 🕐 (`NOT_GOOD_TIME`)

```
score = 70 - 50  →  20
badge: "Not Yet Released"
```

Broadcast hasn't started yet.

### Case 4 — Hype Window 🔥 (`PERFECT_TIME`)

Trigger: a `SEQUEL` relation with `status === "NOT_YET_RELEASED"` airing **within 60 days**.

```
score = 70 + 25 + qualityBonus  →  ≈ 95–100
badge: "Hype Window Active!"
summary: "New season premieres in X days!"
```

Perfect timing — binge now and join weekly broadcasts.

### Case 5 — Sequel Confirmed ✅ (`GOOD_TIME`)

Trigger: a `SEQUEL` relation with `status === "NOT_YET_RELEASED"` but **outside the hype window** (or unknown date).

```
score = 70 + 10 + qualityBonus  →  ≈ 80–85
badge: "Good time to catch up"
```

A continuation is scheduled/in production. Catch up now.

### Case 6 — RELEASING 📺

**Sub-case A: Mega-series** (`PERFECT_TIME`)
Trigger: `episodes === null` OR `episodes >= 150` (One Piece, Detective Conan…).

```
score = 70 + 20 + qualityBonus  →  ≈ 90–95
badge: "Great Backlog!"
```

Massive backlog → binge without week-to-week waiting.

**Sub-case B: Short season airing weekly** (`IF_CANT_WAIT`)

```
score = 70 - 15 + qualityBonus  →  ≈ 55–60
badge: "Watch if impatient"
```

Episodes drop weekly. Watch for live discussions or wait for the season to finish.

### Case 7 — FINISHED 🏁

Three sub-cases, evaluated in order:

**Sub-case A: Production Limbo** (`RISK_INCOMPLETE`)
Trigger: ended **≥ 3 years ago** (`CURRENT_YEAR - endDate.year >= 3`) **and** no finished sequel.

```
score = 70 - 30 + qualityBonus  →  ≈ 40–45
badge: "Production Limbo"
```

Example: **Sacred Seven** (ended 2011, user score 61) → `40`.

**Sub-case B: Completed Franchise** (`PERFECT_TIME`)
Trigger: has a `SEQUEL` relation with `status === "FINISHED"` **and** no upcoming sequel.

```
score = 70 + 25 + qualityBonus  →  up to 100
badge: "Completed Story!"
```

Example: **Gintama** (201 episodes, sequels finished, user score 85) → `70 + 25 + 5 = 100`.

**Sub-case C: Season Complete, Story Ongoing** (`GOOD_TIME`)
The recent season ended, but no sequel is confirmed yet.

```
score = 70 + 10 + qualityBonus  →  ≈ 80–85
badge: "Season Complete"
```

Example: **Frieren** (28 episodes, ended 2024, user score 91) → `70 + 10 + 5 = 85`.

---

## 🛟 Fallback

If no case matches (unknown status), the function returns:

```
score: 50
level: "NOT_GOOD_TIME"
badge: "Status Unknown"
summary: "Insufficient data."
```

---

## 🧪 Verified Scenarios (test fixtures)

| Series           | Status      | Key Signal                           | Result                               | Score |
| :--------------- | :---------- | :----------------------------------- | :----------------------------------- | :---- |
| **Gintama**      | `FINISHED`  | Finished sequels, franchise complete | `PERFECT_TIME` "Completed Story!"    | 100   |
| **Frieren**      | `FINISHED`  | Recent season, story ongoing         | `GOOD_TIME` "Season Complete"        | 85    |
| **One Piece**    | `RELEASING` | Mega-series backlog                  | `PERFECT_TIME` "Great Backlog!"      | 95    |
| **Sacred Seven** | `FINISHED`  | Limbo > 3 years, no sequel           | `RISK_INCOMPLETE` "Production Limbo" | 40    |

Fixtures: `src/app/__tests__/fixtures/{gintama,frieren,one-piece,sacred-seven}.ts`
Tests: `src/core/domain/services/evaluate-score.test.ts`
