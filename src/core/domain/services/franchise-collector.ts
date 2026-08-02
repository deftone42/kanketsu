import { Anime } from "../models/anime";
import { Franchise, FranchiseEdge } from "../models/franchise";
import { MAIN_TIMELINE_RELATIONS, RelationType } from "../models/relation";
import { AnimeRepository } from "../../ports/anime-repository";

export interface FranchiseCollectorOptions {
  /** Maximum BFS traversal depth. Default: 10. Safety valve to prevent infinite traversal. */
  maxDepth?: number;
  /**
   * Which relation types to traverse (add to BFS queue).
   * Default: PREQUEL and SEQUEL (main timeline).
   * All relation types are still SAVED on each node regardless of this setting.
   */
  followRelationTypes?: ReadonlySet<RelationType>;
}

const DEFAULT_MAX_DEPTH = 10;
const DEFAULT_FOLLOW_TYPES: ReadonlySet<RelationType> = MAIN_TIMELINE_RELATIONS;

/**
 * Domain service that collects a complete anime franchise via BFS graph traversal.
 *
 * Algorithm:
 * 1. Start from a root anime ID (the season the user searched for).
 * 2. Fetch the anime with its full relation edges via the repository port.
 * 3. Save ALL relation edges (metadata for future use).
 * 4. But only TRAVERSE (add to BFS queue) nodes connected via followRelationTypes
 *    (default: PREQUEL/SEQUEL — the main timeline).
 * 5. Repeat until the queue is empty or maxDepth is reached.
 * 6. Build the ordered main timeline (sorted by release year).
 *
 * Guarantees:
 * - Never visits the same node twice (cycle detection via Set).
 * - Never duplicates nodes or edges.
 * - Error-resilient: failed fetches are logged and skipped, traversal continues.
 * - Depth-limited: safety valve prevents infinite traversal on malformed graphs.
 */
export class FranchiseCollector {
  constructor(private readonly repo: AnimeRepository) {}

  async collect(
    rootId: number,
    options?: FranchiseCollectorOptions,
  ): Promise<Franchise> {
    const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
    const followTypes = options?.followRelationTypes ?? DEFAULT_FOLLOW_TYPES;

    const nodes = new Map<number, Anime>();
    const edges: FranchiseEdge[] = [];
    const visited = new Set<number>();

    // BFS queue: { id, depth }
    const queue: { id: number; depth: number }[] = [{ id: rootId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;

      // Cycle detection: skip if already visited
      if (visited.has(id)) continue;
      visited.add(id);

      // Depth limit: safety valve
      if (depth > maxDepth) {
        console.warn(
          `[FranchiseCollector] Skipping node ${id} at depth ${depth} (exceeds maxDepth ${maxDepth})`,
        );
        continue;
      }

      // Fetch the anime with relations (error-resilient)
      let anime: Anime | null;
      try {
        anime = await this.repo.getAnimeWithRelations(id);
      } catch (error) {
        console.error(
          `[FranchiseCollector] Failed to fetch anime ${id}:`,
          error,
        );
        continue;
      }

      if (!anime) {
        console.warn(`[FranchiseCollector] Anime ${id} not found, skipping`);
        continue;
      }

      // Save the node
      nodes.set(id, anime);

      // Save ALL relation edges + queue up traversable ones
      for (const relation of anime.relations) {
        edges.push({ sourceId: id, relation });

        // Only traverse followTypes (default: PREQUEL/SEQUEL)
        if (followTypes.has(relation.relationType)) {
          if (!visited.has(relation.id)) {
            queue.push({ id: relation.id, depth: depth + 1 });
          }
        }
      }
    }

    // Build the ordered main timeline
    const mainTimeline = this.buildMainTimeline(rootId, nodes, edges, followTypes);

    return { rootId, nodes, edges, mainTimeline };
  }

  /**
   * Builds the ordered main timeline from collected nodes and edges.
   *
   * The main timeline consists of all nodes connected via followRelationTypes
   * (default: PREQUEL/SEQUEL), sorted by release year.
   *
   * The root node is always included, even if it has no PREQUEL/SEQUEL relations.
   */
  private buildMainTimeline(
    rootId: number,
    nodes: Map<number, Anime>,
    edges: FranchiseEdge[],
    followTypes: ReadonlySet<RelationType>,
  ): Anime[] {
    // Collect all node IDs connected via followTypes
    const mainTimelineIds = new Set<number>([rootId]);

    for (const edge of edges) {
      if (followTypes.has(edge.relation.relationType)) {
        mainTimelineIds.add(edge.sourceId);
        mainTimelineIds.add(edge.relation.id);
      }
    }

    // Filter to only include nodes that were actually fetched, then sort by year
    return Array.from(mainTimelineIds)
      .map((id) => nodes.get(id))
      .filter((a): a is Anime => a !== undefined)
      .sort((a, b) => {
        const yearA = a.releaseYear ?? 9999;
        const yearB = b.releaseYear ?? 9999;
        return yearA - yearB;
      });
  }
}