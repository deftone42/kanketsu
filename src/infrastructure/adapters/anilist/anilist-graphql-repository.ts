import {
  AnimeRepository,
  AnimeSearchResult,
} from "@/core/ports/anime-repository";
import {
  Anime,
  AnimeStatus,
  FranchiseMediaItem,
} from "@/core/domain/models/anime";
import {
  AniListSearchMediaItem,
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

  async getAnimeById(id: number): Promise<Anime | null> {
    try {
      const visitedIds = new Set<number>();
      let currentBatchIds: number[] = [id];
      const mediaList: any[] = [];

      // Recorrido BFS natural que se detiene cuando no hay más relaciones que explorar
      while (currentBatchIds.length > 0) {
        const idsToFetch = currentBatchIds.filter((id) => !visitedIds.has(id));
        if (idsToFetch.length === 0) break;

        idsToFetch.forEach((id) => visitedIds.add(id));

        const res = await fetch(ANILIST_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: MEDIA_BATCH_QUERY,
            variables: { ids: idsToFetch },
          }),
        });

        if (!res.ok) continue;
        const json = await res.json();
        const fetchedMedia = json.data?.Page?.media || [];
        if (fetchedMedia.length === 0) continue;

        const nextBatchIdsSet = new Set<number>();

        for (const media of fetchedMedia) {
          mediaList.push(media);

          // Extraer los IDs relacionados usando edges para la siguiente iteración
          const edges = media.relations?.edges || [];
          for (const edge of edges) {
            const targetNode = edge.node;
            if (targetNode?.id && !visitedIds.has(targetNode.id)) {
              nextBatchIdsSet.add(targetNode.id);
            }
          }
        }

        currentBatchIds = Array.from(nextBatchIdsSet);
      }

      if (mediaList.length === 0) return null;

      // 3. SEPARAR TV Y PELÍCULAS DE LA FRANQUICIA OBTENIDA
      // Excluimos ONA y SPECIAL de las series de TV; solo aceptamos TV, TV_SHORT o null con status NOT_YET_RELEASED
      const tvItems = mediaList.filter(
        (m: any) =>
          m.format === "TV" ||
          m.format === "TV_SHORT" ||
          (m.format === null && m.status === "NOT_YET_RELEASED"),
      );
      const movieItems = mediaList.filter((m: any) => m.format === "MOVIE");

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

      const seasons: FranchiseMediaItem[] = tvItems.map((m: any) => ({
        id: m.id,
        title: m.title?.userPreferred || "",
        format: m.format,
        episodes: m.episodes || null,
        score: m.averageScore || null,
        status: m.status,
        releaseYear: m.startDate?.year || null,
      }));

      const movies: FranchiseMediaItem[] = movieItems.map((m: any) => ({
        id: m.id,
        title: m.title?.userPreferred || "",
        format: m.format,
        episodes: m.episodes || null,
        score: m.averageScore || null,
        status: m.status,
        releaseYear: m.startDate?.year || null,
      }));

      const totalEpisodes = seasons.reduce(
        (acc, s) => acc + (s.episodes || 0),
        0,
      );

      // 4. PUNTUACIÓN Y ESTADOS GLOBALES
      const allItems = [...tvItems, ...movieItems];
      const validScores = allItems
        .map((m: any) => m.averageScore)
        .filter((score: number | null): score is number => score != null);

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

      const hasOngoing = tvItems.some((m: any) => m.status === "RELEASING");
      const hasUpcoming =
        tvItems.some((m: any) => m.status === "NOT_YET_RELEASED") ||
        nextAiringEpisode !== null;
      const isAllNotReleased =
        tvItems.length > 0 &&
        tvItems.every((m: any) => m.status === "NOT_YET_RELEASED");
      const isCancelled = tvItems.some((m: any) => m.status === "CANCELLED");
      const isHiatus = tvItems.some((m: any) => m.status === "HIATUS");

      let status: AnimeStatus = "FINISHED";
      if (isCancelled) status = "CANCELLED";
      else if (isHiatus) status = "HIATUS";
      else if (hasOngoing) status = "ONGOING";
      else if (hasUpcoming) status = "NEW_SEASON_COMING";
      else if (isAllNotReleased) status = "NOT_RELEASED";

      const releasedTvItems = tvItems.filter(
        (m: any) => m.status === "FINISHED" || m.status === "RELEASING",
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
