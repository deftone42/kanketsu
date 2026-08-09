# 🗺️ Kanketsu - Project Roadmap & Architecture Status

**Kanketsu** is an anime discovery tool centered around calculating a **"Timing Score"** (an evaluation of how suitable it is to start a series based on its current status, sequel announcements, and franchise continuity).

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
- [x] **Per-entry detail view** — the timeline strip is interactive: clicking an entry swaps `SeasonCard` to that entry's own run dates, next-episode countdown and synopsis, with no extra request (`franchise.timeline` is already hydrated). The franchise-level score deliberately does not move.
  - **One mark, not two.** The active entry is the one you are viewing, seeded from `rootId`. A second marker for "the entry you originally searched" was rejected as a concept the UI would have to explain; the searched entry stays one click away in its release position.
  - `AnimeWork.description` came along for the ride — AniList returns markup even with `asHtml: false`, so the mapper flattens it to plain text and no component ever needs `dangerouslySetInnerHTML`.
  - Fixed on the way past: the strip was `overflow-x-auto` with nothing focusable inside, so it could not be scrolled by keyboard at all. Real buttons make tabbing scroll it.
- [x] **Timing Score refinement** (PR #5) — closure-first redesign: `summary.sourceStatus` is scored, a closed story is the only route to 100, and abandoned adaptations are inferred as `DE_FACTO_HIATUS` instead of passing as completed stories. The full table and its rationale live in `docs/SCORING-SYSTEM.md`.
  - **Quality left the calculation deliberately.** The old plan was to penalise poorly-rated series harder; instead `averageScore` was removed from scoring and shown beside the verdict as its own piece of information — the score answers _"is now a good moment"_, not _"is this good"_.
  - Guard rail worth keeping: for a single-season series the seasons average must equal that season's own score. Fixed once already — the average used to include movies and specials, which made Sacred Seven report a score its only season never had.
- [x] **Proper icon for the hero and the favicon:**
  - The hero has its own mark — a cat carrying the 完 stamp — instead of lucide's `Clock`, and `src/app/icon.svg` replaces the Next.js default `favicon.ico`. Leaving `favicon.ico` in place is not an option: it wins over `icon.svg` in the App Router, so the new mark would never be seen.
  - **The kanji is drawn as vector strokes, never `<text>`.** A `<text>` favicon renders empty on any machine without a Japanese font.
  - The badge is a white disc with an indigo ring rather than a dark halo, which read as a dirty outline on a light browser tab.
  - `KanketsuMark.tsx` and `icon.svg` duplicate the same paths — importing an SVG as a component needs a loader, and the runtime dependencies are four on purpose. `KanketsuMark.test.tsx` compares the `d` attributes of both files so they cannot drift apart.
  - **Only an SVG favicon ships.** Safari below 16.4 shows no icon at all; rasterizing an `.ico` needs tooling the project does not have.

---

## 🔮 Backlog

- [ ] **Client Caching / LocalStorage:**
  - Temporary client-side caching to minimize API requests for repeated searches.
  - Now cheaper to justify: AniList is throttled to **30 req/min** (down from 90), and a franchise costs 3–10 requests. Caching collected franchises would make repeat searches free.
- [ ] **PWA / Offline Support:**
  - Basic offline reading support for saved/bookmarked anime lists.
- [ ] **Custom Timing Score Filters:**
  - User preference toggles (e.g., "Prefer finished series", "Tolerate ongoing series if few episodes remain", "Filter recommendations strictly by Movies or TV Series").
- [ ] **Dedicated Design**
- [ ] **Genre & Format Recommendation Engine:**
  - **Domain:** ✅ `Genre` is our own token vocabulary (`SCI_FI`, `SLICE_OF_LIFE`), not AniList's display labels — the mapper translates and drops anything outside it, so recommendations never compare API spellings. `AnimeWork.genres` is hydrated and `franchiseGenres` ranks a franchise's by how many entries share them. `format` was already classified.
  - **Infrastructure:** Parameterized AniList GraphQL queries to retrieve related/recommended series by genre and format.
  - **Domain Service:** Recommendation sorting algorithm prioritizing shows with a favorable **Timing Score** ("Ideal to watch now").
  - **UI:** Interactive carousel/section for "Similar shows worth watching right now".
