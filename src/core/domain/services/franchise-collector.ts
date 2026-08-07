import { AnimeFormat } from "../models/anime";
import { Franchise, FranchiseEdge } from "../models/franchise";
import {
  AnimeWork,
  FranchiseWork,
  SourceWork,
  isAnimeWork,
  isSourceWork,
} from "../models/franchise-work";
import { comparePartialDates } from "../models/partial-date";
import { MAIN_TIMELINE_RELATIONS, RelationType } from "../models/relation";
import { RepositoryError } from "../errors/repository-errors";
import { AnimeRepository } from "../../ports/anime-repository";
import { summarizeFranchise } from "./summarize-franchise";

export interface FranchiseCollectorOptions {
  /** Maximum traversal depth. Safety valve against malformed graphs. */
  maxDepth?: number;
  /** Relation types that extend the timeline. Default: PREQUEL and SEQUEL. */
  followRelationTypes?: ReadonlySet<RelationType>;
  /** Formats allowed on the timeline. Others are collected as related works. */
  timelineFormats?: ReadonlySet<AnimeFormat>;
}

const DEFAULT_MAX_DEPTH = 10;
const DEFAULT_TIMELINE_FORMATS: ReadonlySet<AnimeFormat> = new Set<AnimeFormat>(
  ["TV", "TV_SHORT", "MOVIE", "SPECIAL"],
);

/**
 * Collects a complete franchise into our own model.
 *
 * Traverses one *frontier* at a time rather than one node at a time: every
 * unvisited work at the current depth is fetched in a single batched read.
 * Nested topology in each response reveals ids further ahead, so a linear
 * chain costs roughly one request per three entries instead of one per entry.
 *
 * Honesty guarantees:
 * - A work that genuinely does not exist is skipped; traversal continues.
 * - A rate limit or outage stops traversal and sets `isComplete: false`
 *   with the outstanding ids in `unresolvedIds`. A partial franchise is
 *   never presented as a whole one.
 */
export class FranchiseCollector {
  constructor(private readonly repository: AnimeRepository) {}

  async collect(
    rootId: number,
    options?: FranchiseCollectorOptions,
  ): Promise<Franchise> {
    const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
    const followTypes = options?.followRelationTypes ?? MAIN_TIMELINE_RELATIONS;
    const timelineFormats = options?.timelineFormats ?? DEFAULT_TIMELINE_FORMATS;

    const nodes = new Map<number, FranchiseWork>();
    const edges = new Map<string, FranchiseEdge>();
    const requested = new Set<number>();
    const unresolved = new Set<number>();

    let frontier: number[] = [rootId];
    let depth = 0;
    let isComplete = true;

    while (frontier.length > 0) {
      if (depth > maxDepth) {
        frontier.forEach((id) => unresolved.add(id));
        isComplete = false;
        break;
      }

      frontier.forEach((id) => requested.add(id));

      try {
        const batch = await this.repository.getWorksByIds(frontier);

        batch.works.forEach((work) => nodes.set(work.id, work));
        batch.edges.forEach((edge) =>
          edges.set(
            `${edge.sourceId}:${edge.relationType}:${edge.targetId}`,
            edge,
          ),
        );
      } catch (error) {
        if (error instanceof RepositoryError) {
          frontier
            .filter((id) => !nodes.has(id))
            .forEach((id) => unresolved.add(id));
          isComplete = false;
          break;
        }
        throw error;
      }

      frontier = this.nextFrontier(edges, nodes, requested, followTypes);
      depth += 1;
    }

    // One final read hydrates everything adjacent that we never traversed:
    // movies, OVAs, specials and the written sources.
    if (isComplete) {
      const adjacent = this.adjacentIds(edges, requested);
      if (adjacent.length > 0) {
        try {
          const batch = await this.repository.getWorksByIds(adjacent);
          batch.works.forEach((work) => nodes.set(work.id, work));
          batch.edges.forEach((edge) =>
            edges.set(
              `${edge.sourceId}:${edge.relationType}:${edge.targetId}`,
              edge,
            ),
          );
          adjacent.forEach((id) => requested.add(id));
        } catch (error) {
          if (!(error instanceof RepositoryError)) throw error;
          adjacent.forEach((id) => unresolved.add(id));
          isComplete = false;
        }
      }
    }

    const timeline = this.buildTimeline(
      rootId,
      nodes,
      edges,
      followTypes,
      timelineFormats,
    );
    const timelineIds = new Set(timeline.map((work) => work.id));

    const related = [...nodes.values()]
      .filter(isAnimeWork)
      .filter((work) => !timelineIds.has(work.id))
      .sort((a, b) => comparePartialDates(a.startDate, b.startDate));

    const sources: SourceWork[] = [...nodes.values()].filter(isSourceWork);

    return {
      rootId,
      nodes,
      edges: [...edges.values()],
      timeline,
      related,
      sources,
      summary: summarizeFranchise(timeline, related, sources),
      isComplete,
      unresolvedIds: [...unresolved],
    };
  }

  /** Unvisited works reachable from what we have, along followed relations. */
  private nextFrontier(
    edges: Map<string, FranchiseEdge>,
    nodes: Map<number, FranchiseWork>,
    requested: Set<number>,
    followTypes: ReadonlySet<RelationType>,
  ): number[] {
    const next = new Set<number>();

    for (const edge of edges.values()) {
      if (!followTypes.has(edge.relationType)) continue;
      if (!nodes.has(edge.sourceId) && !requested.has(edge.sourceId)) continue;
      if (requested.has(edge.targetId)) continue;
      next.add(edge.targetId);
    }

    return [...next];
  }

  /**
   * Ids reachable from a starting work along followed relations, in either
   * direction — a chain is the same chain whether AniList models the link as
   * the sequel's PREQUEL or the prequel's SEQUEL.
   */
  private reachableFrom(
    rootId: number,
    edges: Map<string, FranchiseEdge>,
    followTypes: ReadonlySet<RelationType>,
  ): Set<number> {
    const followed = [...edges.values()].filter((edge) =>
      followTypes.has(edge.relationType),
    );

    const reachable = new Set<number>([rootId]);
    const queue: number[] = [rootId];

    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const edge of followed) {
        const neighbour =
          edge.sourceId === current
            ? edge.targetId
            : edge.targetId === current
              ? edge.sourceId
              : null;

        if (neighbour === null || reachable.has(neighbour)) continue;
        reachable.add(neighbour);
        queue.push(neighbour);
      }
    }

    return reachable;
  }

  /**
   * Everything one edge away *from a work we actually collected*, that
   * traversal never asked for.
   *
   * The source check is the whole point. A batch response nests `relations`
   * three deep, so it also reports edges leaving works that merely neighbour
   * the franchise. Taking every target regardless of origin walks two hops
   * through a crossover into an unrelated series: One Piece links by CHARACTER
   * to a Nissin commercial, which links by CHARACTER to Sazae-san, whose
   * weekly episode then won the franchise's "next episode" pick.
   */
  private adjacentIds(
    edges: Map<string, FranchiseEdge>,
    requested: Set<number>,
  ): number[] {
    const adjacent = new Set<number>();
    for (const edge of edges.values()) {
      if (!requested.has(edge.sourceId)) continue;
      if (!requested.has(edge.targetId)) adjacent.add(edge.targetId);
    }
    return [...adjacent];
  }

  /**
   * The timeline: the chain the selected work actually belongs to, restricted
   * to timeline formats and ordered by release date. The selected work is
   * always present so the UI can highlight it even when its format is excluded.
   *
   * Membership is *reachability from the root* along followed relations, not
   * merely touching a followed edge. Franchises routinely contain self-contained
   * sequel chains — recap movies, chibi shorts — that would otherwise merge into
   * the main line despite connecting to it only through a SPIN_OFF or PARENT edge.
   */
  private buildTimeline(
    rootId: number,
    nodes: Map<number, FranchiseWork>,
    edges: Map<string, FranchiseEdge>,
    followTypes: ReadonlySet<RelationType>,
    timelineFormats: ReadonlySet<AnimeFormat>,
  ): AnimeWork[] {
    const timelineIds = this.reachableFrom(rootId, edges, followTypes);

    return [...timelineIds]
      .map((id) => nodes.get(id))
      .filter((work): work is FranchiseWork => work !== undefined)
      .filter(isAnimeWork)
      .filter(
        (work) =>
          work.id === rootId ||
          work.format === null ||
          timelineFormats.has(work.format),
      )
      .sort((a, b) => comparePartialDates(a.startDate, b.startDate));
  }
}
