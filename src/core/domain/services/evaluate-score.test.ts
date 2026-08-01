import { describe, it, expect } from "vitest";
import { evaluateWatchingScore } from "./evaluate-score";

import { onePieceScenario } from "@/app/__tests__/fixtures/one-piece";
import { sacredSevenScenario } from "@/app/__tests__/fixtures/sacred-seven";
import { gintamaScenario } from "@/app/__tests__/fixtures/gintama";
import { frierenScenario } from "@/app/__tests__/fixtures/frieren";

describe("evaluateWatchingScore - Multi-Scenario Test Suite", () => {
  it("should evaluate Gintama as PERFECT_TIME (100) because the entire franchise is completed", () => {
    const result = evaluateWatchingScore(gintamaScenario);

    expect(result.score).toBe(100);
    expect(result.level).toBe("PERFECT_TIME");
    expect(result.badgeText).toBe("Completed Story!");
    expect(result.summary).toBe("Entire franchise is completed and available.");
  });

  it("should evaluate Frieren as GOOD_TIME (85) because the season ended but story is ongoing", () => {
    const result = evaluateWatchingScore(frierenScenario);

    expect(result.score).toBe(85);
    expect(result.level).toBe("GOOD_TIME");
    expect(result.badgeText).toBe("Season Complete");
    expect(result.summary).toBe("Season finished, ongoing story.");
    expect(result.details).toContain(
      "All 28 episodes of this season are available",
    );
  });

  it("should evaluate ONE PIECE as PERFECT_TIME (95) due to mega-series backlog", () => {
    const result = evaluateWatchingScore(onePieceScenario);

    expect(result.score).toBe(95);
    expect(result.level).toBe("PERFECT_TIME");
    expect(result.badgeText).toBe("Great Backlog!");
    expect(result.summary).toBe("Massive episode backlog available.");
  });

  it("should evaluate Sacred Seven as RISK_INCOMPLETE (40) due to production limbo (>3 years)", () => {
    const result = evaluateWatchingScore(sacredSevenScenario);

    expect(result.score).toBe(40);
    expect(result.level).toBe("RISK_INCOMPLETE");
    expect(result.badgeText).toBe("Production Limbo");
    expect(result.summary).toContain(
      "Ended in 2011 without continuation news.",
    );
  });
});
