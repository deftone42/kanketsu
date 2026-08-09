import {
  AnimeRepository,
  AnimeSearchResult,
} from "@/core/ports/anime-repository";
import { FranchiseEdge, WorkBatch } from "@/core/domain/models/franchise";
import { FranchiseWork, WorkStub } from "@/core/domain/models/franchise-work";
import { RepositoryError } from "@/core/domain/errors/repository-errors";

export class InMemoryAnimeRepository implements AnimeRepository {
  private readonly works = new Map<number, FranchiseWork>();
  private readonly edges: FranchiseEdge[] = [];
  private readonly failures = new Map<number, RepositoryError>();

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

  failOn(id: number, error: RepositoryError): this {
    this.failures.set(id, error);
    return this;
  }

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

  private topologyAround(ids: number[]): FranchiseEdge[] {
    const sources = new Set(ids);

    for (const edge of this.edges) {
      if (ids.includes(edge.sourceId)) sources.add(edge.targetId);
    }

    return this.edges.filter((edge) => sources.has(edge.sourceId));
  }
}
