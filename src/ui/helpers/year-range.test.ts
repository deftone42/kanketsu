import { describe, it, expect } from "vitest";
import { yearRange } from "./year-range";

describe("yearRange", () => {
  it("collapses a franchise that started and ended in one year", () => {
    expect(yearRange(2019, 2019, "FINISHED")).toBe("2019");
  });

  it("spans the years a franchise ran across", () => {
    expect(yearRange(2013, 2021, "FINISHED")).toBe("2013 – 2021");
  });

  it("reads a franchise still running as open ended", () => {
    expect(yearRange(1999, null, "ONGOING")).toBe("1999 – present");
  });

  it("does not promise more from a finished franchise with no end year", () => {
    expect(yearRange(2019, null, "FINISHED")).toBe("2019");
  });

  it("has nothing to show before the first entry has a date", () => {
    expect(yearRange(null, null, "NOT_RELEASED")).toBe("TBA");
  });
});
