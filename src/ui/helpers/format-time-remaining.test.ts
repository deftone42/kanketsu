import { describe, it, expect } from "vitest";
import { formatTimeRemaining } from "./format-time-remaining";

describe("formatTimeRemaining", () => {
  it("shows days and hours once a day remains", () => {
    expect(formatTimeRemaining(3 * 86400 + 4 * 3600)).toBe("3d 4h");
  });

  it("drops the day part under 24 hours", () => {
    expect(formatTimeRemaining(4 * 3600)).toBe("4h");
  });

  it("reports an imminent episode as zero hours rather than blank", () => {
    expect(formatTimeRemaining(59)).toBe("0h");
  });
});
