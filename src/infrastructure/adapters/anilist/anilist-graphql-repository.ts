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
import {
  GET_ANIME_BY_ID_QUERY,
  SEARCH_ANIME_QUERY,
  SEARCH_FRANCHISE_MEDIA_QUERY,
} from "./graphql/queries";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";

export class AniListGraphQLRepository implements AnimeRepository {
  private sanitizeTitle(title: string): string {
    return title.replace(/[\[\]()【】]/g, "").trim();
  }

  private async resolveRootNode(
    animeId: number,
  ): Promise<{ id: number; title: string; coverImage: string }> {
    try {
      const response = await fetch(ANILIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query ($id: Int) {
              Media(id: $id, type: ANIME) {
                id
                title { userPreferred }
                coverImage { large }
                relations {
                  edges {
                    relationType
                    node {
                      id
                      title { userPreferred }
                      coverImage { large }
                    }
                  }
                }
              }
            }
          `,
          variables: { id: animeId },
        }),
      });

      if (!response.ok) {
        return { id: animeId, title: "", coverImage: "" };
      }

      const json = await response.json();
      const media = json.data?.Media;
      if (!media) return { id: animeId, title: "", coverImage: "" };

      const edges = media.relations?.edges || [];
      const prequelEdge = edges.find((e: any) => e.relationType === "PREQUEL");

      if (prequelEdge && prequelEdge.node?.id) {
        return await this.resolveRootNode(prequelEdge.node.id);
      }

      return {
        id: media.id,
        title: media.title?.userPreferred || "",
        coverImage: media.coverImage?.large || "",
      };
    } catch {
      return { id: animeId, title: "", coverImage: "" };
    }
  }

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
      // 1. Encontramos el nodo raíz (Primera temporada) para la identidad visual
      const rootNode = await this.resolveRootNode(id);
      const cleanTitle = this.sanitizeTitle(rootNode.title);

      // 2. Buscamos toda la franquicia usando la query específica de franquicia
      const response = await fetch(ANILIST_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: SEARCH_FRANCHISE_MEDIA_QUERY,
          variables: { search: cleanTitle },
        }),
      });

      if (!response.ok) return null;

      const json = await response.json();
      const mediaList = json.data?.Page?.media || [];

      if (mediaList.length === 0) return null;

      // 3. Separación estricta de TV/TV_SHORT y MOVIE
      const tvItems = mediaList.filter(
        (m: any) => m.format === "TV" || m.format === "TV_SHORT",
      );
      const movieItems = mediaList.filter((m: any) => m.format === "MOVIE");

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

      // Suma exclusiva de episodios de TV
      const totalEpisodes = seasons.reduce(
        (acc, s) => acc + (s.episodes || 0),
        0,
      );

      // User Score unificado (media de todas las temporadas y películas con nota)
      const allItems = [...tvItems, ...movieItems];
      const validScores = allItems
        .map((m: any) => m.averageScore)
        .filter(
          (score: number | null): score is number =>
            score !== null && score !== undefined,
        );

      const userScore =
        validScores.length > 0
          ? Math.round(
              validScores.reduce((acc, s) => acc + s, 0) / validScores.length,
            )
          : null;

      // Ordenar por fecha para encontrar el elemento más reciente
      const sortedByDate = [...mediaList].sort((a, b) => {
        const yearA = a.startDate?.year || 0;
        const yearB = b.startDate?.year || 0;
        return yearB - yearA;
      });

      const latestMedia = sortedByDate[0];
      const status = (latestMedia?.status || "FINISHED") as AnimeStatus;

      // Buscar si hay algún próximo episodio en toda la franquicia
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

      // Obtener detalles completos de la raíz para traducciones de títulos e imagen
      const rootResponse = await fetch(ANILIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: GET_ANIME_BY_ID_QUERY,
          variables: { id: rootNode.id },
        }),
      });

      const rootJson = rootResponse.ok ? await rootResponse.json() : null;
      const rootMedia = rootJson?.data?.Media;

      return {
        id: rootNode.id,
        title: {
          userPreferred: rootMedia?.title?.userPreferred || rootNode.title,
          english: rootMedia?.title?.english || null,
          romaji: rootMedia?.title?.romaji || null,
          native: rootMedia?.title?.native || null,
        },
        coverImage: rootNode.coverImage || rootMedia?.coverImage?.large || "",
        releaseYear: rootMedia?.startDate?.year || null,
        endDate: latestMedia?.endDate?.year
          ? { year: latestMedia.endDate.year }
          : null,
        userScore,
        status,
        nextAiringEpisode,
        franchise: {
          seasons,
          movies,
          totalEpisodes,
        },
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
