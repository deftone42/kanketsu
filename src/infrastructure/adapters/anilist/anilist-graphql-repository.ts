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
        startDate { year month day }
        endDate { year month day }
        nextAiringEpisode {
          episode
          timeUntilAiring
        }
        relations {
          edges {
            relationType
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

const VALID_FRANCHISE_RELATIONS = new Set(["SEQUEL", "PREQUEL"]);

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
          if (
            edge.relationType &&
            VALID_FRANCHISE_RELATIONS.has(edge.relationType)
          ) {
            const targetNode = edge.node;
            if (targetNode?.id && !visitedIds.has(targetNode.id)) {
              nextBatchIds.push(targetNode.id);
            }
          }
        }
      }

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

      const tvItems = mediaList.filter(
        (m) =>
          m.format === "TV" ||
          m.format === "TV_SHORT" ||
          (m.format === null && m.status === "NOT_YET_RELEASED"),
      );
      const movieItems = mediaList.filter((m) => m.format === "MOVIE");

      const getDateWeight = (date?: {
        year?: number | null;
        month?: number | null;
        day?: number | null;
      }) => {
        if (!date?.year) return 99999999;
        const year = date.year;
        const month = date.month || 1;
        const day = date.day || 1;
        return year * 10000 + month * 100 + day;
      };

      const sortedTv = [...tvItems].sort((a, b) => {
        return getDateWeight(a.startDate) - getDateWeight(b.startDate);
      });

      const requestedItem = mediaList.find((m) => m.id === id);
      const rootMedia = sortedTv[0] || requestedItem || mediaList[0];

      const seasons: FranchiseMediaItem[] = sortedTv.map((m) => ({
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

      // CÁLCULO MEJORADO DE EPISODIOS: Si episodes es null pero está en emisión, estimamos con nextAiringEpisode
      const totalEpisodes = tvItems.reduce((acc, m) => {
        if (m.episodes) return acc + m.episodes;
        if (m.status === "RELEASING" && m.nextAiringEpisode?.episode) {
          return acc + (m.nextAiringEpisode.episode - 1);
        }
        return acc;
      }, 0);

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
      ].sort((a, b) => getDateWeight(b.startDate) - getDateWeight(a.startDate));
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
        totalEpisodes: nextAiringEpisode
          ? nextAiringEpisode?.episode - 1
          : totalEpisodes,
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
