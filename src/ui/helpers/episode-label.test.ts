import { describe, it, expect } from "vitest";
import { episodeLabel } from "./episode-label";

describe("episodeLabel", () => {
  it("counts episodes in the plural", () => {
    expect(episodeLabel(12)).toBe("12 episodes");
  });

  it("keeps a single episode singular", () => {
    expect(episodeLabel(1)).toBe("1 episode");
  });

  it("announces nothing when the count is unknown", () => {
    expect(episodeLabel(null)).toBe("Episodes TBA");
  });

  it("treats zero as unknown, since no series has aired nothing", () => {
    expect(episodeLabel(0)).toBe("Episodes TBA");
  });
});
