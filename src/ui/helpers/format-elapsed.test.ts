import { describe, it, expect } from "vitest";
import { formatMonthsElapsed } from "./format-elapsed";

describe("formatMonthsElapsed", () => {
  it("rounds down to whole years once a year has passed", () => {
    expect(formatMonthsElapsed(33)).toBe("2 years ago");
  });

  it("keeps the singular for exactly one year", () => {
    expect(formatMonthsElapsed(12)).toBe("1 year ago");
  });

  it("stays in months under a year", () => {
    expect(formatMonthsElapsed(7)).toBe("7 months ago");
  });

  it("keeps the singular for one month", () => {
    expect(formatMonthsElapsed(1)).toBe("1 month ago");
  });

  it("reads a same-month ending as recent rather than as zero", () => {
    expect(formatMonthsElapsed(0)).toBe("this month");
  });
});
