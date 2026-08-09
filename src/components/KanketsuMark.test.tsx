import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const drawnShapes = (source: string) =>
  [...source.matchAll(/\sd="([^"]+)"/g)].map(([, shape]) => shape);

describe("the Kanketsu mark", () => {
  it("draws the same shapes in the hero component and the favicon", () => {
    const component = readFileSync("src/components/KanketsuMark.tsx", "utf8");
    const favicon = readFileSync("src/app/icon.svg", "utf8");

    expect(drawnShapes(component)).toHaveLength(9);
    expect(drawnShapes(favicon)).toEqual(drawnShapes(component));
  });
});
