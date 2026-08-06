import { describe, it, expect } from "vitest";
import {
  comparePartialDates,
  toSortWeight,
  UNKNOWN_DATE,
  PartialDate,
} from "./partial-date";

const date = (
  year: number | null,
  month: number | null = null,
  day: number | null = null,
): PartialDate => ({ year, month, day });

describe("toSortWeight", () => {
  it("orders by year, then month, then day", () => {
    expect(toSortWeight(date(2016, 1, 8))).toBeLessThan(
      toSortWeight(date(2016, 8, 19)),
    );
  });

  it("treats a missing month or day as the start of the period", () => {
    expect(toSortWeight(date(2016))).toBe(toSortWeight(date(2016, 1, 1)));
  });

  it("sorts unknown years last", () => {
    expect(toSortWeight(UNKNOWN_DATE)).toBeGreaterThan(
      toSortWeight(date(9999, 12, 31)),
    );
  });
});

describe("comparePartialDates", () => {
  it("orders Kizumonogatari I before II within the same year", () => {
    expect(comparePartialDates(date(2016, 1, 8), date(2016, 8, 19))).toBeLessThan(
      0,
    );
  });

  it("is symmetric", () => {
    expect(
      comparePartialDates(date(2016, 8, 19), date(2016, 1, 8)),
    ).toBeGreaterThan(0);
  });

  it("returns 0 for equal dates", () => {
    expect(comparePartialDates(date(2013, 4, 7), date(2013, 4, 7))).toBe(0);
  });

  it("pushes unknown dates to the end", () => {
    expect(comparePartialDates(UNKNOWN_DATE, date(1999))).toBeGreaterThan(0);
  });
});
