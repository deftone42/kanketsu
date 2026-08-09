import { describe, it, expect } from "vitest";
import { AnimeWork } from "@/core/domain/models/franchise-work";
import { timelineEntryLabel } from "./timeline-entry-label";

const work = (title: string, year: number | null): AnimeWork =>
  ({
    title: { userPreferred: title },
    startDate: { year, month: null, day: null },
  }) as AnimeWork;

describe("timelineEntryLabel", () => {
  it("announces the watch order position, the title and the year", () => {
    expect(timelineEntryLabel(work("Attack on Titan", 2013), 1)).toBe(
      "1. Attack on Titan, 2013",
    );
  });

  it("says the date is unannounced rather than reading a bare number", () => {
    expect(timelineEntryLabel(work("Final Season", null), 4)).toBe(
      "4. Final Season, release date to be announced",
    );
  });
});
