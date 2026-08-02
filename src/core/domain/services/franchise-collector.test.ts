import { describe, it, expect, beforeEach, vi } from "vitest";
import { FranchiseCollector } from "./franchise-collector";
import { Anime, FranchiseMediaItem } from "../models/anime";
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
): Anime {
  return {
    id,
    title: { userPreferred: title },
    coverImage: "",
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
      // A (2020) --SEQUEL--> B (2021) --SEQUEL--> C (2022)
      // From A's perspective: B is SEQUEL of A
      // From B's perspective: A is PREQUEL of B, C is SEQUEL of B
      // From C's perspective: B is PREQUEL of C
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

      // Main timeline should be ordered by release year: A, B, C
      expect(franchise.mainTimeline).toHaveLength(3);
      expect(franchise.mainTimeline[0]!.id).toBe(1);
      expect(franchise.mainTimeline[1]!.id).toBe(2);
      expect(franchise.mainTimeline[2]!.id).toBe(3);
    });

    it("should collect all edges including non-traversed ones", async () => {
      // A has a SEQUEL (B) and a SIDE_STORY (D)
      // Only SEQUEL/PREQUEL are traversed, but SIDE_STORY edge should still be saved
      repo.setAnime(
        makeAnime(1, "Anime A", 2020, [
          makeRelation(2, "SEQUEL", "Anime B"),
          makeRelation(4, "SIDE_STORY", "Anime D"),
        ]),
      );
      repo.setAnime(
        makeAnime(2, "Anime B", 2021, [makeRelation(1, "PREQUEL", "Anime A")]),
      );
      // D is not fetched because SIDE_STORY is not traversed
      // but the edge from A→D should still be saved

      const franchise = await collector.collect(1);

      // Nodes: only A and B (D was not traversed)
      expect(franchise.nodes.size).toBe(2);

      // Edges: A→B (SEQUEL), A→D (SIDE_STORY), B→A (PREQUEL)
      expect(franchise.edges).toHaveLength(3);

      // Verify the SIDE_STORY edge exists
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
      // A --SEQUEL--> B --PREQUEL--> A (cycle!)
      repo.setAnime(
        makeAnime(1, "Anime A", 2020, [makeRelation(2, "SEQUEL", "Anime B")]),
      );
      repo.setAnime(
        makeAnime(2, "Anime B", 2021, [makeRelation(1, "PREQUEL", "Anime A")]),
      );

      const franchise = await collector.collect(1);

      // Should visit each node exactly once
      expect(franchise.nodes.size).toBe(2);
      expect(franchise.nodes.has(1)).toBe(true);
      expect(franchise.nodes.has(2)).toBe(true);

      // Main timeline should have both, ordered by year
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
      // Main timeline: A (2018) → B (2019) → C (2020)
      // Side story from B: D (2019)
      // Spin-off from A: E (2018)
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

      // Nodes: A, B, C (D and E are not traversed because SIDE_STORY/SPIN_OFF not in followTypes)
      expect(franchise.nodes.size).toBe(3);

      // Main timeline: A, B, C ordered by year
      expect(franchise.mainTimeline).toHaveLength(3);
      expect(franchise.mainTimeline.map((a) => a.id)).toEqual([1, 2, 3]);

      // Edges should include all saved edges from visited nodes
      // A has 2 edges (SEQUEL→B, SPIN_OFF→E)
      // B has 3 edges (PREQUEL→A, SEQUEL→C, SIDE_STORY→D)
      // C has 1 edge (PREQUEL→B)
      // Total: 6 edges
      expect(franchise.edges).toHaveLength(6);
    });
  });

  describe("missing nodes", () => {
    it("should skip nodes that return null from repository", async () => {
      // A --SEQUEL--> B (exists) --SEQUEL--> C (does NOT exist)
      repo.setAnime(
        makeAnime(1, "Anime A", 2020, [makeRelation(2, "SEQUEL", "Anime B")]),
      );
      repo.setAnime(
        makeAnime(2, "Anime B", 2021, [
          makeRelation(1, "PREQUEL", "Anime A"),
          makeRelation(3, "SEQUEL", "Anime C (missing)"),
        ]),
      );
      // C (id=3) is not set in the repo, so getAnimeWithRelations returns null

      const franchise = await collector.collect(1);

      // Should have A and B, but not C
      expect(franchise.nodes.size).toBe(2);
      expect(franchise.nodes.has(1)).toBe(true);
      expect(franchise.nodes.has(2)).toBe(true);
      expect(franchise.nodes.has(3)).toBe(false);

      // Main timeline: A and B (C was not fetched)
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
      // Chain: 1 → 2 → 3 → 4 → 5
      // maxDepth = 2 means we visit depth 0 (1), depth 1 (2), depth 2 (3)
      // depth 3 (4) and depth 4 (5) should be skipped
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

      // Should visit nodes at depth 0, 1, 2 (IDs 1, 2, 3)
      expect(franchise.nodes.size).toBe(3);
      expect(franchise.nodes.has(1)).toBe(true);
      expect(franchise.nodes.has(2)).toBe(true);
      expect(franchise.nodes.has(3)).toBe(true);
      expect(franchise.nodes.has(4)).toBe(false);
      expect(franchise.nodes.has(5)).toBe(false);
    });

    it("should use default maxDepth of 10", async () => {
      // Create a chain of 12 nodes
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

      // Default maxDepth=10, so we visit depth 0..10 (11 nodes: IDs 1..11)
      expect(franchise.nodes.size).toBe(11);
      expect(franchise.nodes.has(12)).toBe(false);
    });
  });

  describe("error resilience", () => {
    it("should continue traversal when a fetch throws", async () => {
      // A --SEQUEL--> B --SEQUEL--> C
      // B throws an error when fetched
      repo.setAnime(
        makeAnime(1, "Anime A", 2020, [makeRelation(2, "SEQUEL", "Anime B")]),
      );
      // Don't set B in the repo, but mock the error
      // Actually, let's override getAnimeWithRelations to throw for id=2
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

      // A should be collected, B should be skipped (error), C is not reachable
      // because B was the bridge and it failed
      expect(franchise.nodes.size).toBe(1);
      expect(franchise.nodes.has(1)).toBe(true);
    });
  });

  describe("custom followRelationTypes", () => {
    it("should traverse SIDE_STORY when configured", async () => {
      // A --SIDE_STORY--> B
      // Default: SIDE_STORY is not traversed
      // With custom config: SIDE_STORY is traversed
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

      // Default: should NOT traverse SIDE_STORY
      const defaultFranchise = await collector.collect(1);
      expect(defaultFranchise.nodes.size).toBe(1);

      // Custom: should traverse SIDE_STORY
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
      // C (2022) --PREQUEL--> A (2020) --SEQUEL--> B (2021)
      // Starting from A, which has SEQUEL→B and PREQUEL is from C's perspective
      // Actually, let's set it up so A has a PREQUEL (C) and a SEQUEL (B)
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

      // Main timeline should be ordered: A (2020), B (2021), C (2022)
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
      // A (2020) should come before B (null → 9999)
      expect(franchise.mainTimeline[0]!.id).toBe(1);
      expect(franchise.mainTimeline[1]!.id).toBe(2);
    });
  });
});
