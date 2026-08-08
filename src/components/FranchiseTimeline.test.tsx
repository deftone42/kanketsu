import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FranchiseTimeline } from "./FranchiseTimeline";
import { SEASON_CARD_ID } from "./SeasonCard";
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
    genres: [],
    description: null,
    nextAiringEpisode: null,
  };
}

const renderTimeline = (
  timeline: AnimeWork[],
  selectedId: number,
  onSelectEntry: (id: number) => void = () => {},
) =>
  render(
    <FranchiseTimeline
      timeline={timeline}
      selectedId={selectedId}
      onSelectEntry={onSelectEntry}
    />,
  );

const strip = () => screen.queryByRole("region", { name: "Series timeline" });
const entries = () => screen.getAllByRole("button");
const selectedEntries = () => screen.queryAllByRole("button", { current: true });

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

    expect(screen.getByRole("button", { current: true })).toHaveAccessibleName(
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
      screen.getByRole("button", {
        name: "4. Unannounced Season, release date to be announced",
      }),
    ).toBeInTheDocument();
  });

  it("renders an entry that has no cover art", () => {
    // Next throws on an empty src, so the image must be omitted entirely.
    const timeline = [...seasons, work(5, "No Art Yet", 2027, "")];

    const { container } = renderTimeline(timeline, 1);

    expect(
      screen.getByRole("button", { name: "4. No Art Yet, 2027" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(3);
  });

  it("marks nothing when the selected id is absent from the timeline", () => {
    const absentId = 999;

    renderTimeline(seasons, absentId);

    expect(entries()).toHaveLength(3);
    expect(selectedEntries()).toHaveLength(0);
  });

  it("opens the entry the user clicks", async () => {
    const user = userEvent.setup();
    const onSelectEntry = vi.fn();

    renderTimeline(seasons, 1, onSelectEntry);
    await user.click(
      screen.getByRole("button", {
        name: "3. Jujutsu Kaisen 3rd Season, 2026",
      }),
    );

    expect(onSelectEntry).toHaveBeenCalledWith(3);
  });

  it("is operable by keyboard", async () => {
    const user = userEvent.setup();
    const onSelectEntry = vi.fn();

    renderTimeline(seasons, 1, onSelectEntry);
    await user.tab();
    await user.keyboard("{Enter}");

    expect(onSelectEntry).toHaveBeenCalledWith(1);
  });

  it("still reports a click on the entry already being viewed", async () => {
    const user = userEvent.setup();
    const onSelectEntry = vi.fn();

    renderTimeline(seasons, 2, onSelectEntry);
    await user.click(
      screen.getByRole("button", {
        name: "2. Jujutsu Kaisen 2nd Season, 2023",
      }),
    );

    expect(onSelectEntry).toHaveBeenCalledWith(2);
  });

  it("points each entry at the card it updates", () => {
    renderTimeline(seasons, 1);

    expect(entries()[0]).toHaveAttribute("aria-controls", SEASON_CARD_ID);
  });

  it("never calls back for a franchise with no strip", () => {
    const onSelectEntry = vi.fn();

    renderTimeline([work(1, "Death Note", 2006)], 1, onSelectEntry);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(onSelectEntry).not.toHaveBeenCalled();
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
