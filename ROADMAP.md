# 🗺️ AniTime - Project Roadmap & Architecture Status

**AniTime** is an anime discovery tool centered around calculating a **"Timing Score"** (an evaluation of how suitable it is to start a series based on its current status, sequel announcements, and franchise continuity).

---

## 🏗️ Architecture Status & Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS
- **Architecture:** Hexagonal (Domain, Ports, Adapters)
- **Environment:** Node.js `>=22.0.0` (Enforced via `.nvmrc` and `engines` with `engine-strict=true`)
- **Deployment & Distribution:** Local build / Static Export (GitHub Pages and automated Releases are currently on hold/disabled).

---

## 🟡 Phase 1: Refining

- [x] **Search & Detail View:**
  - `SearchBar` component with a 350ms debounce threshold.
  - `AnimeDetailCard` component showcasing series metadata and the Timing Score verdict.
- [ ] **Franchise & Sequel Breakdown:**
  - Interactive UI detailing seasons and movies
- [ ] **New season release date display**
- [ ] **Genre & Format Recommendation Engine:**
  - **Domain:** Extend domain models to include `genres` (Action, Romance, Sci-Fi, etc.) and explicit `format` classification (TV, Movie, OVA, Special, ONA).
  - **Infrastructure:** Parameterized AniList GraphQL queries to retrieve related/recommended series by genre and format.
  - **Domain Service:** Recommendation sorting algorithm prioritizing shows with a favorable **Timing Score** ("Ideal to watch now").
  - **UI:** Interactive carousel/section for "Similar shows worth watching right now".

---

## 🔮 Phase 2: Optimization & Advanced Features (Backlog)

- [ ] **Deployment Pipeline Re-activation:**
  - Re-enable GitHub Actions deployment for GitHub Pages static output.
- [ ] **Client Caching / LocalStorage:**
  - Temporary client-side caching to minimize API requests for repeated searches.
- [ ] **PWA / Offline Support:**
  - Basic offline reading support for saved/bookmarked anime lists.
- [ ] **Custom Timing Score Filters:**
  - User preference toggles (e.g., "Prefer finished series", "Tolerate ongoing series if few episodes remain", "Filter recommendations strictly by Movies or TV Series").
- [ ] **Accesibility:**
  - Aria labels, alt, etc....
- [ ] **SEO:**
- [ ] **Dedicated Design**
