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

const renderTimeline = (timeline: AnimeWork[], selectedId: number) =>
  render(<FranchiseTimeline timeline={timeline} selectedId={selectedId} />);

const strip = () => screen.queryByRole("region", { name: "Series timeline" });
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

    expect(screen.getByRole("listitem", { current: true })).toHaveAccessibleName(
      "2. Jujutsu Kaisen 2nd Season, 2023",
    );
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
