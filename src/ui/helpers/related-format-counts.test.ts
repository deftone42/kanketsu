import { describe, it, expect } from "vitest";
import { AnimeFormat } from "@/core/domain/models/anime";
import { AnimeWork } from "@/core/domain/models/franchise-work";
import { relatedFormatCounts } from "./related-format-counts";

const work = (format: AnimeFormat): AnimeWork => ({ format }) as AnimeWork;

const labelsOf = (related: AnimeWork[]) =>
  relatedFormatCounts(related).map(({ label }) => label);

describe("relatedFormatCounts", () => {
  it("counts each format the franchise has entries in", () => {
    expect(
      labelsOf([work("MOVIE"), work("MOVIE"), work("OVA"), work("ONA")]),
    ).toEqual(["2 movies", "1 OVA", "1 ONA"]);
  });

  it("leaves out formats the franchise never used", () => {
    expect(labelsOf([work("MOVIE")])).toEqual(["1 movie"]);
  });

  it("has nothing to count outside the timeline", () => {
    expect(labelsOf([])).toEqual([]);
  });

  it("orders formats the same way regardless of how they arrived", () => {
    expect(labelsOf([work("ONA"), work("MOVIE"), work("SPECIAL")])).toEqual([
      "1 movie",
      "1 special",
      "1 ONA",
    ]);
  });
});
