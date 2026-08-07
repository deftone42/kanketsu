import {
  AnimeRepository,
  AnimeSearchResult,
} from "@/core/ports/anime-repository";
import { FranchiseEdge, WorkBatch } from "@/core/domain/models/franchise";
import { FranchiseWork, WorkStub } from "@/core/domain/models/franchise-work";
import { RepositoryError } from "@/core/domain/errors/repository-errors";

/**
 * Domain test double. Holds works and edges in memory and answers batched
 * reads the same way the real adapter does, so collector tests need no
 * network and no MSW.
 */
export class InMemoryAnimeRepository implements AnimeRepository {
  private readonly works = new Map<number, FranchiseWork>();
  private readonly edges: FranchiseEdge[] = [];
  private readonly failures = new Map<number, RepositoryError>();

  /** Number of batched reads performed — asserts request efficiency. */
  requestCount = 0;

  addWork(work: FranchiseWork): this {
    this.works.set(work.id, work);
    return this;
  }

  addEdge(
    sourceId: number,
    relationType: FranchiseEdge["relationType"],
    targetId: number,
  ): this {
    this.edges.push({ sourceId, targetId, relationType });
    return this;
  }

  /** Makes any batch containing this id reject with the given error. */
  failOn(id: number, error: RepositoryError): this {
    this.failures.set(id, error);
    return this;
  }

  /** Search is not exercised by collector tests. */
  async searchAnime(): Promise<AnimeSearchResult[]> {
    return [];
  }

  async getWorksByIds(ids: number[]): Promise<WorkBatch> {
    this.requestCount += 1;

    for (const id of ids) {
      const failure = this.failures.get(id);
      if (failure) throw failure;
    }

    const works = ids
      .map((id) => this.works.get(id))
      .filter((work): work is FranchiseWork => work !== undefined);

    const edges = this.topologyAround(ids);

    const hydrated = new Set(works.map((work) => work.id));
    const stubs: WorkStub[] = edges
      .filter((edge) => !hydrated.has(edge.targetId))
      .map((edge) => {
        const target = this.works.get(edge.targetId);
        return {
          id: edge.targetId,
          kind: target?.kind ?? "ANIME",
          format:
            target && target.kind === "ANIME" ? target.format : null,
          title: target?.title.userPreferred ?? "",
        };
      });

    return { works, edges, stubs };
  }

  /**
   * Edges the real adapter would report for these ids. `FRANCHISE_BATCH_QUERY`
   * nests `relations` three deep, so a response carries edges leaving the
   * requested works *and* edges leaving their immediate neighbours. Modelling
   * only the first hop would hide the crossover leak this fake exists to catch.
   */
  private topologyAround(ids: number[]): FranchiseEdge[] {
    const sources = new Set(ids);

    for (const edge of this.edges) {
      if (ids.includes(edge.sourceId)) sources.add(edge.targetId);
    }

    return this.edges.filter((edge) => sources.has(edge.sourceId));
  }
}
