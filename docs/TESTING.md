# 🧪 AniTime Testing Guide

AniTime uses **Vitest** as the test runner with **React Testing Library** and **MSW** (Mock Service Worker) for API interception.

---

## 🛠️ Tooling Stack

| Tool                      | Purpose                                                 |
| :------------------------ | :------------------------------------------------------ |
| **Vitest**                | Fast test runner (Vite-based)                           |
| **React Testing Library** | Render components & query them like a user              |
| **user-event**            | Simulate real user interactions (typing, clicking)      |
| **MSW**                   | Intercept `https://graphql.anilist.co` network requests |
| **happy-dom**             | Lightweight DOM environment for component tests         |
| **jest-dom**              | Custom matchers (`toBeInTheDocument`, etc.)             |

---

## 🚀 Running Tests

```bash
# Single run (CI)
npm run test

# Watch mode (development)
npm run test:watch
```

---

## 📁 Test Layout

| Path                                              | Coverage                                      |
| :------------------------------------------------ | :-------------------------------------------- |
| `src/core/domain/services/evaluate-score.test.ts` | Unit tests for the scoring engine             |
| `src/app/__tests__/search-flow.test.tsx`          | Integration tests (search → detail → score)   |
| `src/app/__tests__/fixtures/*.ts`                 | Typed `Anime` fixtures modeled on real series |
| `src/mocks/handlers.ts`                           | MSW request handlers for the AniList endpoint |
| `src/mocks/server.ts`                             | MSW server instance (`setupServer`)           |
| `src/test/setup.ts`                               | Global lifecycle: start/stop MSW server       |
| `vitest.setup.tsx`                                | Mocks `next/image` → native `<img>`           |

---

## 🔌 Global Setup

### `src/test/setup.ts`

Wires the MSW server to the test lifecycle:

```ts
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- `onUnhandledRequest: "error"` → any unmocked API call **fails the test**.
- Handlers reset between tests via `server.resetHandlers()`.

### `vitest.setup.tsx`

Mocks `next/image` because the Next.js Image component is not compatible with the test DOM. It renders a plain `<img>` and strips `fill` / `sizes` / `priority` props.

---

## 📡 MSW Mocking the AniList API

`src/mocks/handlers.ts` intercepts `POST https://graphql.anilist.co` and branches on the GraphQL operation:

| Request contains                             | Mocked response                                     |
| :------------------------------------------- | :-------------------------------------------------- |
| `variables.id` or `query.includes("Media(")` | A full `Media` detail object (One Piece, ID 1)      |
| otherwise (search)                           | A `Page.media` array with a single One Piece result |

This lets the **entire integration flow** (debounced search → dropdown → detail fetch → score render) run without network access.

---

## 🧩 Test Fixtures

Fixtures live in `src/app/__tests__/fixtures/` and are fully-typed `Anime` objects representing **real series**:

| Fixture           | Series                                | Scenario covered                                  |
| :---------------- | :------------------------------------ | :------------------------------------------------ |
| `gintama.ts`      | Gintama (2006–2010, 201 eps)          | Finished franchise → `PERFECT_TIME` (100)         |
| `frieren.ts`      | Sousou no Frieren (2023–2024, 28 eps) | Finished season, ongoing story → `GOOD_TIME` (85) |
| `one-piece.ts`    | One Piece (1999–present)              | Mega-series releasing → `PERFECT_TIME` (95)       |
| `sacred-seven.ts` | Sacred Seven (2011)                   | Production limbo → `RISK_INCOMPLETE` (40)         |

---

## ✅ Unit Tests — `evaluate-score.test.ts`

Tests the pure function directly with fixtures — **no rendering, no network**.

```ts
it("should evaluate Gintama as PERFECT_TIME (100) because the entire franchise is completed", () => {
  const result = evaluateWatchingScore(gintamaScenario);
  expect(result.score).toBe(100);
  expect(result.level).toBe("PERFECT_TIME");
  expect(result.badgeText).toBe("Completed Story!");
});
```

Current scenarios asserted:

1. **Gintama** → `PERFECT_TIME`, score 100, "Completed Story!"
2. **Frieren** → `GOOD_TIME`, score 85, "Season Complete"
3. **One Piece** → `PERFECT_TIME`, score 95, "Great Backlog!"
4. **Sacred Seven** → `RISK_INCOMPLETE`, score 40, "Production Limbo"

---

## 🧑‍💻 Integration Tests — `search-flow.test.tsx`

Simulates the full user journey against the real `Page` component:

```tsx
it("allows the user to type into the search input and renders the anime result", async () => {
  const user = userEvent.setup();
  render(<Page />);
  const input = screen.getByLabelText("Search anime textfield");
  await user.type(input, "One Piece");
  expect(await screen.findByLabelText("Anime title")).toHaveTextContent(
    "One Piece",
  );
});
```

Second test clicks the result dropdown item and asserts the detail card + Timing Score badge appear.

> ⚠️ **Note:** The MSW mock returns One Piece with **1000 episodes**, which triggers the **mega-series** branch (`PERFECT_TIME` / "Great Backlog!"). The detail test currently asserts the weekly-release text (`/Watch it if you can't wait/i`), which does **not** match the mocked mega-series data — this test is currently failing and needs its assertion updated to match the mock (e.g., "Great Backlog!").

---

## 🔎 Query Strategies Used

| Element       | Query                                                        |
| :------------ | :----------------------------------------------------------- |
| Search input  | `getByLabelText("Search anime textfield")`                   |
| Result title  | `findByLabelText("Anime title")`                             |
| Result button | `findByRole("button", { name: "<title> selection button" })` |
| Detail card   | `findByLabelText("Anime detail card")`                       |
| Score badge   | `findByText(/regex/i)`                                       |

Accessible `aria-label`s are defined in `SearchBar.tsx` and `AnimeDetailCard.tsx`.

---

## 🧠 Best Practices for This Repo

1. **Add fixtures, not inline objects** — reuse the typed fixtures for domain logic tests.
2. **Test behavior, not implementation** — query by role/label/text, avoid `container.querySelector`.
3. **Keep MSW handlers updated** whenever `queries.ts` changes (new fields must exist in mocks).
4. **Use `findBy*` for async** (debounced search, fetch resolution).
5. **Zero `any`** — mocks/DTOs must be typed (see `src/mocks/handlers.ts` eslint-disable usage).
