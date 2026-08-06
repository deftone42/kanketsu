import { describe, it, expect } from "vitest";
import { evaluateWatchingScore } from "./evaluate-score";
import { FranchiseSummary } from "../models/franchise";

function summary(overrides: Partial<FranchiseSummary> = {}): FranchiseSummary {
  return {
    startYear: 2013,
    endYear: 2023,
    totalEpisodes: 87,
    averageScore: 80,
    status: "FINISHED",
    nextAiringEpisode: null,
    sourceStatus: "UNKNOWN",
    ...overrides,
  };
}

describe("evaluateWatchingScore", () => {
  it("rewards a completed story", () => {
    const result = evaluateWatchingScore(summary({ status: "FINISHED" }));
    expect(result.level).toBe("PERFECT_TIME");
    expect(result.score).toBe(85);
  });

  it("penalises a cancelled franchise", () => {
    const result = evaluateWatchingScore(summary({ status: "CANCELLED" }));
    expect(result.level).toBe("NOT_RECOMMENDED");
  });

  it("flags the hype window when a sequel airs soon", () => {
    const result = evaluateWatchingScore(
      summary({
        status: "NEW_SEASON_COMING",
        nextAiringEpisode: {
          episode: 1,
          timeUntilAiringSeconds: 10 * 86_400,
          seasonTitle: "S2",
        },
      }),
    );
    expect(result.level).toBe("PERFECT_TIME");
    expect(result.badgeText).toBe("Hype Window Active!");
  });

  it("is calmer when the sequel is far away", () => {
    const result = evaluateWatchingScore(
      summary({
        status: "NEW_SEASON_COMING",
        nextAiringEpisode: {
          episode: 1,
          timeUntilAiringSeconds: 200 * 86_400,
          seasonTitle: "S2",
        },
      }),
    );
    expect(result.level).toBe("GOOD_TIME");
  });

  it("treats a long-running ongoing series as a good backlog", () => {
    const result = evaluateWatchingScore(
      summary({ status: "ONGOING", totalEpisodes: 1100 }),
    );
    expect(result.level).toBe("PERFECT_TIME");
  });

  it("warns about a short ongoing series", () => {
    const result = evaluateWatchingScore(
      summary({ status: "ONGOING", totalEpisodes: 8 }),
    );
    expect(result.level).toBe("IF_CANT_WAIT");
  });

  it("applies the quality bonus", () => {
    const high = evaluateWatchingScore(summary({ averageScore: 90 }));
    const low = evaluateWatchingScore(summary({ averageScore: 40 }));
    expect(high.score).toBeGreaterThan(low.score);
  });

  it("clamps to 0..100", () => {
    const result = evaluateWatchingScore(
      summary({ status: "CANCELLED", averageScore: 10 }),
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
