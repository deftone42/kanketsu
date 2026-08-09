import { describe, it, expect } from "vitest";
import { runLabel } from "./run-label";

const date = (year: number | null, month: number | null = null) => ({
  year,
  month,
  day: null,
});

describe("runLabel", () => {
  it("names the month and year an entry ran between", () => {
    expect(runLabel(date(2013, 4), date(2013, 9))).toBe("Apr 2013 – Sep 2013");
  });

  it("collapses a run that started and ended in the same month", () => {
    expect(runLabel(date(2016, 7), date(2016, 7))).toBe("Jul 2016");
  });

  it("falls back to the year alone when the month is unknown", () => {
    expect(runLabel(date(2013), date(2014))).toBe("2013 – 2014");
  });

  it("reads an entry still airing as open ended", () => {
    expect(runLabel(date(2023, 10), null)).toBe("Oct 2023 – present");
  });

  it("has nothing to show before the entry has a start year", () => {
    expect(runLabel(date(null), null)).toBe("TBA");
  });
});
