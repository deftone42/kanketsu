import { describe, it, expect } from "vitest";
import { monthsSinceLastRelease } from "./time-since-last-release";
import { FranchiseSummary } from "../models/franchise";
import { PartialDate } from "../models/partial-date";

function summary(lastEndDate: PartialDate | null): FranchiseSummary {
  return {
    startYear: 2013,
    endYear: lastEndDate?.year ?? null,
    lastEndDate,
    totalEpisodes: 101,
    averageScore: 85,
    status: "FINISHED",
    nextAiringEpisode: null,
    sourceStatus: "FINISHED",
    sourceFormat: "MANGA",
  };
}

describe("monthsSinceLastRelease", () => {
  it("has nothing to measure while no entry has concluded", () => {
    expect(
      monthsSinceLastRelease(summary(null), new Date("2026-08-08T00:00:00Z")),
    ).toBeNull();
  });

  it("counts whole months from the end date", () => {
    expect(
      monthsSinceLastRelease(
        summary({ year: 2023, month: 11, day: 4 }),
        new Date("2026-08-08T00:00:00Z"),
      ),
    ).toBe(33);
  });

  it("counts a year-only end date from December, so the wait is never overstated", () => {
    expect(
      monthsSinceLastRelease(
        summary({ year: 2025, month: null, day: null }),
        new Date("2026-08-08T00:00:00Z"),
      ),
    ).toBe(8);
  });

  it("reports no elapsed month within the month the entry ended", () => {
    expect(
      monthsSinceLastRelease(
        summary({ year: 2026, month: 8, day: 1 }),
        new Date("2026-08-08T00:00:00Z"),
      ),
    ).toBe(0);
  });

  it("never counts backwards from an end date still in the future", () => {
    expect(
      monthsSinceLastRelease(
        summary({ year: 2027, month: 3, day: 1 }),
        new Date("2026-08-08T00:00:00Z"),
      ),
    ).toBe(0);
  });
});
