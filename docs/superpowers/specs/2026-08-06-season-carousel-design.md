# Season Carousel — Design

**Date:** 2026-08-06
**Status:** Approved for planning
**Follows:** `2026-08-06-franchise-domain-model-design.md` (merged as PR #3)

## Problem

The franchise domain model landed, but nothing renders it. `AnimeDetailCard` shows franchise-level aggregates — total episodes, averaged score, status — and the franchise head's title and cover. A user who searched *Jujutsu Kaisen 2nd Season* sees a card about Jujutsu Kaisen and no indication of which entry they picked or where the series starts.

`Franchise.timeline` (the PREQUEL/SEQUEL chain in release order) and `Franchise.rootId` (the entry the user selected) exist precisely to answer that, and are currently unused by the UI.

## Scope

**In:** a horizontal strip showing `timeline` in release order with `rootId` highlighted in place.

**Out:** `related` (movies, OVAs, specials, spin-offs) and `sources` (manga/novels). Both are collected and available; their presentation is a separate roadmap item. This spec covers main series only.

## Why no "face" entry, and why the strip earns its place

An earlier design tried to collapse a franchise into one representative entry. It fails on real data: Jujutsu Kaisen S2 is a *season* of one continuous work, while Fate/Zero is a *standalone work* in a shared universe, and no single rule serves both.

The strip dissolves the problem. Showing the selected entry **and** its position in the chain means the app never has to decide which entry "is" the franchise. A user who searched Fate/Zero sees Fate/Zero highlighted and Fate/stay night (2006) sitting first — information they likely did not have.

## Component

`src/components/FranchiseTimeline.tsx`, presentational and pure:

```tsx
interface FranchiseTimelineProps {
  /** The franchise chain, already in release order. */
  timeline: AnimeWork[];
  /** The entry the user selected — highlighted in place. */
  selectedId: number;
}
```

It takes two values rather than the whole `Franchise` so tests can build input as an array literal instead of constructing a node/edge graph.

`src/app/page.tsx` mounts it directly below `AnimeDetailCard`:

```tsx
<FranchiseTimeline timeline={franchise.timeline} selectedId={franchise.rootId} />
```

**The component does not sort.** Ordering is guaranteed by `buildTimeline` via `comparePartialDates` and is covered by domain tests. Re-sorting in the UI would duplicate that logic in the wrong layer and let the two drift.

## Rendering rules

| Condition | Behaviour |
|---|---|
| `timeline.length < 2` | Render nothing. A strip of one is noise. |
| `timeline.length >= 2` | Horizontal scroll strip, snap-aligned, fixed-width cards (~128px). |
| Card is `selectedId` | Indigo border and title, plus a "You picked this" label. Stays in release position. |
| `startDate.year === null` | Show `TBA`. Real case: *BORUTO: NARUTO NEXT GENERATIONS Part 2* has no announced date. |
| `coverImage === ""` | Render the grey placeholder box with no `<Image>`. Next throws on an empty `src`, and unannounced entries genuinely lack art. |
| `selectedId` not in `timeline` | Render the strip with nothing marked. `buildTimeline` always seeds the timeline with `rootId`, so this should not occur — but the component must not crash or mark an arbitrary entry if it ever does. |

Each card shows: cover, order index, title clamped to two lines, and release year.

Horizontal rather than vertical: Attack on Titan has 8 timeline entries and Monogatari 12. A vertical list of 12 rows would push the Timing Score — the app's actual answer — off screen.

**The selected entry is never moved to the front.** Release ordering is the information the strip exists to convey; reordering it would destroy that.

### Franchises this does not serve

Measured against the live API:

| Franchise | `timeline` | `related` |
|---|---|---|
| Attack on Titan | 8 | 24 |
| Jujutsu Kaisen S2 | 7 | 2 |
| One Piece | **1** | **108** |
| Death Note | **1** | 3 |

One Piece and Death Note render no strip. This is correct — One Piece is a single continuous series with no PREQUEL/SEQUEL edges to other series — but it means two very popular franchises show nothing here. Their content lives entirely in `related`, which the "Extra franchise information" roadmap item covers.

## Accessibility

An ordered list (`<ol>`/`<li>`), not a row of `<div>`s: the ordering *is* the content, and in a semantic list it survives for screen readers. The selected entry carries `aria-current="true"`, so the highlight is not conveyed by colour alone. The strip is wrapped in a `<section aria-label="Franchise timeline">`.

## Interaction

**Cards are not interactive.** The Timing Score is franchise-level, so selecting a different entry would not change the verdict — it would only move the highlight, at the cost of re-collecting the same franchise (3–10 requests).

Clicking becomes meaningful once a per-entry detail view exists (episodes, score, dates for a single season). That is tracked on the roadmap; until then, non-interactive is the honest design.

## Testing

React Testing Library against literal arrays — no network, no MSW, no repository. `vitest.setup.tsx` already mocks `next/image` to a plain `<img>`.

| Case | Pins |
|---|---|
| Three entries | All rendered, in the order given |
| Selected entry | Exactly one `aria-current="true"`, on the right entry |
| Years | Each entry's release year is visible |
| Missing year | Renders `TBA` rather than `null` or blank |
| Missing cover | Entry still renders, no `<Image>` with empty `src` |
| Single entry | Renders nothing |
| Empty timeline | Renders nothing |

`@testing-library/react` is already a devDependency — knip flagged it as unused during the Task 9 sweep and it was deliberately kept for this work.

## Out of scope

- `related` and `sources` presentation.
- Per-entry detail view.
- Any change to the domain model, collector, or scoring — this is a UI-only change.
