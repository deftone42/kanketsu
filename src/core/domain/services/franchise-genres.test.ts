import { describe, it, expect } from "vitest";
import { franchiseGenres } from "./franchise-genres";
import { AnimeWork } from "../models/franchise-work";
import { Genre } from "../models/genre";

function animeWork(id: number, genres: Genre[]): AnimeWork {
  return {
    kind: "ANIME",
    id,
    title: {
      userPreferred: `Work ${id}`,
      english: null,
      romaji: null,
      native: null,
    },
    coverImage: "",
    format: "TV",
    startDate: { year: 2013, month: 4, day: 7 },
    endDate: null,
    episodes: 25,
    score: 80,
    status: "FINISHED",
    genres,
    description: null,
    nextAiringEpisode: null,
  };
}

describe("franchiseGenres", () => {
  it("has nothing to describe when the franchise is empty", () => {
    expect(franchiseGenres([])).toEqual([]);
  });

  it("collects every genre a single entry carries", () => {
    expect(franchiseGenres([animeWork(1, ["ACTION", "DRAMA"])])).toEqual([
      "ACTION",
      "DRAMA",
    ]);
  });

  it("puts the genres the franchise repeats first", () => {
    const genres = franchiseGenres([
      animeWork(1, ["COMEDY", "ACTION"]),
      animeWork(2, ["ACTION"]),
    ]);

    expect(genres).toEqual(["ACTION", "COMEDY"]);
  });

  it("breaks a tie by where the genre first appears", () => {
    const genres = franchiseGenres([
      animeWork(1, ["MYSTERY", "ROMANCE"]),
      animeWork(2, []),
    ]);

    expect(genres).toEqual(["MYSTERY", "ROMANCE"]);
  });

  it("keeps only the five most representative genres", () => {
    const genres = franchiseGenres([
      animeWork(1, [
        "ACTION",
        "ADVENTURE",
        "COMEDY",
        "DRAMA",
        "FANTASY",
        "MECHA",
      ]),
    ]);

    expect(genres).toHaveLength(5);
    expect(genres).not.toContain("MECHA");
  });

  it("counts an entry once per genre, however often it repeats it", () => {
    const genres = franchiseGenres([
      animeWork(1, ["DRAMA", "DRAMA", "ACTION"]),
      animeWork(2, ["ACTION"]),
    ]);

    expect(genres).toEqual(["ACTION", "DRAMA"]);
  });
});
