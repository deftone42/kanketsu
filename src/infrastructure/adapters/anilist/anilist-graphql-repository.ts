import {
  AnimeRepository,
  AnimeSearchResult,
} from "@/core/ports/anime-repository";
import {
  Anime,
  AnimeFormat,
  AnimeStatus,
  FranchiseMediaItem,
} from "@/core/domain/models/anime";
import {
  AniListMediaItem,
  AniListSearchResponse,
} from "./dto/anilist-response.dto";
import { SEARCH_ANIME_QUERY } from "./graphql/queries";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

const MEDIA_BATCH_QUERY = `
  query ($ids: [Int]) {
    Page(perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        id
        title {
          userPreferred
          english
          romaji
          native
        }
        coverImage { large }
        format
        episodes
        averageScore
        status
        startDate { year }
        endDate { year }
        nextAiringEpisode {
          episode
          timeUntilAiring
        }
        relations {
          edges {
            node {
              id
              format
            }
          }
        }
      }
    }
  }
`;

export class AniListGraphQLRepository implements AnimeRepository {
  async searchAnime(query: string): Promise<AnimeSearchResult[]> {
    const cleanedQuery = query.trim();
    if (!cleanedQuery || cleanedQuery.length < 2) return [];

    try {
      const response = await fetch(ANILIST_ENDPOINT, {
        method: "POST",
        headers: {
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

      return rawMediaList.map((item: AniListSearchMediaItem) => ({
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

  /**
   * Función auxiliar recursiva para recorrer la red de la franquicia mediante lotes (BFS recursivo)
   */
  private async fetchFranchiseRecursive(
    currentBatchIds: number[],
    visitedIds: Set<number> = new Set(),
  ): Promise<AniListMediaItem[]> {
    const idsToFetch = currentBatchIds.filter((id) => !visitedIds.has(id));
    if (idsToFetch.length === 0) return [];

    idsToFetch.forEach((id) => visitedIds.add(id));

    try {
      const res = await fetch(ANILIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: MEDIA_BATCH_QUERY,
          variables: { ids: idsToFetch },
        }),
      });

      if (!res.ok) return [];
      const json = (await res.json()) as AniListSearchResponse;
      const fetchedMedia = json.data?.Page?.media || [];
      if (fetchedMedia.length === 0) return [];

      const nextBatchIds: number[] = [];
      for (const media of fetchedMedia) {
        const edges = media.relations?.edges || [];
        for (const edge of edges) {
          const targetNode = edge.node;
          if (targetNode?.id && !visitedIds.has(targetNode.id)) {
            nextBatchIds.push(targetNode.id);
          }
        }
      }

      // Llamada recursiva si se encontraron nuevas relaciones pendientes
      const deeperMedia =
        nextBatchIds.length > 0
          ? await this.fetchFranchiseRecursive(nextBatchIds, visitedIds)
          : [];

      return [...fetchedMedia, ...deeperMedia];
    } catch (error) {
      console.error("Error fetching franchise recursively:", error);
      return [];
    }
  }

  async getAnimeById(id: number): Promise<Anime | null> {
    try {
      const mediaList = await this.fetchFranchiseRecursive([id]);

      if (mediaList.length === 0) return null;

      // 3. SEPARAR TV Y PELÍCULAS DE LA FRANQUICIA OBTENIDA
      const tvItems = mediaList.filter(
        (m) =>
          m.format === "TV" ||
          m.format === "TV_SHORT" ||
          (m.format === null && m.status === "NOT_YET_RELEASED"),
      );
      const movieItems = mediaList.filter((m) => m.format === "MOVIE");

      // 2. IDENTIFICAR EL NODO RAÍZ (Priorizando series de TV por fecha de inicio para evitar PVs o tráilers)
      const sortedTvByDate = [...tvItems].sort((a, b) => {
        const yearA = a.startDate?.year || 9999;
        const yearB = b.startDate?.year || 9999;
        return yearA - yearB;
      });

      const sortedByStartDate = [...mediaList].sort((a, b) => {
        const yearA = a.startDate?.year || 9999;
        const yearB = b.startDate?.year || 9999;
        return yearA - yearB;
      });

      const rootMedia = sortedTvByDate[0] || sortedByStartDate[0];

      const seasons: FranchiseMediaItem[] = tvItems.map((m) => ({
        id: m.id,
        title: m.title?.userPreferred || "",
        format: m.format as AnimeFormat,
        episodes: m.episodes || null,
        score: m.averageScore || null,
        status: m.status as AnimeStatus,
        releaseYear: m.startDate?.year || null,
      }));

      const movies: FranchiseMediaItem[] = movieItems.map((m) => ({
        id: m.id,
        title: m.title?.userPreferred || "",
        format: m.format as AnimeFormat,
        episodes: m.episodes || null,
        score: m.averageScore || null,
        status: m.status as AnimeStatus,
        releaseYear: m.startDate?.year || null,
      }));

      const totalEpisodes = seasons.reduce(
        (acc, s) => acc + (s.episodes || 0),
        0,
      );

      // 4. PUNTUACIÓN Y ESTADOS GLOBALES
      const allItems = [...tvItems, ...movieItems];
      const validScores = allItems
        .map((m) => m.averageScore)
        .filter((score): score is number => score != null);

      const userScore =
        validScores.length > 0
          ? Math.round(
              validScores.reduce((acc, s) => acc + s, 0) / validScores.length,
            )
          : null;

      let nextAiringEpisode = null;
      for (const item of mediaList) {
        if (item.nextAiringEpisode) {
          nextAiringEpisode = {
            episode: item.nextAiringEpisode.episode,
            timeUntilAiringSeconds: item.nextAiringEpisode.timeUntilAiring,
            seasonTitle: item.title?.userPreferred || "",
          };
          break;
        }
      }

      const hasOngoing = tvItems.some((m) => m.status === "RELEASING");
      const hasUpcoming =
        tvItems.some((m) => m.status === "NOT_YET_RELEASED") ||
        nextAiringEpisode !== null;
      const isAllNotReleased =
        tvItems.length > 0 &&
        tvItems.every((m) => m.status === "NOT_YET_RELEASED");
      const isCancelled = tvItems.some((m) => m.status === "CANCELLED");
      const isHiatus = tvItems.some((m) => m.status === "HIATUS");

      let status: AnimeStatus = "FINISHED";
      if (isCancelled) status = "CANCELLED";
      else if (isHiatus) status = "HIATUS";
      else if (hasOngoing) status = "ONGOING";
      else if (hasUpcoming) status = "NEW_SEASON_COMING";
      else if (isAllNotReleased) status = "NOT_RELEASED";

      const releasedTvItems = tvItems.filter(
        (m) => m.status === "FINISHED" || m.status === "RELEASING",
      );
      const sortedByRecent = [
        ...(releasedTvItems.length > 0 ? releasedTvItems : tvItems),
      ].sort((a, b) => (b.startDate?.year || 0) - (a.startDate?.year || 0));
      const latestMedia = sortedByRecent[0] || rootMedia;

      return {
        id: rootMedia.id,
        title: {
          userPreferred: rootMedia.title?.userPreferred || "",
          english: rootMedia.title?.english || null,
          romaji: rootMedia.title?.romaji || null,
          native: rootMedia.title?.native || null,
        },
        coverImage: rootMedia.coverImage?.large || "",
        releaseYear: rootMedia.startDate?.year || null,
        endDate: latestMedia?.endDate?.year
          ? { year: latestMedia.endDate.year }
          : null,
        userScore,
        status,
        nextAiringEpisode,
        seasons,
        movies,
        totalEpisodes,
      };
    } catch (error) {
      console.error(
        "Error fetching structured franchise detail from AniList:",
        error,
      );
      return null;
    }
  }
}
