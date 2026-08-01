import { Anime, AnimeRelation } from "../../core/domain/models/anime";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapAniListMediaToAnime(rawMedia: any): Anime {
  const relations: AnimeRelation[] =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawMedia.relations?.edges?.map((edge: any) => ({
      relationType: edge.relationType,
      status: edge.node.status,
      format: edge.node.format, // <-- Extraído de GraphQL (TV, OVA, SPECIAL, etc.)
      daysUntilAiring: edge.node.nextAiringEpisode
        ? Math.ceil(edge.node.nextAiringEpisode.timeUntilAiringSeconds / 86400)
        : null,
    })) ?? [];

  return {
    id: rawMedia.id,
    title: {
      userPreferred: rawMedia.title.userPreferred,
      english: rawMedia.title.english,
      romaji: rawMedia.title.romaji,
      native: rawMedia.title.native,
    },
    coverImage: rawMedia.coverImage?.medium || rawMedia.coverImage?.large,
    userScore: rawMedia.meanScore ?? null,
    status: rawMedia.status,
    episodes: rawMedia.episodes ?? null,
    releaseYear: rawMedia.startDate?.year ?? rawMedia.releaseYear ?? null,
    endDate: rawMedia.endDate?.year ? { year: rawMedia.endDate.year } : null,
    format: rawMedia.format,
    nextAiringEpisode: rawMedia.nextAiringEpisode,
    relations,
  };
}
