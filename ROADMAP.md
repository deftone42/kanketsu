# 🗺️ AniTime - Project Roadmap & Architecture Status

**AniTime** is an anime discovery tool centered around calculating a **"Timing Score"** (an evaluation of how suitable it is to start a series based on its current status, sequel announcements, and franchise continuity).

---

## 🏗️ Architecture Status & Tech Stack

Stack, hexagonal layering, deployment and the recorded-fixture policy live in `CLAUDE.md` — this file only tracks what is in flight.

---

## 🟡 Phase 1: Refining

- [x] **Search & Detail View:**
  - `SearchBar` component with a 350ms debounce threshold.
  - Detail view split into `SeasonCard`, `FranchiseCard` and `ScoreCard` (PR #4) — season metadata, franchise totals with the next-episode countdown and AniList rating, and the Timing Score verdict.
- [x] **Franchise Domain Model** (PR #3):
  - `FranchiseCollector` collects a whole franchise into **our own** model — `timeline` (PREQUEL/SEQUEL chain in release order), `related` (movies, OVAs, specials), `sources` (manga/novels), and a `FranchiseSummary`. Nothing AniList-shaped crosses the port.
  - Frontier-batched traversal: One Piece went from ~50 requests to **3**. AniList shares one ID space across anime and manga, and rate-limits per request rather than per query complexity, so source works and 3-hop nesting are free.
  - Typed errors (`RateLimitedError`, `WorkNotFoundError`, `RepositoryUnavailableError`). A rate limit sets `isComplete: false` + `unresolvedIds` instead of silently returning a truncated franchise.
  - `rootId` is always the entry the user selected, so the UI can highlight it.
- [x] **Franchise & Sequel Breakdown (UI)** (PR #4) — `FranchiseTimeline` renders `franchise.timeline` as a horizontal strip in release order with `rootId` marked in place; a single-entry franchise renders nothing.
  - Decided against a single "face" entry for the franchise: JJK S2 is a _season_ of one work while Fate/Zero is a _standalone work_, and no rule serves both. Showing the selected entry **plus** its entry point sidesteps the choice entirely.
- [x] **Per-entry detail view** — the timeline strip is interactive: clicking an entry swaps `SeasonCard` to that entry's own run dates, next-episode countdown and synopsis, with no extra request (`franchise.timeline` is already hydrated). The franchise-level score deliberately does not move.
  - **One mark, not two.** The active entry is the one you are viewing, seeded from `rootId`. A second marker for "the entry you originally searched" was rejected as a concept the UI would have to explain; the searched entry stays one click away in its release position.
  - `AnimeWork.description` came along for the ride — AniList returns markup even with `asHtml: false`, so the mapper flattens it to plain text and no component ever needs `dangerouslySetInnerHTML`.
  - Fixed on the way past: the strip was `overflow-x-auto` with nothing focusable inside, so it could not be scrolled by keyboard at all. Real buttons make tabbing scroll it.
- [ ] **Extra franchise information (UI TBD):**
  - Spin-offs, movies, OVAs and specials — everything in `franchise.related` — plus the source works in `franchise.sources`. All already collected; only the presentation is undecided.
  - Matters more than it looks: a franchise can have a `timeline` of 1 and still be huge. One Piece is a single continuous series with **108 related works** (35 movies, 37 specials, 14 TV); Death Note has 3. For those, `related` _is_ the franchise.
- [x] **Timing Score refinement** (PR #5) — closure-first redesign: `summary.sourceStatus` is scored, a closed story is the only route to 100, and abandoned adaptations are inferred as `DE_FACTO_HIATUS` instead of passing as completed stories. The full table and its rationale live in `docs/SCORING-SYSTEM.md`.
  - **Quality left the calculation deliberately.** The old plan was to penalise poorly-rated series harder; instead `averageScore` was removed from scoring and shown beside the verdict as its own piece of information — the score answers _"is now a good moment"_, not _"is this good"_.
  - Guard rail worth keeping: for a single-season series the seasons average must equal that season's own score. Fixed once already — the average used to include movies and specials, which made Sacred Seven report a score its only season never had.
- [ ] **Open scoring questions:**
  - **A single cancelled work sinks the whole franchise.** `deriveStatus` returns `CANCELLED` if _any_ work in the timeline is cancelled, so one abandoned 90s OVA gives a perfectly complete anime a 5. Found while reviewing the score; deliberately out of scope for the redesign.
  - **A cancelled or paused source counts as "still being published".** `deriveSourceStatus` only asks whether every source is `FINISHED`, so the `CANCELLED` and `HIATUS` arms of `SourceStatus` fall through to `ONGOING`: a manga the publisher dropped is reported as if new chapters were still coming, costing the franchise `UNFINISHED_SOURCE_PENALTY` and blocking the route to 100. Found while fixing Durarara!!'s source detection; left alone there to keep that fix to one change. Deciding it needs a call on what a dead source _means_ for the score — an adaptation whose source was cancelled will never be completed either, so it may belong nearer `DE_FACTO_HIATUS` than `FINISHED`.
  - **"4 closed seasons + a sequel" scores the same as "1 season + a vague sequel"** — both are `SEQUEL_ANNOUNCED` at 70. Revisit with real usage before adding a variable for it.
- [ ] **Genre & Format Recommendation Engine:**
  - **Domain:** Extend domain models to include `genres` (Action, Romance, Sci-Fi, etc.) and explicit `format` classification (TV, Movie, OVA, Special, ONA).
  - **Infrastructure:** Parameterized AniList GraphQL queries to retrieve related/recommended series by genre and format.
  - **Domain Service:** Recommendation sorting algorithm prioritizing shows with a favorable **Timing Score** ("Ideal to watch now").
  - **UI:** Interactive carousel/section for "Similar shows worth watching right now".

---

## 🔮 Phase 2: Optimization & Advanced Features (Backlog)

- [ ] **Client Caching / LocalStorage:**
  - Temporary client-side caching to minimize API requests for repeated searches.
  - Now cheaper to justify: AniList is throttled to **30 req/min** (down from 90), and a franchise costs 3–10 requests. Caching collected franchises would make repeat searches free.
- [ ] **Rate-limit retry policy:**
  - Currently **fail fast**: a 429 stops traversal and the UI reports what is missing. Chosen because the batched collector rarely hits the cap and a silent 60s wait behind a loader is worse than an honest message.
  - Revisit if the cap proves to bind in practice — `RateLimitedError` already carries `retryAfterSeconds`.
- [ ] **PWA / Offline Support:**
  - Basic offline reading support for saved/bookmarked anime lists.
- [ ] **Custom Timing Score Filters:**
  - User preference toggles (e.g., "Prefer finished series", "Tolerate ongoing series if few episodes remain", "Filter recommendations strictly by Movies or TV Series").
- [ ] **Accesibility:**
  - Aria labels, alt, etc....
- [ ] **SEO:**
- [ ] **Dedicated Design**
