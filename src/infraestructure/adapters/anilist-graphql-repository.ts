import {
  AnimeRepository,
  AnimeSearchResult,
} from "@/core/ports/anime-repository";
import { Anime, AnimeStatus } from "@/core/domain/models/anime";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

const SEARCH_ANIME_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 5) {
      media(search: $search, type: ANIME, isAdult: false, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
        id
        title {
          userPreferred
          english
          romaji
        }
        coverImage {
          medium
        }
        startDate {
          year
        }
        averageScore
      }
    }
  }
`;

const GET_ANIME_BY_ID_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title {
        userPreferred
        english
        romaji
        native
      }
      coverImage {
        large
      }
      averageScore
      status
      episodes
      startDate {
        year
      }
      format
      nextAiringEpisode {
        episode
        timeUntilAiring
      }
      relations {
        edges {
          relationType
          node {
            id
            status
            nextAiringEpisode {
              timeUntilAiring
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
    // Permitir búsquedas desde 2 caracteres para mejor experiencia de autocompletado
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

      const json = await response.json();
      const rawMediaList = json.data?.Page?.media || [];

      // 🎯 FILTRO: Conservar solo las entradas principales (sin precuela)
      const mainSeriesOnly = rawMediaList.filter((item: any) => {
        const hasPrequel = item.relations?.edges?.some(
          (edge: any) => edge.relationType === "PREQUEL",
        );
        return !hasPrequel;
      });

      return mainSeriesOnly.map((item: any) => ({
        id: item.id,
        title: {
          userPreferred: item.title.userPreferred,
          english: item.title.english,
          romaji: item.title.romaji,
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

      const json = await response.json();
      const media = json.data?.Media;

      if (!media) return null;

      return {
        id: media.id,
        title: {
          userPreferred: media.title.userPreferred,
          english: media.title.english,
          romaji: media.title.romaji,
          native: media.title.native,
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
          media.relations?.edges?.map((edge: any) => ({
            relationType: edge.relationType,
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
