import { describe, it, expect } from "vitest";
import { lastEntryLabel } from "./last-entry-label";

describe("lastEntryLabel", () => {
  it("says how long the franchise has been quiet", () => {
    expect(lastEntryLabel("FINISHED", 30)).toBe("Last entry 2 years ago");
  });

  it("has no wait to report when nothing has been released yet", () => {
    expect(lastEntryLabel("NOT_RELEASED", null)).toBeNull();
  });

  it("does not call it a wait while the franchise is still airing", () => {
    expect(lastEntryLabel("ONGOING", 30)).toBeNull();
  });

  it("does not call it a wait when a new season is already coming", () => {
    expect(lastEntryLabel("NEW_SEASON_COMING", 30)).toBeNull();
  });
});
