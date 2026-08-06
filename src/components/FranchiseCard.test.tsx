import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FranchiseCard } from "./FranchiseCard";
import { FranchiseSummary } from "@/core/domain/models/franchise";

function summary(overrides: Partial<FranchiseSummary> = {}): FranchiseSummary {
  return {
    startYear: 2013,
    endYear: 2023,
    totalEpisodes: 101,
    averageScore: 85,
    status: "FINISHED",
    nextAiringEpisode: null,
    sourceStatus: "FINISHED",
    sourceFormat: "MANGA",
    ...overrides,
  };
}

const renderFranchise = (
  name: string,
  franchiseSummary: FranchiseSummary,
  seasonCount = 8,
  movieCount = 4,
) =>
  render(
    <FranchiseCard
      name={name}
      summary={franchiseSummary}
      seasonCount={seasonCount}
      movieCount={movieCount}
    />,
  );

const card = () => screen.getByRole("region", { name: "Series summary" });

describe("FranchiseCard", () => {
  it("names itself as a landmark", () => {
    renderFranchise("Shingeki no Kyojin", summary());

    expect(card()).toBeInTheDocument();
  });

  it("shows the franchise name", () => {
    renderFranchise("Shingeki no Kyojin", summary());

    expect(
      screen.getByRole("heading", { name: "Shingeki no Kyojin" }),
    ).toBeInTheDocument();
  });

  it("shows the total episode count across the franchise", () => {
    renderFranchise("Franchise", summary({ totalEpisodes: 101 }));

    expect(screen.getByText("101 episodes")).toBeInTheDocument();
  });

  it("reports an unknown total rather than showing zero", () => {
    renderFranchise("Franchise", summary({ totalEpisodes: 0 }));

    expect(screen.getByText("Episodes TBA")).toBeInTheDocument();
  });

  it("shows the year range", () => {
    renderFranchise(
      "Franchise",
      summary({ startYear: 2013, endYear: 2023 }),
    );

    expect(screen.getByText("2013 – 2023")).toBeInTheDocument();
  });

  it("shows a single year when the franchise started and ended the same year", () => {
    renderFranchise(
      "Franchise",
      summary({ startYear: 2006, endYear: 2006 }),
    );

    expect(screen.getByText("2006")).toBeInTheDocument();
  });

  it("shows an open-ended range while the franchise is still running", () => {
    renderFranchise(
      "Franchise",
      summary({ startYear: 1999, endYear: null, status: "ONGOING" }),
    );

    expect(screen.getByText("1999 – present")).toBeInTheDocument();
  });

  it("counts seasons and movies", () => {
    renderFranchise("Franchise", summary(), 8, 4);

    expect(screen.getByText("8 seasons")).toBeInTheDocument();
    expect(screen.getByText("4 movies")).toBeInTheDocument();
  });

  it("omits the movie count when the franchise has none", () => {
    renderFranchise("Franchise", summary(), 3, 0);

    expect(screen.queryByText(/^\d+ movies?$/)).not.toBeInTheDocument();
    expect(screen.getByText("3 seasons")).toBeInTheDocument();
  });

  it("names the source by its format when the manga has finished", () => {
    renderFranchise(
      "Series",
      summary({ sourceStatus: "FINISHED", sourceFormat: "MANGA" }),
    );

    expect(screen.getByText("Manga finished")).toBeInTheDocument();
  });

  it("names a light novel source rather than calling it a manga", () => {
    renderFranchise(
      "Series",
      summary({ sourceStatus: "ONGOING", sourceFormat: "NOVEL" }),
    );

    expect(screen.getByText("Novel ongoing")).toBeInTheDocument();
  });

  it("says nothing about the source when the series is an original work", () => {
    renderFranchise(
      "Series",
      summary({ sourceStatus: "UNKNOWN", sourceFormat: null }),
    );

    expect(
      screen.queryByText(/^(Manga|Novel|One-shot|Source) /),
    ).not.toBeInTheDocument();
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
    );

    expect(
      screen.getByRole("status", { name: "Next episode" }),
    ).toHaveTextContent("Final Season");
  });

  it("shows no airing banner when nothing is scheduled", () => {
    renderFranchise("Franchise", summary({ nextAiringEpisode: null }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
