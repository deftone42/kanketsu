import {
  AnimeRepository,
  AnimeSearchResult,
} from "@/core/ports/anime-repository";
import { Anime, AnimeRelation, AnimeStatus } from "@/core/domain/models/anime";
import {
  AniListGetByIdResponse,
  AniListRelationEdge,
  AniListSearchMediaItem,
  AniListSearchResponse,
} from "./dto/anilist-response.dto";
import { GET_ANIME_BY_ID_QUERY, SEARCH_ANIME_QUERY } from "./graphql/queries";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

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

      // Filtro de precuelas
      const mainSeriesOnly = rawMediaList.filter(
        (item: AniListSearchMediaItem) => {
          const hasPrequel = item.relations?.edges?.some(
            (edge: AniListRelationEdge) => edge.relationType === "PREQUEL",
          );
          return !hasPrequel;
        },
      );

      return mainSeriesOnly.map((item: AniListSearchMediaItem) => ({
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
      console.error("Error al buscar anime en AniList:", error);
      return [];
    }
  }

  async getAnimeById(id: number): Promise<Anime | null> {
    try {
      const response = await fetch(ANILIST_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: GET_ANIME_BY_ID_QUERY,
          variables: { id },
        }),
      });

      if (!response.ok) return null;

      const json = (await response.json()) as AniListGetByIdResponse;
      const media = json.data?.Media;

      if (!media) return null;

      return {
        id: media.id,
        title: {
          userPreferred: media.title.userPreferred || "",
          english: media.title.english || undefined,
          romaji: media.title.romaji || undefined,
          native: media.title.native || undefined,
        },
        coverImage: media.coverImage?.large || "",
        score: media.averageScore || null,
        status: media.status as AnimeStatus,
        episodes: media.episodes || null,
        releaseYear: media.startDate?.year || null,
        format: media.format || "UNKNOWN",
        nextAiringEpisode: media.nextAiringEpisode
          ? {
              episode: media.nextAiringEpisode.episode,
              timeUntilAiringSeconds: media.nextAiringEpisode.timeUntilAiring,
            }
          : null,
        relations:
          media.relations?.edges?.map((edge: AniListRelationEdge) => ({
            // 👈 Hacemos cast explícito al tipo literal que exige el Dominio
            relationType: edge.relationType as AnimeRelation["relationType"],
            status: edge.node.status as AnimeStatus,
            daysUntilAiring: edge.node.nextAiringEpisode
              ? Math.ceil(edge.node.nextAiringEpisode.timeUntilAiring / 86400)
              : null,
          })) || [],
      };
    } catch (error) {
      console.error("Error fetching anime detail from AniList:", error);
      return null;
    }
  }
}
