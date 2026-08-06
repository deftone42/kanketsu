import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeasonCard } from "./SeasonCard";
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
    nextAiringEpisode: null,
    ...overrides,
  };
}

const renderSeason = (work: AnimeWork) => render(<SeasonCard season={work} />);

const card = () => screen.getByRole("region", { name: "Selected season" });

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

  it("shows the score when the season has one", () => {
    const work = season({ score: 86 });

    renderSeason(work);

    expect(screen.getByText("86%")).toBeInTheDocument();
  });

  it("omits the score when the season has none", () => {
    const work = season({ score: null });

    renderSeason(work);

    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it("shows the release year", () => {
    const work = season({ startDate: { year: 2023, month: 7, day: 6 } });

    renderSeason(work);

    expect(screen.getByText("2023")).toBeInTheDocument();
  });

  it("announces an unknown release year", () => {
    const work = season({ startDate: { year: null, month: null, day: null } });

    renderSeason(work);

    expect(screen.getByText("TBA")).toBeInTheDocument();
  });

  it("renders the cover with the season title as its alt text", () => {
    const work = season();

    renderSeason(work);

    expect(
      screen.getByAltText("Jujutsu Kaisen 2nd Season"),
    ).toBeInTheDocument();
  });

  it("renders without a cover when the season has no art", () => {
    const work = season({ coverImage: "" });

    renderSeason(work);

    expect(card()).toBeInTheDocument();
    expect(
      screen.queryByAltText("Jujutsu Kaisen 2nd Season"),
    ).not.toBeInTheDocument();
  });
});
