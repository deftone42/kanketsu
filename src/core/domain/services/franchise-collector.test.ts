import { describe, it, expect, beforeEach, vi } from "vitest";
import { FranchiseCollector } from "./franchise-collector";
import { Anime, AnimeFormat, FranchiseMediaItem } from "../models/anime";
import { Relation } from "../models/relation";
import {
  AnimeRepository,
  AnimeSearchResult,
} from "../../ports/anime-repository";

/**
 * Mock repository for testing FranchiseCollector.
 * Stores a map of anime entries and returns them via getAnimeWithRelations.
 */
class MockAnimeRepository implements AnimeRepository {
  private store = new Map<number, Anime>();

  setAnime(anime: Anime): void {
    this.store.set(anime.id, anime);
  }

  async searchAnime(_query: string): Promise<AnimeSearchResult[]> {
    return [];
  }

  async getAnimeById(id: number): Promise<Anime | null> {
    return this.store.get(id) ?? null;
  }

  async getAnimeWithRelations(id: number): Promise<Anime | null> {
    return this.store.get(id) ?? null;
  }
}

/**
 * Helper to create a minimal Anime object for testing.
 */
function makeAnime(
  id: number,
  title: string,
  releaseYear: number | null,
  relations: Relation[] = [],
  format: AnimeFormat | null = null,
): Anime {
  return {
    id,
    title: { userPreferred: title },
    coverImage: "",
    format,
    releaseYear,
    endDate: null,
    userScore: null,
    status: "FINISHED",
    nextAiringEpisode: null,
    seasons: [] as FranchiseMediaItem[],
    movies: [] as FranchiseMediaItem[],
    totalEpisodes: 0,
    relations,
  };
}

/**
 * Helper to create a Relation edge.
 */
function makeRelation(
  id: number,
  relationType: Relation["relationType"],
  title: string,
  format: Relation["format"] = "TV",
): Relation {
  return { id, relationType, format, title };
}

describe("FranchiseCollector", () => {
  let repo: MockAnimeRepository;
  let collector: FranchiseCollector;

  beforeEach(() => {
    repo = new MockAnimeRepository();
    collector = new FranchiseCollector(repo);
  });

  describe("linear chain (A → B → C)", () => {
    it("should collect all 3 nodes in a linear PREQUEL/SEQUEL chain", async () => {
      repo.setAnime(
        makeAnime(1, "Anime A", 2020, [makeRelation(2, "SEQUEL", "Anime B")]),
      );
      repo.setAnime(
        makeAnime(2, "Anime B", 2021, [
          makeRelation(1, "PREQUEL", "Anime A"),
          makeRelation(3, "SEQUEL", "Anime C"),
        ]),
      );
      repo.setAnime(
        makeAnime(3, "Anime C", 2022, [makeRelation(2, "PREQUEL", "Anime B")]),
      );

      const franchise = await collector.collect(1);

      expect(franchise.rootId).toBe(1);
      expect(franchise.nodes.size).toBe(3);
      expect(franchise.nodes.has(1)).toBe(true);
      expect(franchise.nodes.has(2)).toBe(true);
      expect(franchise.nodes.has(3)).toBe(true);

      expect(franchise.mainTimeline).toHaveLength(3);
      expect(franchise.mainTimeline[0]!.id).toBe(1);
      expect(franchise.mainTimeline[1]!.id).toBe(2);
      expect(franchise.mainTimeline[2]!.id).toBe(3);
    });

    it("should collect all edges including non-traversed ones", async () => {
      repo.setAnime(
        makeAnime(1, "Anime A", 2020, [
          makeRelation(2, "SEQUEL", "Anime B"),
          makeRelation(4, "SIDE_STORY", "Anime D"),
        ]),
      );
      repo.setAnime(
        makeAnime(2, "Anime B", 2021, [makeRelation(1, "PREQUEL", "Anime A")]),
      );

      const franchise = await collector.collect(1);

      expect(franchise.nodes.size).toBe(2);
      expect(franchise.edges).toHaveLength(3);

      const sideStoryEdge = franchise.edges.find(
        (e) => e.relation.relationType === "SIDE_STORY",
      );
      expect(sideStoryEdge).toBeDefined();
      expect(sideStoryEdge!.sourceId).toBe(1);
      expect(sideStoryEdge!.relation.id).toBe(4);
    });
  });

  describe("cycle detection (A → B → A)", () => {
    it("should not infinite-loop on cyclic relations", async () => {
      repo.setAnime(
        makeAnime(1, "Anime A", 2020, [makeRelation(2, "SEQUEL", "Anime B")]),
      );
      repo.setAnime(
        makeAnime(2, "Anime B", 2021, [makeRelation(1, "PREQUEL", "Anime A")]),
      );

      const franchise = await collector.collect(1);

      expect(franchise.nodes.size).toBe(2);
      expect(franchise.nodes.has(1)).toBe(true);
      expect(franchise.nodes.has(2)).toBe(true);

      expect(franchise.mainTimeline).toHaveLength(2);
      expect(franchise.mainTimeline[0]!.id).toBe(1);
      expect(franchise.mainTimeline[1]!.id).toBe(2);
    });

    it("should handle 3-node cycle (A → B → C → A)", async () => {
      repo.setAnime(makeAnime(1, "A", 2020, [makeRelation(2, "SEQUEL", "B")]));
      repo.setAnime(makeAnime(2, "B", 2021, [makeRelation(3, "SEQUEL", "C")]));
      repo.setAnime(makeAnime(3, "C", 2022, [makeRelation(1, "SEQUEL", "A")]));

      const franchise = await collector.collect(1);

      expect(franchise.nodes.size).toBe(3);
      expect(franchise.mainTimeline).toHaveLength(3);
    });
  });

  describe("branching franchise (One Piece-like)", () => {
    it("should handle branching PREQUEL/SEQUEL with side stories", async () => {
      repo.setAnime(
        makeAnime(1, "Main A", 2018, [
          makeRelation(2, "SEQUEL", "Main B"),
          makeRelation(5, "SPIN_OFF", "Spin-off E"),
        ]),
      );
      repo.setAnime(
        makeAnime(2, "Main B", 2019, [
          makeRelation(1, "PREQUEL", "Main A"),
          makeRelation(3, "SEQUEL", "Main C"),
          makeRelation(4, "SIDE_STORY", "Side D"),
        ]),
      );
      repo.setAnime(
        makeAnime(3, "Main C", 2020, [makeRelation(2, "PREQUEL", "Main B")]),
      );

      const franchise = await collector.collect(1);

      expect(franchise.nodes.size).toBe(3);
      expect(franchise.mainTimeline).toHaveLength(3);
      expect(franchise.mainTimeline.map((a) => a.id)).toEqual([1, 2, 3]);
      expect(franchise.edges).toHaveLength(6);
    });
  });

  describe("missing nodes", () => {
    it("should skip nodes that return null from repository", async () => {
      repo.setAnime(
        makeAnime(1, "Anime A", 2020, [makeRelation(2, "SEQUEL", "Anime B")]),
      );
      repo.setAnime(
        makeAnime(2, "Anime B", 2021, [
          makeRelation(1, "PREQUEL", "Anime A"),
          makeRelation(3, "SEQUEL", "Anime C (missing)"),
        ]),
      );

      const franchise = await collector.collect(1);

      expect(franchise.nodes.size).toBe(2);
      expect(franchise.nodes.has(1)).toBe(true);
      expect(franchise.nodes.has(2)).toBe(true);
      expect(franchise.nodes.has(3)).toBe(false);
      expect(franchise.mainTimeline).toHaveLength(2);
    });

    it("should handle root node not found", async () => {
      const franchise = await collector.collect(999);

      expect(franchise.rootId).toBe(999);
      expect(franchise.nodes.size).toBe(0);
      expect(franchise.edges).toHaveLength(0);
      expect(franchise.mainTimeline).toHaveLength(0);
    });
  });

  describe("depth limit", () => {
    it("should respect maxDepth option", async () => {
      for (let i = 1; i <= 5; i++) {
        const relations: Relation[] = [];
        if (i > 1) {
          relations.push(makeRelation(i - 1, "PREQUEL", `Anime ${i - 1}`));
        }
        if (i < 5) {
          relations.push(makeRelation(i + 1, "SEQUEL", `Anime ${i + 1}`));
        }
        repo.setAnime(makeAnime(i, `Anime ${i}`, 2020 + i, relations));
      }

      const franchise = await collector.collect(1, { maxDepth: 2 });

      expect(franchise.nodes.size).toBe(3);
      expect(franchise.nodes.has(1)).toBe(true);
      expect(franchise.nodes.has(2)).toBe(true);
      expect(franchise.nodes.has(3)).toBe(true);
      expect(franchise.nodes.has(4)).toBe(false);
      expect(franchise.nodes.has(5)).toBe(false);
    });

    it("should use default maxDepth of 10", async () => {
      for (let i = 1; i <= 12; i++) {
        const relations: Relation[] = [];
        if (i > 1) {
          relations.push(makeRelation(i - 1, "PREQUEL", `Anime ${i - 1}`));
        }
        if (i < 12) {
          relations.push(makeRelation(i + 1, "SEQUEL", `Anime ${i + 1}`));
        }
        repo.setAnime(makeAnime(i, `Anime ${i}`, 2020 + i, relations));
      }

      const franchise = await collector.collect(1);

      expect(franchise.nodes.size).toBe(11);
      expect(franchise.nodes.has(12)).toBe(false);
    });
  });

  describe("error resilience", () => {
    it("should continue traversal when a fetch throws", async () => {
      repo.setAnime(
        makeAnime(1, "Anime A", 2020, [makeRelation(2, "SEQUEL", "Anime B")]),
      );
      const originalGet = repo.getAnimeWithRelations.bind(repo);
      repo.getAnimeWithRelations = vi
        .fn()
        .mockImplementation(async (id: number) => {
          if (id === 2) {
            throw new Error("Network error");
          }
          return originalGet(id);
        });

      repo.setAnime(
        makeAnime(3, "Anime C", 2022, [makeRelation(2, "PREQUEL", "Anime B")]),
      );

      const franchise = await collector.collect(1);

      expect(franchise.nodes.size).toBe(1);
      expect(franchise.nodes.has(1)).toBe(true);
    });
  });

  describe("custom followRelationTypes", () => {
    it("should traverse SIDE_STORY when configured", async () => {
      repo.setAnime(
        makeAnime(1, "Anime A", 2020, [
          makeRelation(2, "SIDE_STORY", "Anime B"),
        ]),
      );
      repo.setAnime(
        makeAnime(2, "Anime B", 2021, [
          makeRelation(1, "SIDE_STORY", "Anime A"),
        ]),
      );

      const defaultFranchise = await collector.collect(1);
      expect(defaultFranchise.nodes.size).toBe(1);

      const customFranchise = await collector.collect(1, {
        followRelationTypes: new Set(["SIDE_STORY"]),
      });
      expect(customFranchise.nodes.size).toBe(2);
      expect(customFranchise.nodes.has(1)).toBe(true);
      expect(customFranchise.nodes.has(2)).toBe(true);
    });
  });

  describe("main timeline ordering", () => {
    it("should order main timeline by release year ascending", async () => {
      repo.setAnime(
        makeAnime(1, "Anime A", 2020, [
          makeRelation(3, "PREQUEL", "Anime C"),
          makeRelation(2, "SEQUEL", "Anime B"),
        ]),
      );
      repo.setAnime(
        makeAnime(2, "Anime B", 2021, [makeRelation(1, "PREQUEL", "Anime A")]),
      );
      repo.setAnime(
        makeAnime(3, "Anime C", 2022, [makeRelation(1, "SEQUEL", "Anime A")]),
      );

      const franchise = await collector.collect(1);

      expect(franchise.mainTimeline).toHaveLength(3);
      expect(franchise.mainTimeline[0]!.id).toBe(1);
      expect(franchise.mainTimeline[1]!.id).toBe(2);
      expect(franchise.mainTimeline[2]!.id).toBe(3);
    });

    it("should handle null release years (sorted to end)", async () => {
      repo.setAnime(makeAnime(1, "A", 2020, [makeRelation(2, "SEQUEL", "B")]));
      repo.setAnime(makeAnime(2, "B", null, [makeRelation(1, "PREQUEL", "A")]));

      const franchise = await collector.collect(1);

      expect(franchise.mainTimeline).toHaveLength(2);
      expect(franchise.mainTimeline[0]!.id).toBe(1);
      expect(franchise.mainTimeline[1]!.id).toBe(2);
    });
  });

  describe("format filtering", () => {
    it("should exclude ONA from main timeline by default", async () => {
      repo.setAnime(
        makeAnime(1, "Main TV", 2020, [
          makeRelation(2, "PREQUEL", "ONA Prequel"),
        ]),
      );
      repo.setAnime(
        makeAnime(
          2,
          "ONA Prequel",
          2019,
          [makeRelation(1, "SEQUEL", "Main TV")],
          "ONA",
        ),
      );

      const franchise = await collector.collect(1);

      expect(franchise.nodes.size).toBe(2);
      expect(franchise.nodes.has(1)).toBe(true);
      expect(franchise.nodes.has(2)).toBe(true);

      expect(franchise.mainTimeline).toHaveLength(1);
      expect(franchise.mainTimeline[0]!.id).toBe(1);
    });

    it("should exclude OVA from main timeline by default", async () => {
      repo.setAnime(
        makeAnime(1, "Main TV", 2020, [
          makeRelation(2, "SEQUEL", "OVA Sequel"),
        ]),
      );
      repo.setAnime(
        makeAnime(
          2,
          "OVA Sequel",
          2021,
          [makeRelation(1, "PREQUEL", "Main TV")],
          "OVA",
        ),
      );

      const franchise = await collector.collect(1);

      expect(franchise.nodes.size).toBe(2);
      expect(franchise.mainTimeline).toHaveLength(1);
      expect(franchise.mainTimeline[0]!.id).toBe(1);
    });

    it("should include MOVIE in main timeline by default", async () => {
      repo.setAnime(
        makeAnime(1, "Main TV", 2020, [
          makeRelation(2, "SEQUEL", "Movie Sequel"),
        ]),
      );
      repo.setAnime(
        makeAnime(
          2,
          "Movie Sequel",
          2021,
          [makeRelation(1, "PREQUEL", "Main TV")],
          "MOVIE",
        ),
      );

      const franchise = await collector.collect(1);

      expect(franchise.nodes.size).toBe(2);
      expect(franchise.mainTimeline).toHaveLength(2);
      expect(franchise.mainTimeline[0]!.id).toBe(1);
      expect(franchise.mainTimeline[1]!.id).toBe(2);
    });

    it("should include SPECIAL in main timeline by default", async () => {
      repo.setAnime(
        makeAnime(1, "Main TV", 2020, [
          makeRelation(2, "SEQUEL", "Special Sequel"),
        ]),
      );
      repo.setAnime(
        makeAnime(
          2,
          "Special Sequel",
          2021,
          [makeRelation(1, "PREQUEL", "Main TV")],
          "SPECIAL",
        ),
      );

      const franchise = await collector.collect(1);

      expect(franchise.nodes.size).toBe(2);
      expect(franchise.mainTimeline).toHaveLength(2);
      expect(franchise.mainTimeline[0]!.id).toBe(1);
      expect(franchise.mainTimeline[1]!.id).toBe(2);
    });

    it("should always include root node regardless of format", async () => {
      repo.setAnime(
        makeAnime(
          1,
          "Root ONA",
          2020,
          [makeRelation(2, "SEQUEL", "TV Sequel")],
          "ONA",
        ),
      );
      repo.setAnime(
        makeAnime(2, "TV Sequel", 2021, [
          makeRelation(1, "PREQUEL", "Root ONA"),
        ]),
      );

      const franchise = await collector.collect(1);

      expect(franchise.nodes.size).toBe(2);
      expect(franchise.mainTimeline).toHaveLength(2);
      expect(franchise.mainTimeline[0]!.id).toBe(1);
      expect(franchise.mainTimeline[1]!.id).toBe(2);
    });

    it("should allow custom mainTimelineFormats", async () => {
      repo.setAnime(
        makeAnime(1, "TV A", 2020, [makeRelation(2, "SEQUEL", "Movie B")]),
      );
      repo.setAnime(
        makeAnime(
          2,
          "Movie B",
          2021,
          [
            makeRelation(1, "PREQUEL", "TV A"),
            makeRelation(3, "SEQUEL", "ONA C"),
          ],
          "MOVIE",
        ),
      );
      repo.setAnime(
        makeAnime(
          3,
          "ONA C",
          2022,
          [makeRelation(2, "PREQUEL", "Movie B")],
          "ONA",
        ),
      );

      const franchise = await collector.collect(1, {
        mainTimelineFormats: new Set(["TV"]),
      });

      expect(franchise.nodes.size).toBe(3);
      expect(franchise.mainTimeline).toHaveLength(1);
      expect(franchise.mainTimeline[0]!.id).toBe(1);
    });

    it("should include all formats when mainTimelineFormats is undefined", async () => {
      repo.setAnime(
        makeAnime(1, "TV A", 2020, [makeRelation(2, "SEQUEL", "ONA B")]),
      );
      repo.setAnime(
        makeAnime(
          2,
          "ONA B",
          2021,
          [makeRelation(1, "PREQUEL", "TV A")],
          "ONA",
        ),
      );

      const franchise = await collector.collect(1, {
        mainTimelineFormats: undefined,
      });

      expect(franchise.nodes.size).toBe(2);
      expect(franchise.mainTimeline).toHaveLength(1);
      expect(franchise.mainTimeline[0]!.id).toBe(1);
    });

    it("should include null-format nodes in main timeline", async () => {
      repo.setAnime(
        makeAnime(1, "TV A", 2020, [makeRelation(2, "SEQUEL", "Unknown B")]),
      );
      repo.setAnime(
        makeAnime(
          2,
          "Unknown B",
          2021,
          [makeRelation(1, "PREQUEL", "TV A")],
          null,
        ),
      );

      const franchise = await collector.collect(1);

      expect(franchise.nodes.size).toBe(2);
      expect(franchise.mainTimeline).toHaveLength(2);
      expect(franchise.mainTimeline[0]!.id).toBe(1);
      expect(franchise.mainTimeline[1]!.id).toBe(2);
    });
  });
});
