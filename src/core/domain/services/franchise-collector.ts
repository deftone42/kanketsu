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
import {
  CROSSOVER_RELATIONS,
  MAIN_TIMELINE_RELATIONS,
  RelationType,
} from "../models/relation";
import { RepositoryError } from "../errors/repository-errors";
import { AnimeRepository } from "../../ports/anime-repository";
import { summarizeFranchise } from "./summarize-franchise";

export interface FranchiseCollectorOptions {
  maxDepth?: number;
  followRelationTypes?: ReadonlySet<RelationType>;
  timelineFormats?: ReadonlySet<AnimeFormat>;
}

const DEFAULT_MAX_DEPTH = 10;
const DEFAULT_TIMELINE_FORMATS: ReadonlySet<AnimeFormat> = new Set<AnimeFormat>(
  ["TV", "TV_SHORT", "MOVIE", "SPECIAL"],
);

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

    const sources = this.collectSources(nodes, edges);

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

  private adjacentIds(
    edges: Map<string, FranchiseEdge>,
    requested: Set<number>,
  ): number[] {
    const adjacent = new Set<number>();
    for (const edge of edges.values()) {
      if (CROSSOVER_RELATIONS.has(edge.relationType)) continue;
      if (!requested.has(edge.sourceId)) continue;
      if (!requested.has(edge.targetId)) adjacent.add(edge.targetId);
    }
    return [...adjacent];
  }

  private collectSources(
    nodes: Map<number, FranchiseWork>,
    edges: Map<string, FranchiseEdge>,
  ): SourceWork[] {
    const sources = new Map<number, SourceWork>();

    for (const edge of edges.values()) {
      if (edge.relationType !== "ADAPTATION") continue;

      const ends = [nodes.get(edge.sourceId), nodes.get(edge.targetId)];
      const adapted = ends.find(
        (work): work is SourceWork => work !== undefined && isSourceWork(work),
      );
      const adapting = ends.find(
        (work): work is AnimeWork => work !== undefined && isAnimeWork(work),
      );

      if (adapted === undefined || adapting === undefined) continue;
      sources.set(adapted.id, adapted);
    }

    return [...sources.values()];
  }

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
