import {
  AnimeRepository,
  AnimeSearchResult,
} from "@/core/ports/anime-repository";
import { WorkBatch } from "@/core/domain/models/franchise";
import {
  RateLimitedError,
  RepositoryUnavailableError,
} from "@/core/domain/errors/repository-errors";
import {
  AniListBatchResponse,
  AniListSearchResponse,
} from "./dto/anilist-response.dto";
import { mapBatchResponse } from "./mappers/franchise-work-mapper";
import { FRANCHISE_BATCH_QUERY, SEARCH_ANIME_QUERY } from "./graphql/queries";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

/** AniList accepts at most 50 ids per page. */
const MAX_IDS_PER_REQUEST = 50;

function chunk(ids: number[], size: number): number[][] {
  const chunks: number[][] = [];
  for (let index = 0; index < ids.length; index += size) {
    chunks.push(ids.slice(index, index + size));
  }
  return chunks;
}

function parseRetryAfter(response: Response): number | null {
  const header = response.headers.get("Retry-After");
  if (header === null) return null;
  const seconds = Number.parseInt(header, 10);
  return Number.isNaN(seconds) ? null : seconds;
}

async function fetchBatch(ids: number[]): Promise<WorkBatch> {
  let response: Response;
  try {
    response = await fetch(ANILIST_ENDPOINT, {
      method: "POST",
      headers: {
        "User-Agent": "AniTime/1.0",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: FRANCHISE_BATCH_QUERY,
        variables: { ids },
      }),
    });
  } catch (error) {
    throw new RepositoryUnavailableError(
      `Could not reach AniList: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }

  if (response.status === 429) {
    throw new RateLimitedError(parseRetryAfter(response));
  }

  if (!response.ok) {
    throw new RepositoryUnavailableError(
      `AniList responded with HTTP ${response.status}`,
    );
  }

  let body: AniListBatchResponse;
  try {
    body = (await response.json()) as AniListBatchResponse;
  } catch {
    throw new RepositoryUnavailableError(
      "AniList returned a response we could not parse",
    );
  }

  return mapBatchResponse(body);
}

export class AniListGraphQLRepository implements AnimeRepository {
  async searchAnime(query: string): Promise<AnimeSearchResult[]> {
    const cleanedQuery = query.trim();
    if (!cleanedQuery || cleanedQuery.length < 2) return [];

    try {
      const response = await fetch(ANILIST_ENDPOINT, {
        method: "POST",
        headers: {
          "User-Agent": "AniTime/1.0",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: SEARCH_ANIME_QUERY,
          variables: { search: cleanedQuery },
        }),
      });

      if (!response.ok) return [];

      const json = (await response.json()) as AniListSearchResponse;
      const rawMediaList = json.data?.Page?.media || [];

      return rawMediaList.map((item) => ({
        id: item.id,
        title: {
          userPreferred: item.title.userPreferred || "",
          english: item.title.english || undefined,
          romaji: item.title.romaji || undefined,
        },
        coverImage: item.coverImage?.medium || "",
        releaseYear: item.startDate?.year || null,
        score: item.averageScore || null,
      }));
    } catch (error) {
      console.error("Error searching anime in AniList:", error);
      return [];
    }
  }

  async getWorksByIds(ids: number[]): Promise<WorkBatch> {
    if (ids.length === 0) return { works: [], edges: [], stubs: [] };

    const batches = await Promise.all(
      chunk(ids, MAX_IDS_PER_REQUEST).map((batchIds) => fetchBatch(batchIds)),
    );

    return {
      works: batches.flatMap((batch) => batch.works),
      edges: batches.flatMap((batch) => batch.edges),
      stubs: batches.flatMap((batch) => batch.stubs),
    };
  }
}
