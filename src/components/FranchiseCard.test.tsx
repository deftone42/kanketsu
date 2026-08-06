import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FranchiseCard } from "./FranchiseCard";
import { FranchiseSummary } from "@/core/domain/models/franchise";
import { TimingScore } from "@/core/domain/models/score";

function summary(overrides: Partial<FranchiseSummary> = {}): FranchiseSummary {
  return {
    startYear: 2013,
    endYear: 2023,
    totalEpisodes: 101,
    averageScore: 85,
    status: "FINISHED",
    nextAiringEpisode: null,
    sourceStatus: "FINISHED",
    ...overrides,
  };
}

function timingScore(overrides: Partial<TimingScore> = {}): TimingScore {
  return {
    score: 85,
    level: "PERFECT_TIME",
    badgeText: "Completed Story",
    summary: "Available to watch in full.",
    details: "All episodes and movies are released.",
    ...overrides,
  };
}

const renderFranchise = (
  name: string,
  franchiseSummary: FranchiseSummary,
  score: TimingScore,
  seasonCount = 8,
  movieCount = 4,
) =>
  render(
    <FranchiseCard
      name={name}
      summary={franchiseSummary}
      watchingScore={score}
      seasonCount={seasonCount}
      movieCount={movieCount}
    />,
  );

const card = () => screen.getByRole("region", { name: "Franchise summary" });

describe("FranchiseCard", () => {
  it("names itself as a landmark", () => {
    renderFranchise("Shingeki no Kyojin", summary(), timingScore());

    expect(card()).toBeInTheDocument();
  });

  it("shows the franchise name", () => {
    renderFranchise("Shingeki no Kyojin", summary(), timingScore());

    expect(
      screen.getByRole("heading", { name: "Shingeki no Kyojin" }),
    ).toBeInTheDocument();
  });

  it("shows the total episode count across the franchise", () => {
    renderFranchise("Franchise", summary({ totalEpisodes: 101 }), timingScore());

    expect(screen.getByText("101 episodes")).toBeInTheDocument();
  });

  it("reports an unknown total rather than showing zero", () => {
    renderFranchise("Franchise", summary({ totalEpisodes: 0 }), timingScore());

    expect(screen.getByText("Episodes TBA")).toBeInTheDocument();
  });

  it("shows the year range", () => {
    renderFranchise(
      "Franchise",
      summary({ startYear: 2013, endYear: 2023 }),
      timingScore(),
    );

    expect(screen.getByText("2013 – 2023")).toBeInTheDocument();
  });

  it("shows a single year when the franchise started and ended the same year", () => {
    renderFranchise(
      "Franchise",
      summary({ startYear: 2006, endYear: 2006 }),
      timingScore(),
    );

    expect(screen.getByText("2006")).toBeInTheDocument();
  });

  it("shows an open-ended range while the franchise is still running", () => {
    renderFranchise(
      "Franchise",
      summary({ startYear: 1999, endYear: null, status: "ONGOING" }),
      timingScore(),
    );

    expect(screen.getByText("1999 – present")).toBeInTheDocument();
  });

  it("counts seasons and movies", () => {
    renderFranchise("Franchise", summary(), timingScore(), 8, 4);

    expect(screen.getByText("8 seasons")).toBeInTheDocument();
    expect(screen.getByText("4 movies")).toBeInTheDocument();
  });

  it("omits the movie count when the franchise has none", () => {
    renderFranchise("Franchise", summary(), timingScore(), 3, 0);

    expect(screen.queryByText(/^\d+ movies?$/)).not.toBeInTheDocument();
    expect(screen.getByText("3 seasons")).toBeInTheDocument();
  });

  it("reports that the source work has finished", () => {
    renderFranchise(
      "Franchise",
      summary({ sourceStatus: "FINISHED" }),
      timingScore(),
    );

    expect(screen.getByText("Source finished")).toBeInTheDocument();
  });

  it("reports that the source work is still running", () => {
    renderFranchise(
      "Franchise",
      summary({ sourceStatus: "ONGOING" }),
      timingScore(),
    );

    expect(screen.getByText("Source ongoing")).toBeInTheDocument();
  });

  it("says nothing about the source when there is none", () => {
    renderFranchise(
      "Franchise",
      summary({ sourceStatus: "UNKNOWN" }),
      timingScore(),
    );

    expect(screen.queryByText(/^Source /)).not.toBeInTheDocument();
  });

  it("shows the timing score verdict", () => {
    renderFranchise(
      "Franchise",
      summary(),
      timingScore({
        score: 92,
        badgeText: "Hype Window Active!",
        summary: "Season 2 premieres in 12 days!",
      }),
    );

    expect(screen.getByText("92")).toBeInTheDocument();
    expect(screen.getByText("Hype Window Active!")).toBeInTheDocument();
    expect(screen.getByText("Season 2 premieres in 12 days!")).toBeInTheDocument();
  });

  it("announces the next airing episode when one is scheduled", () => {
    renderFranchise(
      "Franchise",
      summary({
        nextAiringEpisode: {
          episode: 12,
          timeUntilAiringSeconds: 3 * 86_400,
          seasonTitle: "Final Season",
        },
      }),
      timingScore(),
    );

    expect(
      screen.getByRole("status", { name: "Next episode" }),
    ).toHaveTextContent("Final Season");
  });

  it("shows no airing banner when nothing is scheduled", () => {
    renderFranchise("Franchise", summary({ nextAiringEpisode: null }), timingScore());

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
