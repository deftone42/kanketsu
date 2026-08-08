# 🗺️ AniTime - Project Roadmap & Architecture Status

**AniTime** is an anime discovery tool centered around calculating a **"Timing Score"** (an evaluation of how suitable it is to start a series based on its current status, sequel announcements, and franchise continuity).

---

## 🏗️ Architecture Status & Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS
- **Architecture:** Hexagonal (Domain, Ports, Adapters)
- **Environment:** Node.js `>=22.0.0` (Enforced via `.nvmrc` and `engines` with `engine-strict=true`)
- **Deployment & Distribution:** Static Export deployed to **Vercel** (Hobby) from the private repo — push to `main` ships production, every PR gets a preview URL. GitHub Pages was ruled out: publishing from a private repo requires a paid GitHub plan. Vercel's build runs `build` only; quality is gated by CI on PRs. Automated GitHub Releases (`releases.yml`) stay as they are, independent of hosting.
- **Testing:** Fixtures are **recorded from the real AniList API** (`npm run record:fixtures`) and replayed offline — CI never hits the network. Hand-written mocks encode what we _assume_ the API returns and would have hidden every shape that actually mattered: `episodes: null` on an airing One Piece, Monogatari's five distinct source novels, Steins;Gate having no source work at all, and id `9183` being a dead id (real Gintama is `918`).

---

## 🟡 Phase 1: Refining

- [x] **Search & Detail View:**
  - `SearchBar` component with a 350ms debounce threshold.
  - `AnimeDetailCard` component showcasing series metadata and the Timing Score verdict.
- [x] **Franchise Domain Model** (PR #3):
  - `FranchiseCollector` collects a whole franchise into **our own** model — `timeline` (PREQUEL/SEQUEL chain in release order), `related` (movies, OVAs, specials), `sources` (manga/novels), and a `FranchiseSummary`. Nothing AniList-shaped crosses the port.
  - Frontier-batched traversal: One Piece went from ~50 requests to **3**. AniList shares one ID space across anime and manga, and rate-limits per request rather than per query complexity, so source works and 3-hop nesting are free.
  - Typed errors (`RateLimitedError`, `WorkNotFoundError`, `RepositoryUnavailableError`). A rate limit sets `isComplete: false` + `unresolvedIds` instead of silently returning a truncated franchise.
  - `rootId` is always the entry the user selected, so the UI can highlight it.
- [ ] **Franchise & Sequel Breakdown (UI):**
  - **Carousel or list of the franchise in release order, with the selected entry highlighted in place.** Do not reorder it — the release ordering is the point. A single-entry franchise renders nothing.
  - Data is ready: render `franchise.timeline`, mark `franchise.rootId`.
  - Open questions for its design pass: horizontal scroll vs grid vs list; what each card shows; how "you are here" reads visually and to a screen reader; behaviour on a 40+ entry franchise; whether `related` (movies, OVAs) gets its own strip.
  - Decided against a single "face" entry for the franchise: JJK S2 is a _season_ of one work while Fate/Zero is a _standalone work_, and no rule serves both. Showing the selected entry **plus** its entry point sidesteps the choice entirely.
- [ ] **Per-entry detail view:**
  - Open a single season/movie from the timeline and see its own metadata (episodes, score, dates, synopsis) without leaving the franchise view. The timeline strip ships non-interactive precisely because the franchise-level score does not change when you pick a different entry — a per-entry view is what would make clicking meaningful.
- [ ] **Extra franchise information (UI TBD):**
  - Spin-offs, movies, OVAs and specials — everything in `franchise.related` — plus the source works in `franchise.sources`. All already collected; only the presentation is undecided.
  - Matters more than it looks: a franchise can have a `timeline` of 1 and still be huge. One Piece is a single continuous series with **108 related works** (35 movies, 37 specials, 14 TV); Death Note has 3. For those, `related` _is_ the franchise.
- [x] **Timing Score refinement** — done in the closure-first redesign (`docs/superpowers/specs/2026-08-07-timing-score-redesign-design.md`). `summary.sourceStatus` is now scored; a closed story is the only route to 100; abandoned adaptations are inferred as `DE_FACTO_HIATUS` rather than passing as completed stories; the constants were revisited and `BASE_SCORE` is gone.
  - **Reference scenario, now pinned by a test: HUNTER×HUNTER (2011).** `FINISHED` anime, `endYear: 2014`, manga still unconcluded — the adaptation stops mid-arc, so there is no ending to watch. Scored 85 as a "Completed Story" under the old system; scores 55 as a "Stalled Adaptation" now. Started at 30, raised once Baccano! showed the situation also catches adaptations that _close_ their arcs from a source that never ends — the data cannot tell the two apart. Documented in `docs/SCORING-SYSTEM.md`.
  - **Quality went the other way, deliberately.** The old plan was to penalise poorly-rated series harder. Instead `averageScore` left the calculation entirely: the score answers _"is now a good moment"_, not _"is this good"_. What remains is UI work — show the AniList rating beside the score as its own piece of information, so the reader decides.
  - Guard rail worth keeping: for a single-season series the seasons average must equal that season's own score. Fixed once already — the average used to include movies and specials, which made Sacred Seven report a score its only season never had.
- [ ] **Open scoring questions:**
  - **A single cancelled work sinks the whole franchise.** `deriveStatus` returns `CANCELLED` if _any_ work in the timeline is cancelled, so one abandoned 90s OVA gives a perfectly complete anime a 5. Found while reviewing the score; deliberately out of scope for the redesign.
  - **A cancelled or paused source counts as "still being published".** `deriveSourceStatus` only asks whether every source is `FINISHED`, so the `CANCELLED` and `HIATUS` arms of `SourceStatus` fall through to `ONGOING`: a manga the publisher dropped is reported as if new chapters were still coming, costing the franchise `UNFINISHED_SOURCE_PENALTY` and blocking the route to 100. Found while fixing Durarara!!'s source detection; left alone there to keep that fix to one change. Deciding it needs a call on what a dead source _means_ for the score — an adaptation whose source was cancelled will never be completed either, so it may belong nearer `DE_FACTO_HIATUS` than `FINISHED`.
  - **"4 closed seasons + a sequel" scores the same as "1 season + a vague sequel"** — both are `SEQUEL_ANNOUNCED` at 70. Revisit with real usage before adding a variable for it.
- [ ] **New season release date display**
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
- [ ] **Docs drift cleanup:**
  - `docs/ARCHITECTURE.md` and `docs/TESTING.md` still describe the removed `Anime` model and `src/app/__tests__/` fixtures that do not exist. Rewrite against the current tree.
- [ ] **PWA / Offline Support:**
  - Basic offline reading support for saved/bookmarked anime lists.
- [ ] **Custom Timing Score Filters:**
  - User preference toggles (e.g., "Prefer finished series", "Tolerate ongoing series if few episodes remain", "Filter recommendations strictly by Movies or TV Series").
- [ ] **Accesibility:**
  - Aria labels, alt, etc....
- [ ] **SEO:**
- [ ] **Dedicated Design**
