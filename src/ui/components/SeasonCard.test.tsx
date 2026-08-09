import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeasonCard } from "./SeasonCard";
import { SEASON_CARD_ID } from "@/ui/constants/section-ids";
import { AnimeWork } from "@/core/domain/models/franchise-work";

function season(overrides: Partial<AnimeWork> = {}): AnimeWork {
  return {
    kind: "ANIME",
    id: 145064,
    title: {
      userPreferred: "Jujutsu Kaisen 2nd Season",
      english: null,
      romaji: null,
      native: null,
    },
    coverImage: "https://example.test/jjk2.jpg",
    format: "TV",
    startDate: { year: 2023, month: 7, day: 6 },
    endDate: { year: 2023, month: 12, day: 28 },
    episodes: 23,
    score: 86,
    status: "FINISHED",
    genres: [],
    description: null,
    nextAiringEpisode: null,
    ...overrides,
  };
}

const renderSeason = (work: AnimeWork) => render(<SeasonCard season={work} />);

const card = () => screen.getByRole("region", { name: "Viewing" });

describe("SeasonCard", () => {
  it("shows the selected season's own title, not the franchise's", () => {
    const work = season();

    renderSeason(work);

    expect(
      screen.getByRole("heading", { name: "Jujutsu Kaisen 2nd Season" }),
    ).toBeInTheDocument();
  });

  it("names itself as a landmark", () => {
    const work = season();

    renderSeason(work);

    expect(card()).toBeInTheDocument();
  });

  it("shows the episode count", () => {
    const work = season({ episodes: 23 });

    renderSeason(work);

    expect(screen.getByText("23 episodes")).toBeInTheDocument();
  });

  it("shows a singular episode label for a one-episode entry", () => {
    const work = season({ episodes: 1, format: "MOVIE" });

    renderSeason(work);

    expect(screen.getByText("1 episode")).toBeInTheDocument();
  });

  it("reports an unknown episode count rather than showing zero", () => {
    // An airing season usually has no final count yet.
    const work = season({ episodes: null, status: "ONGOING" });

    renderSeason(work);

    expect(screen.getByText("Episodes TBA")).toBeInTheDocument();
  });

  it("labels the score so it reads as the users' rating", () => {
    const work = season({ score: 86 });

    renderSeason(work);

    expect(screen.getByText("86%")).toBeInTheDocument();
    expect(screen.getByText("User score")).toBeInTheDocument();
  });

  it("omits the score entirely when the season has none", () => {
    const work = season({ score: null });

    renderSeason(work);

    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
    expect(screen.queryByText("User score")).not.toBeInTheDocument();
  });

  it("shows the full run of a finished entry, not just its start year", () => {
    const work = season({
      startDate: { year: 2023, month: 7, day: 6 },
      endDate: { year: 2023, month: 12, day: 28 },
    });

    renderSeason(work);

    expect(screen.getByText("Jul 2023 – Dec 2023")).toBeInTheDocument();
  });

  it("reads an entry with no end date as still running", () => {
    const work = season({
      startDate: { year: 2024, month: 10, day: 5 },
      endDate: null,
      status: "ONGOING",
    });

    renderSeason(work);

    expect(screen.getByText("Oct 2024 – present")).toBeInTheDocument();
  });

  it("announces an unknown release year", () => {
    const work = season({
      startDate: { year: null, month: null, day: null },
      endDate: null,
    });

    renderSeason(work);

    expect(screen.getByText("TBA")).toBeInTheDocument();
  });

  it("shows the entry's own synopsis", () => {
    const work = season({ description: "Yuuji swallows a cursed finger." });

    renderSeason(work);

    expect(
      screen.getByText("Yuuji swallows a cursed finger."),
    ).toBeInTheDocument();
  });

  it("renders no synopsis element when the entry has none", () => {
    const work = season({ description: null });

    renderSeason(work);

    expect(screen.queryByLabelText("Synopsis")).not.toBeInTheDocument();
  });

  it("counts down this entry's next episode", () => {
    const work = season({
      status: "ONGOING",
      nextAiringEpisode: {
        episode: 12,
        timeUntilAiringSeconds: 2 * 86400 + 3 * 3600,
        seasonTitle: "Jujutsu Kaisen 2nd Season",
      },
    });

    renderSeason(work);

    const countdown = screen.getByRole("status", { name: "Next episode" });
    expect(countdown).toHaveTextContent("Episode 12");
    expect(countdown).toHaveTextContent("2d 3h");
  });

  it("shows no countdown for an entry that is not airing", () => {
    const work = season({ nextAiringEpisode: null });

    renderSeason(work);

    expect(
      screen.queryByRole("status", { name: "Next episode" }),
    ).not.toBeInTheDocument();
  });

  it("announces the entry being viewed for assistive technology", () => {
    const work = season();

    renderSeason(work);

    expect(screen.getByRole("status", { name: "Now viewing" })).toHaveTextContent(
      "Jujutsu Kaisen 2nd Season",
    );
  });

  it("does not repeat the title in the cover art's alt text", () => {
    const work = season();

    renderSeason(work);

    expect(
      screen.queryByAltText("Jujutsu Kaisen 2nd Season"),
    ).not.toBeInTheDocument();
  });

  it("exposes an id the timeline can point aria-controls at", () => {
    const work = season();

    renderSeason(work);

    expect(card()).toHaveAttribute("id", SEASON_CARD_ID);
  });

  it("renders without a cover when the season has no art", () => {
    const work = season({ coverImage: "" });

    const { container } = renderSeason(work);

    expect(card()).toBeInTheDocument();
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });
});
