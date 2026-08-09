import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { FranchiseCard } from "./FranchiseCard";
import { FranchiseSummary } from "@/core/domain/models/franchise";
import {
  AnimeFormat,
} from "@/core/domain/models/anime";
import { AnimeWork, SourceWork } from "@/core/domain/models/franchise-work";
import { Genre } from "@/core/domain/models/genre";

function summary(overrides: Partial<FranchiseSummary> = {}): FranchiseSummary {
  return {
    startYear: 2013,
    endYear: 2023,
    lastEndDate: { year: 2023, month: 11, day: 4 },
    totalEpisodes: 101,
    averageScore: 85,
    status: "FINISHED",
    nextAiringEpisode: null,
    sourceStatus: "FINISHED",
    sourceFormat: "MANGA",
    ...overrides,
  };
}

function relatedWork(id: number, format: AnimeFormat): AnimeWork {
  return {
    kind: "ANIME",
    id,
    title: {
      userPreferred: `Work ${id}`,
      english: null,
      romaji: null,
      native: null,
    },
    coverImage: "",
    format,
    startDate: { year: 2015, month: 1, day: 1 },
    endDate: null,
    episodes: 1,
    score: null,
    status: "FINISHED",
    genres: [],
    description: null,
    nextAiringEpisode: null,
  };
}

function sourceWork(overrides: Partial<SourceWork> = {}): SourceWork {
  return {
    kind: "SOURCE",
    id: 53390,
    title: {
      userPreferred: "Shingeki no Kyojin",
      english: null,
      romaji: null,
      native: null,
    },
    format: "MANGA",
    status: "FINISHED",
    chapters: 139,
    volumes: 34,
    ...overrides,
  };
}

interface RenderExtras {
  genres?: Genre[];
  seasonCount?: number;
  related?: AnimeWork[];
  sources?: SourceWork[];
  monthsSinceLastRelease?: number | null;
}

const renderFranchise = (
  name: string,
  franchiseSummary: FranchiseSummary,
  extras: RenderExtras = {},
) =>
  render(
    <FranchiseCard
      name={name}
      summary={franchiseSummary}
      genres={extras.genres ?? []}
      seasonCount={extras.seasonCount ?? 8}
      related={extras.related ?? []}
      sources={extras.sources ?? []}
      monthsSinceLastRelease={extras.monthsSinceLastRelease ?? null}
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

  it("labels the average so it is not mistaken for one season's rating", () => {
    renderFranchise("Series", summary({ averageScore: 85 }));

    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("Seasons average user score")).toBeInTheDocument();
  });

  it("omits the average when no entry is scored", () => {
    renderFranchise("Series", summary({ averageScore: null }));

    expect(
      screen.queryByText("Seasons average user score"),
    ).not.toBeInTheDocument();
  });

  it("counts seasons and movies", () => {
    renderFranchise("Franchise", summary(), {
      seasonCount: 8,
      related: [
        relatedWork(1, "MOVIE"),
        relatedWork(2, "MOVIE"),
        relatedWork(3, "MOVIE"),
        relatedWork(4, "MOVIE"),
      ],
    });

    expect(screen.getByText("8 seasons")).toBeInTheDocument();
    expect(screen.getByText("4 movies")).toBeInTheDocument();
  });

  it("omits the movie count when the franchise has none", () => {
    renderFranchise("Franchise", summary(), { seasonCount: 3, related: [] });

    expect(screen.queryByText(/^\d+ movies?$/)).not.toBeInTheDocument();
    expect(screen.getByText("3 seasons")).toBeInTheDocument();
  });

  it("counts the OVAs, specials and ONAs the timeline leaves out", () => {
    renderFranchise("Franchise", summary(), {
      related: [
        relatedWork(1, "OVA"),
        relatedWork(2, "OVA"),
        relatedWork(3, "SPECIAL"),
        relatedWork(4, "ONA"),
      ],
    });

    expect(screen.getByText("2 OVAs")).toBeInTheDocument();
    expect(screen.getByText("1 special")).toBeInTheDocument();
    expect(screen.getByText("1 ONA")).toBeInTheDocument();
  });

  it("says nothing about formats the franchise never used", () => {
    renderFranchise("Franchise", summary(), {
      related: [relatedWork(1, "OVA")],
    });

    expect(screen.queryByText(/specials?$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ONAs?$/)).not.toBeInTheDocument();
  });

  it("sizes the original work when a single one is adapted", () => {
    renderFranchise("Series", summary(), {
      sources: [sourceWork({ chapters: 139, volumes: 34 })],
    });

    expect(screen.getByText("139 chapters")).toBeInTheDocument();
    expect(screen.getByText("34 volumes")).toBeInTheDocument();
  });

  it("omits a chapter count the source never reported", () => {
    renderFranchise("Series", summary(), {
      sources: [sourceWork({ chapters: null, volumes: 34 })],
    });

    expect(screen.queryByText(/chapters?$/)).not.toBeInTheDocument();
    expect(screen.getByText("34 volumes")).toBeInTheDocument();
  });

  it("does not size a franchise that adapts several different works", () => {
    renderFranchise("Series", summary({ sourceFormat: "NOVEL" }), {
      sources: [
        sourceWork({ id: 1, format: "NOVEL", chapters: 107, volumes: 10 }),
        sourceWork({ id: 2, format: "NOVEL", chapters: 40, volumes: 4 }),
      ],
    });

    expect(screen.queryByText(/chapters?$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/volumes?$/)).not.toBeInTheDocument();
  });

  it("lists the genres under a name that says what they are", () => {
    renderFranchise("Franchise", summary(), {
      genres: ["ACTION", "DRAMA"],
    });

    const genres = screen.getByRole("list", { name: "Genres" });

    expect(within(genres).getByText("Action")).toBeInTheDocument();
    expect(within(genres).getByText("Drama")).toBeInTheDocument();
  });

  it("spells a genre the way a reader does, not the way we store it", () => {
    renderFranchise("Franchise", summary(), {
      genres: ["SCI_FI", "SLICE_OF_LIFE"],
    });

    expect(screen.getByText("Sci-Fi")).toBeInTheDocument();
    expect(screen.getByText("Slice of Life")).toBeInTheDocument();
  });

  it("shows no genre list when the franchise is untagged", () => {
    renderFranchise("Franchise", summary(), { genres: [] });

    expect(
      screen.queryByRole("list", { name: "Genres" }),
    ).not.toBeInTheDocument();
  });

  it("says how long it has been since the last entry ended", () => {
    renderFranchise("Franchise", summary({ status: "FINISHED" }), {
      monthsSinceLastRelease: 33,
    });

    expect(screen.getByText("Last entry 2 years ago")).toBeInTheDocument();
  });

  it("stays quiet about the wait while the franchise is still airing", () => {
    renderFranchise("Franchise", summary({ status: "ONGOING" }), {
      monthsSinceLastRelease: 33,
    });

    expect(screen.queryByText(/^Last entry/)).not.toBeInTheDocument();
  });

  it("stays quiet about the wait when a new season is already coming", () => {
    renderFranchise("Franchise", summary({ status: "NEW_SEASON_COMING" }), {
      monthsSinceLastRelease: 33,
    });

    expect(screen.queryByText(/^Last entry/)).not.toBeInTheDocument();
  });

  it("says nothing about the wait when no entry has ended", () => {
    renderFranchise("Franchise", summary(), {
      monthsSinceLastRelease: null,
    });

    expect(screen.queryByText(/^Last entry/)).not.toBeInTheDocument();
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
