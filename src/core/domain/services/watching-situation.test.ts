import { describe, it, expect } from "vitest";
import { FranchiseSummary } from "../models/franchise";
import { deriveWatchingSituation } from "./watching-situation";

const NOW = new Date("2026-08-07T00:00:00Z");

function summary(overrides: Partial<FranchiseSummary> = {}): FranchiseSummary {
  return {
    startYear: 2013,
    endYear: 2023,
    totalEpisodes: 87,
    averageScore: 80,
    status: "FINISHED",
    nextAiringEpisode: null,
    sourceStatus: "UNKNOWN",
    sourceFormat: null,
    ...overrides,
  };
}

describe("deriveWatchingSituation", () => {
  it("classifies a cancelled franchise", () => {
    expect(deriveWatchingSituation(summary({ status: "CANCELLED" }), NOW)).toBe(
      "CANCELLED",
    );
  });

  it("classifies an officially paused production", () => {
    expect(deriveWatchingSituation(summary({ status: "HIATUS" }), NOW)).toBe(
      "OFFICIAL_HIATUS",
    );
  });

  it("classifies a franchise that has never aired", () => {
    expect(
      deriveWatchingSituation(summary({ status: "NOT_RELEASED" }), NOW),
    ).toBe("NOT_RELEASED");
  });

  it("classifies a mega-series still airing", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "ONGOING", totalEpisodes: 1100 }),
        NOW,
      ),
    ).toBe("MEGA_SERIES_ONGOING");
  });

  it("classifies a normal series still airing", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "ONGOING", totalEpisodes: 8 }),
        NOW,
      ),
    ).toBe("ONGOING");
  });

  it("counts exactly 150 episodes as a mega-series", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "ONGOING", totalEpisodes: 150 }),
        NOW,
      ),
    ).toBe("MEGA_SERIES_ONGOING");
  });

  it("classifies an announced sequel", () => {
    expect(
      deriveWatchingSituation(summary({ status: "NEW_SEASON_COMING" }), NOW),
    ).toBe("SEQUEL_ANNOUNCED");
  });

  it("classifies a closed franchise", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "FINISHED", sourceStatus: "FINISHED" }),
        NOW,
      ),
    ).toBe("FINISHED");
  });

  it("calls a long-abandoned adaptation a de facto hiatus", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "FINISHED", sourceStatus: "ONGOING", endYear: 2018 }),
        NOW,
      ),
    ).toBe("DE_FACTO_HIATUS");
  });

  it("treats exactly five years since the last episode as a de facto hiatus", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "FINISHED", sourceStatus: "ONGOING", endYear: 2021 }),
        NOW,
      ),
    ).toBe("DE_FACTO_HIATUS");
  });

  it("leaves a normal wait between seasons alone", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "FINISHED", sourceStatus: "ONGOING", endYear: 2024 }),
        NOW,
      ),
    ).toBe("FINISHED");
  });

  it("cannot judge staleness without an end year", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "FINISHED", sourceStatus: "ONGOING", endYear: null }),
        NOW,
      ),
    ).toBe("FINISHED");
  });

  it("never calls an original series stalled, since it has no source to outrun", () => {
    expect(
      deriveWatchingSituation(
        summary({ status: "FINISHED", sourceStatus: "UNKNOWN", endYear: 1998 }),
        NOW,
      ),
    ).toBe("FINISHED");
  });
});
