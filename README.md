# ⏱️ AniTime

> **Find out if it's the right moment to start an anime or if you should wait.**

## AniTime is a lightweight, real-time web application built with **Next.js** and deployed on **GitHub Pages**. It queries the **AniList GraphQL API** to help users instantly determine whether an anime is finished, in hiatus, airing, or expecting a new season soon.

## 💡 The Problem & Core Concept

When starting a new anime, viewers often ask:

- _"Is it completed, or will I be left hanging on a cliffhanger for 3 years?"_
- _"Is a new season coming up soon so I can catch up just in time?"_
- _"Should I wait for the upcoming movie before starting?"_

**AniTime** answers this instantly with a single search.

---

## 🎯 Features

- 🔍 **Real-Time Autocomplete Search:** Triggers after typing 3 characters. Searches by English, Romaji, and Spanish titles.
- ⚡ **Top 5 Live Suggestions:** Displays cover art, title, release year, and official AniList score.
- ⏳ **Custom Loading Experience:** Smooth loading state while fetching detailed relations and season graphs.
- 📊 **Smart Verdict Score:** Evaluates the state of the anime and gives a clear recommendation:
  - 🟢 `Good time to watch!`
  - 🟡 `Wait a little bit`
  - 🟠 `Watch it if you can't wait`
  - 🔴 `Hmmm not a good time`
- 📈 **Anime Metadata Breakdown:**
  - Official AniList Community Score
  - Total Seasons & Episodes
  - Estimated Total Watch Time (hours)
  - Genres & Format
  - _(Planned)_ Recommended finished similar anime

---

## 🛠️ Tech Stack

- **Framework:** Next.js (Static Export mode)
- **Library:** React 19
- **API:** AniList GraphQL API (`https://graphql.anilist.co`)
- **Testing:** React Testing Library (RTL) + Mock Service Worker (MSW)
- **Deployment:** GitHub Pages (via GitHub Actions)
- **Default UI Language:** English _(Spanish localization planned for V2)_

---

## 🗺️ Project Roadmap

### Phase 1: Setup & Core Architecture 🏗️

- [ ] Initialize Next.js project with TypeScript / Tailwind CSS.
- [ ] Configure `next.config.js` for GitHub Pages (`output: 'export'`, `images: { unoptimized: true }`).
- [ ] Set up `.nojekyll` pipeline for GitHub Actions static deployment.
- [ ] Create basic app layout (Header with "AniTime" title, description, and search bar).

### Phase 2: Search & Live Autocomplete 🔍

- [ ] Implement debounced search input (350ms delay, minimum 3 characters).
- [ ] Connect AniList GraphQL `Page` search query.
- [ ] Render Top 5 suggestion dropdown with thumbnail, title, year, and AniList score.
- [ ] Manage click-outside and keyboard navigation for the dropdown.

### Phase 3: Detail Fetching & Verdict Logic 🧠

- [ ] Design and build custom loading animation state.
- [ ] Implement AniList GraphQL detailed `Media` query (fetching `relations`, `nextAiringEpisode`, `status`).
- [ ] Build the decision engine (`getTimingAssessment`) to calculate verdicts and explanatory texts.
- [ ] Render verdict badge, watch time calculator, and metadata card.

### Phase 4: Integration Testing & QA 🧪

- [ ] Set up MSW (Mock Service Worker) to mock AniList GraphQL requests.
- [ ] Write RTL integration tests covering:
  - Debounce behavior (<3 characters does not trigger API).
  - Autocomplete list rendering with 5 items + scores.
  - Loading state transition on item click.
  - Correct rendering of verdict cards based on API mocks.

### Phase 5: Deployment & Polish 🚀

- [ ] Configure `.github/workflows/deploy.yml` for automated GitHub Pages deployment.
- [ ] Perform UI responsive design checks (Mobile / Desktop).
- [ ] Implement i18n support (Spanish language toggle).
- [ ] _(Optional)_ Add "Similar Finished Animes" section.

---

## 🧠 Verdict Logic Matrix

| Status / Condition                         | Verdict                           | Summary Explanation                                                             |
| :----------------------------------------- | :-------------------------------- | :------------------------------------------------------------------------------ |
| `FINISHED` + No upcoming sequels           | 🟢 **Good time to watch!**        | Complete story available. Perfect for binge-watching without waiting.           |
| Sequel/Movie `NOT_YET_RELEASED` (<90 days) | 🟡 **Wait a little bit**          | A new season is right around the corner! Catch up now or wait for the premiere. |
| `RELEASING` or >100 episodes active        | 🟠 **Watch it if you can't wait** | Currently airing or very long. Great if you enjoy weekly community discussions. |
| `HIATUS`, `CANCELLED`, or dormant (>3 yrs) | 🔴 **Hmmm not a good time**       | High risk of remaining incomplete or paused indefinitely.                       |

---

## 🧪 Integration Testing Strategy

All user interactions are tested using **React Testing Library** and **MSW**:

```bash
# Run integration tests
npm test
```
