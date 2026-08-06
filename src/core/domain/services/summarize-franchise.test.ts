import { describe, it, expect } from "vitest";
import { summarizeFranchise } from "./summarize-franchise";
import { AnimeWork, SourceWork } from "../models/franchise-work";
import { AnimeStatus } from "../models/anime";

function animeWork(overrides: Partial<AnimeWork> & { id: number }): AnimeWork {
  return {
    kind: "ANIME",
    title: {
      userPreferred: `Work ${overrides.id}`,
      english: null,
      romaji: null,
      native: null,
    },
    coverImage: "",
    format: "TV",
    startDate: { year: 2013, month: 4, day: 7 },
    endDate: null,
    episodes: 25,
    score: 80,
    status: "FINISHED" as AnimeStatus,
    nextAiringEpisode: null,
    ...overrides,
  };
}

function sourceWork(overrides: Partial<SourceWork> & { id: number }): SourceWork {
  return {
    kind: "SOURCE",
    title: {
      userPreferred: `Source ${overrides.id}`,
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

describe("summarizeFranchise", () => {
  it("sums episodes across the timeline", () => {
    const summary = summarizeFranchise(
      [animeWork({ id: 1, episodes: 25 }), animeWork({ id: 2, episodes: 12 })],
      [],
      [],
    );
    expect(summary.totalEpisodes).toBe(37);
  });

  it("keeps the sum when one entry is ongoing with an unknown total", () => {
    // Regression: the old adapter replaced the whole sum with one season's count.
    const summary = summarizeFranchise(
      [
        animeWork({ id: 1, episodes: 25 }),
        animeWork({
          id: 2,
          episodes: null,
          status: "ONGOING",
          nextAiringEpisode: {
            episode: 11,
            timeUntilAiringSeconds: 3600,
            seasonTitle: "S2",
          },
        }),
      ],
      [],
      [],
    );
    expect(summary.totalEpisodes).toBe(35); // 25 + (11 - 1)
  });

  it("reports NOT_RELEASED when nothing has aired yet", () => {
    // Regression: the old adapter reported NEW_SEASON_COMING here.
    const summary = summarizeFranchise(
      [animeWork({ id: 1, status: "NOT_RELEASED", episodes: null })],
      [],
      [],
    );
    expect(summary.status).toBe("NOT_RELEASED");
  });

  it("reports NEW_SEASON_COMING when a released entry has an unaired sequel", () => {
    const summary = summarizeFranchise(
      [
        animeWork({ id: 1 }),
        animeWork({ id: 2, status: "NOT_RELEASED", episodes: null }),
      ],
      [],
      [],
    );
    expect(summary.status).toBe("NEW_SEASON_COMING");
  });

  it("prefers CANCELLED over every other status", () => {
    const summary = summarizeFranchise(
      [
        animeWork({ id: 1, status: "ONGOING" }),
        animeWork({ id: 2, status: "CANCELLED" }),
      ],
      [],
      [],
    );
    expect(summary.status).toBe("CANCELLED");
  });

  it("reports ONGOING when an entry is airing", () => {
    const summary = summarizeFranchise(
      [animeWork({ id: 1, status: "ONGOING" })],
      [],
      [],
    );
    expect(summary.status).toBe("ONGOING");
  });

  it("averages scores across timeline and related works, ignoring absent ones", () => {
    const summary = summarizeFranchise(
      [animeWork({ id: 1, score: 90 }), animeWork({ id: 2, score: null })],
      [animeWork({ id: 3, score: 80, format: "MOVIE" })],
      [],
    );
    expect(summary.averageScore).toBe(85);
  });

  it("returns a null average when nothing is scored", () => {
    const summary = summarizeFranchise(
      [animeWork({ id: 1, score: null })],
      [],
      [],
    );
    expect(summary.averageScore).toBeNull();
  });

  it("takes the start year from the first timeline entry", () => {
    const summary = summarizeFranchise(
      [
        animeWork({ id: 1, startDate: { year: 1999, month: 10, day: 20 } }),
        animeWork({ id: 2, startDate: { year: 2017, month: 4, day: 1 } }),
      ],
      [],
      [],
    );
    expect(summary.startYear).toBe(1999);
  });

  it("takes the end year from the latest concluded entry", () => {
    const summary = summarizeFranchise(
      [
        animeWork({ id: 1, endDate: { year: 2013, month: 9, day: 28 } }),
        animeWork({ id: 2, endDate: { year: 2023, month: 11, day: 4 } }),
      ],
      [],
      [],
    );
    expect(summary.endYear).toBe(2023);
  });

  it("surfaces the soonest upcoming episode", () => {
    const summary = summarizeFranchise(
      [
        animeWork({
          id: 1,
          nextAiringEpisode: {
            episode: 5,
            timeUntilAiringSeconds: 900_000,
            seasonTitle: "Later",
          },
        }),
        animeWork({
          id: 2,
          nextAiringEpisode: {
            episode: 2,
            timeUntilAiringSeconds: 3_600,
            seasonTitle: "Sooner",
          },
        }),
      ],
      [],
      [],
    );
    expect(summary.nextAiringEpisode?.seasonTitle).toBe("Sooner");
  });

  it("reports UNKNOWN source status when the franchise has no written source", () => {
    // Steins;Gate is an original anime with no source edge at all.
    const summary = summarizeFranchise([animeWork({ id: 1 })], [], []);
    expect(summary.sourceStatus).toBe("UNKNOWN");
  });

  it("reports FINISHED when every source has concluded", () => {
    const summary = summarizeFranchise(
      [animeWork({ id: 1 })],
      [],
      [sourceWork({ id: 2 })],
    );
    expect(summary.sourceStatus).toBe("FINISHED");
  });

  it("reports the source format so the UI can name it", () => {
    const summary = summarizeFranchise(
      [animeWork({ id: 1 })],
      [],
      [sourceWork({ id: 2, format: "MANGA" })],
    );
    expect(summary.sourceFormat).toBe("MANGA");
  });

  it("picks the predominant format when sources are mixed", () => {
    // Monogatari adapts many light novels plus a stray manga.
    const summary = summarizeFranchise(
      [animeWork({ id: 1 })],
      [],
      [
        sourceWork({ id: 2, format: "NOVEL" }),
        sourceWork({ id: 3, format: "NOVEL" }),
        sourceWork({ id: 4, format: "MANGA" }),
      ],
    );
    expect(summary.sourceFormat).toBe("NOVEL");
  });

  it("has no source format when the franchise is an original work", () => {
    const summary = summarizeFranchise([animeWork({ id: 1 })], [], []);
    expect(summary.sourceFormat).toBeNull();
  });

  it("reports ONGOING when any source is still publishing", () => {
    const summary = summarizeFranchise(
      [animeWork({ id: 1 })],
      [],
      [sourceWork({ id: 2 }), sourceWork({ id: 3, status: "RELEASING", chapters: null })],
    );
    expect(summary.sourceStatus).toBe("ONGOING");
  });

  it("handles an empty franchise without throwing", () => {
    const summary = summarizeFranchise([], [], []);
    expect(summary.totalEpisodes).toBe(0);
    expect(summary.startYear).toBeNull();
    expect(summary.status).toBe("FINISHED");
  });
});
