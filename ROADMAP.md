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

## ✅ Phase 1: Foundations & Base Architecture (Completed)

- [x] **Domain Layer & Ports:**
  - `Anime`, `AnimeSearchResult`, and `TimingScore` models along with the `AnimeRepository` interface.
  - Core scoring service logic via `evaluateAnimeScore`.
- [x] **Infrastructure Adapter (AniList GraphQL):**
  - Modularized under `infrastructure/adapters/anilist/`.
  - Clean separation of response DTOs (`anilist-response.dto.ts`) and GraphQL queries (`queries.ts`).
  - Zero `any` policy with strict TypeScript typing.
  - Search filter bug fixes for long-running/massive franchises (_One Piece_, _Black Clover_, etc.).
- [x] **Hooks & State:**
  - `useAnimeSearch` hook optimized for React 19 / Next.js 15 (preventing cascading re-renders).
  - Derived state management using `useMemo` and clean asynchronous debouncing.
- [x] **CI/CD & Environment:**
  - Strict Node.js version alignment via `.nvmrc`.
  - Automated GitHub Actions validation workflow (Lint, Typecheck, Build).

---

## 🧪 Phase 2: Testing & Code Quality (Next Up)

- [ ] **Integration Test Suite with Vitest & MSW:**
  - Test environment setup using Vitest and React Testing Library.
  - Mock API integration using MSW (_Mock Service Worker_) to intercept AniList GraphQL calls.
  - Unit tests for `evaluateAnimeScore` logic.
  - Integration tests for the `useAnimeSearch` hook.

---

## 🟡 Phase 2: UI Components & User Experience (In Progress)

- [x] **Search & Detail View:**
  - `SearchBar` component with a 350ms debounce threshold.
  - `AnimeDetailCard` component showcasing series metadata and the Timing Score verdict.
- [ ] **Franchise & Sequel Breakdown:**
  - Interactive UI detailing connected seasons, prequels, and sequels.
  - Visual countdown/indicator for upcoming episode broadcasts.
- [ ] **Genre & Format Recommendation Engine:**
  - **Domain:** Extend domain models to include `genres` (Action, Romance, Sci-Fi, etc.) and explicit `format` classification (TV, Movie, OVA, Special, ONA).
  - **Infrastructure:** Parameterized AniList GraphQL queries to retrieve related/recommended series by genre and format.
  - **Domain Service:** Recommendation sorting algorithm prioritizing shows with a favorable **Timing Score** ("Ideal to watch now").
  - **UI:** Interactive carousel/section for "Similar shows worth watching right now".

---

## 🔮 Phase 4: Optimization & Advanced Features (Backlog)

- [ ] **Deployment & Release Pipeline Re-activation:**
  - Re-enable GitHub Actions deployment for GitHub Pages static output.
  - Re-configure automated tag-based GitHub Releases with changelog generation.
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
