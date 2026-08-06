# Season Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the franchise chain as a horizontal strip in release order, with the entry the user selected highlighted in place.

**Architecture:** One presentational component, `FranchiseTimeline`, taking `timeline` and `selectedId`. No domain or infrastructure changes — `Franchise.timeline` and `Franchise.rootId` already exist and are already tested.

**Tech Stack:** React 19, Next.js 15, Tailwind CSS, Vitest + happy-dom + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-06-season-carousel-design.md`

## Global Constraints

- Node `>=22`. Run `nvm use` first.
- TypeScript strict. **Zero `any`** (`AGENTS.md`).
- **Conditional classNames use template literals**, matching `AnimeDetailCard.tsx`. `AGENTS.md` references a `cn()` helper at `src/lib/utils.ts` — **that file does not exist**. Do not import it and do not add `clsx`/`tailwind-merge`; `AGENTS.md` forbids introducing dependencies without an explicit request.
- Dark theme, matching existing components: `bg-gray-900`, `border-gray-800`, indigo accents (`indigo-500`/`indigo-400`/`indigo-300`).
- The component **must not sort**. Ordering is guaranteed by `buildTimeline` and covered by domain tests.
- **Accessibility is part of the deliverable, not a follow-up.** Every landmark and every entry carries an `aria-label`; selection is conveyed by `aria-current`, never by colour alone.
- **Tests query semantically** — by role and accessible name (`getByRole`, `getByAltText`), never by class, `data-testid`, or raw `getAttribute`. If an assertion cannot be expressed semantically, the component's accessibility is wrong: fix the component, not the query.
- **Tests follow Arrange–Act–Assert**, separated by blank lines. Do **not** label the phases with comments — a semantic test already reads as its own documentation, and `// Act` above a `renderTimeline(...)` call adds nothing.
- **Actions go through helpers** (`renderTimeline`, `entries`, `selectedEntries`), not repeated inline JSX, so each test reads as its intent rather than its plumbing.
- **Comment only what the code cannot say.** Real-world context earns a comment ("Next throws on an empty src"); restating the line below it does not.
- CI order: `lint` → `tsc --noEmit` → `test` → `build`.

## File Structure

**Created:**
- `src/components/FranchiseTimeline.tsx` — the strip
- `src/components/FranchiseTimeline.test.tsx` — RTL tests (first component test in the repo)

**Modified:**
- `src/app/page.tsx` — mounts the strip below `AnimeDetailCard`

---

### Task 1: The FranchiseTimeline component

**Files:**
- Create: `src/components/FranchiseTimeline.tsx`
- Test: `src/components/FranchiseTimeline.test.tsx`

**Interfaces:**
- Consumes: `AnimeWork` from `@/core/domain/models/franchise-work`
- Produces: `FranchiseTimeline({ timeline, selectedId }: { timeline: AnimeWork[]; selectedId: number })`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/FranchiseTimeline.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FranchiseTimeline } from "./FranchiseTimeline";
import { AnimeWork } from "@/core/domain/models/franchise-work";

function work(
  id: number,
  title: string,
  year: number | null,
  coverImage = `https://example.test/${id}.jpg`,
): AnimeWork {
  return {
    kind: "ANIME",
    id,
    title: { userPreferred: title, english: null, romaji: null, native: null },
    coverImage,
    format: "TV",
    startDate: { year, month: 4, day: 1 },
    endDate: null,
    episodes: 12,
    score: 80,
    status: "FINISHED",
    nextAiringEpisode: null,
  };
}

// --- action helpers -------------------------------------------------------
// Every test drives the component through these, so a test body reads as its
// intent rather than its plumbing.

const renderTimeline = (timeline: AnimeWork[], selectedId: number) =>
  render(<FranchiseTimeline timeline={timeline} selectedId={selectedId} />);

const strip = () => screen.queryByRole("region", { name: "Franchise timeline" });
const entries = () => screen.getAllByRole("listitem");
const selectedEntries = () =>
  screen.queryAllByRole("listitem", { current: true });

const seasons = [
  work(1, "Jujutsu Kaisen", 2020),
  work(2, "Jujutsu Kaisen 2nd Season", 2023),
  work(3, "Jujutsu Kaisen 3rd Season", 2026),
];

describe("FranchiseTimeline", () => {
  it("lists every entry in the order given", () => {
    const timeline = seasons;

    renderTimeline(timeline, 2);

    expect(entries()).toHaveLength(3);
    expect(entries()[0]).toHaveAccessibleName("1. Jujutsu Kaisen, 2020");
    expect(entries()[2]).toHaveAccessibleName(
      "3. Jujutsu Kaisen 3rd Season, 2026",
    );
  });

  it("marks the selected entry for assistive technology", () => {
    const selectedId = 2;

    renderTimeline(seasons, selectedId);

    expect(
      screen.getByRole("listitem", { current: true }),
    ).toHaveAccessibleName("2. Jujutsu Kaisen 2nd Season, 2023");
  });

  it("marks exactly one entry as selected", () => {
    const selectedId = 2;

    renderTimeline(seasons, selectedId);

    expect(selectedEntries()).toHaveLength(1);
  });

  it("names the strip so it can be found as a landmark", () => {
    const timeline = seasons;

    renderTimeline(timeline, 1);

    expect(strip()).toBeInTheDocument();
  });

  it("announces an unknown release date instead of leaving it blank", () => {
    // Real case: BORUTO: NARUTO NEXT GENERATIONS Part 2 has no announced date.
    const timeline = [...seasons, work(4, "Unannounced Season", null)];

    renderTimeline(timeline, 1);

    expect(
      screen.getByRole("listitem", {
        name: "4. Unannounced Season, release date to be announced",
      }),
    ).toBeInTheDocument();
  });

  it("renders an entry that has no cover art", () => {
    // Next throws on an empty src, so the image must be omitted entirely.
    const timeline = [...seasons, work(5, "No Art Yet", 2027, "")];

    renderTimeline(timeline, 1);

    expect(
      screen.getByRole("listitem", { name: "4. No Art Yet, 2027" }),
    ).toBeInTheDocument();
    expect(screen.queryByAltText("No Art Yet")).not.toBeInTheDocument();
    expect(screen.getByAltText("Jujutsu Kaisen")).toBeInTheDocument();
  });

  it("marks nothing when the selected id is absent from the timeline", () => {
    const absentId = 999;

    renderTimeline(seasons, absentId);

    expect(entries()).toHaveLength(3);
    expect(selectedEntries()).toHaveLength(0);
  });

  it("renders nothing for a single-entry franchise", () => {
    // One Piece and Death Note both have a timeline of one.
    const timeline = [work(1, "Death Note", 2006)];

    const { container } = renderTimeline(timeline, 1);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for an empty timeline", () => {
    const timeline: AnimeWork[] = [];

    const { container } = renderTimeline(timeline, 1);

    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- FranchiseTimeline`
Expected: FAIL — `Failed to resolve import "./FranchiseTimeline"`

- [ ] **Step 3: Write the component**

```tsx
// src/components/FranchiseTimeline.tsx
"use client";

import Image from "next/image";
import { AnimeWork } from "@/core/domain/models/franchise-work";

interface FranchiseTimelineProps {
  /** The franchise chain, already in release order. */
  timeline: AnimeWork[];
  /** The entry the user selected — highlighted in place. */
  selectedId: number;
}

/** Without this a card reads as three fragments: "1", "Jujutsu Kaisen", "2020". */
function entryLabel(work: AnimeWork, position: number): string {
  const releasedOn =
    work.startDate.year === null
      ? "release date to be announced"
      : String(work.startDate.year);

  return `${position}. ${work.title.userPreferred}, ${releasedOn}`;
}

/**
 * The franchise as a horizontal strip in release order, with the entry the
 * user picked marked in place.
 *
 * Entries keep their release position: moving the selection to the front
 * would destroy the ordering this component exists to show. It also never
 * sorts — `buildTimeline` already guarantees the order, and re-sorting here
 * would duplicate that logic in the wrong layer.
 */
export function FranchiseTimeline({
  timeline,
  selectedId,
}: FranchiseTimelineProps) {
  // A strip of one is noise. One Piece and Death Note land here: both are
  // single continuous series whose franchise lives in `related` instead.
  if (timeline.length < 2) return null;

  return (
    <section aria-label="Franchise timeline" className="space-y-3">
      <h3 className="text-xs uppercase tracking-wider font-bold text-gray-400">
        Watch order
      </h3>

      <ol className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory">
        {timeline.map((work, index) => {
          const isSelected = work.id === selectedId;

          return (
            <li
              key={work.id}
              aria-label={entryLabel(work, index + 1)}
              aria-current={isSelected ? "true" : undefined}
              className={`flex-shrink-0 w-32 snap-start rounded-2xl border p-2 space-y-2 transition-colors ${
                isSelected
                  ? "bg-indigo-500/10 border-indigo-500/50"
                  : "bg-gray-900 border-gray-800"
              }`}
            >
              <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-800">
                {work.coverImage && (
                  <Image
                    src={work.coverImage}
                    alt={work.title.userPreferred}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                )}
                <span
                  aria-hidden="true"
                  className="absolute top-1 left-1 bg-gray-950/80 text-gray-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                >
                  {index + 1}
                </span>
              </div>

              <p
                className={`text-xs font-semibold leading-tight line-clamp-2 ${
                  isSelected ? "text-indigo-300" : "text-gray-300"
                }`}
                title={work.title.userPreferred}
              >
                {work.title.userPreferred}
              </p>

              <p className="text-[10px] text-gray-500 font-medium">
                {work.startDate.year ?? "TBA"}
              </p>

              {isSelected && (
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-400">
                  You picked this
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- FranchiseTimeline`
Expected: PASS, 9 tests

If the "no cover art" test fails because `getAllByRole("img")` finds nothing, that means every entry lacked art — check the fixture, not the component.

- [ ] **Step 5: Commit**

```bash
git add src/components/FranchiseTimeline.tsx src/components/FranchiseTimeline.test.tsx
git commit -m "feat: franchise timeline strip with the selected entry highlighted"
```

---

### Task 2: Mount it on the page

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `FranchiseTimeline` (Task 1), `franchise.timeline` / `franchise.rootId`

- [ ] **Step 1: Add the import**

In `src/app/page.tsx`, alongside the existing component imports:

```tsx
import { FranchiseTimeline } from "@/components/FranchiseTimeline";
```

- [ ] **Step 2: Render it below the detail card**

The detail section currently wraps `AnimeDetailCard` and the incomplete-franchise warning. Add the strip between them, so the Timing Score stays the first thing read and the warning stays last:

```tsx
{!isFetchingDetail && franchise && score && (
  <section
    aria-label="Anime detail card"
    className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6"
  >
    <AnimeDetailCard franchise={franchise} watchingScore={score} />

    <FranchiseTimeline
      timeline={franchise.timeline}
      selectedId={franchise.rootId}
    />

    {!franchise.isComplete && (
      <p className="text-center text-xs text-amber-400/80">
        Some entries could not be loaded ({franchise.unresolvedIds.length}{" "}
        missing).
      </p>
    )}
  </section>
)}
```

Note the wrapper's spacing changes from `space-y-4` to `space-y-6` to give the strip room.

- [ ] **Step 3: Run the full CI sequence**

Run: `npm run lint && npx tsc --noEmit && npm run test && npm run build`
Expected: all four PASS.

- [ ] **Step 4: See it working**

Run: `npm run dev`, then in the browser:

1. Search **"Jujutsu Kaisen"** and select **2nd Season**.
   Expected: the strip shows Season 1 first, with 2nd Season marked "You picked this" — highlighted *without* being moved to the front.
2. Search **"Fate/Zero"** and select it.
   Expected: `Fate/stay night (2006)` sits first and Fate/Zero (2011) is marked. This is the case that motivated the whole design.
3. Search **"Death Note"** and select it.
   Expected: **no strip at all** — its timeline has one entry. The detail card still renders normally.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: show the franchise timeline on the detail view"
```

---

## Self-Review

**Spec coverage:** Component and props → Task 1. Rendering rules, including `<2` entries, `TBA`, missing cover, and absent `selectedId` → Task 1 tests and implementation. Accessibility (`<ol>`, `aria-current`, `aria-label`) → Task 1. Placement → Task 2. Interaction (none) → satisfied by omission; no handlers exist. Testing approach → Task 1. No gaps.

**Placeholder scan:** No TBD/TODO. Every step contains the code it needs. `"TBA"` is UI copy, not a placeholder.

**Type consistency:** `FranchiseTimelineProps` uses `timeline: AnimeWork[]` and `selectedId: number`, matching the call site in Task 2 (`franchise.timeline`, `franchise.rootId` — typed `AnimeWork[]` and `number` in `Franchise`). The test helper builds a complete `AnimeWork`: no `relations` field, which was removed from the model during the previous plan.

**Note on scope:** this plan touches no domain, port, adapter, or scoring code. If a step seems to require changing any of those, stop — the spec is wrong, not the code.
