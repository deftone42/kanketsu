export type AnimeStatus =
  | "FINISHED"
  | "RELEASING"
  | "NOT_YET_RELEASED"
  | "CANCELLED"
  | "HIATUS";

export interface AnimeRelation {
  relationType: "SEQUEL" | "PREQUEL" | "SIDE_STORY" | "SUMMARY" | "OTHER";
  status: AnimeStatus;
  daysUntilAiring?: number | null;
}

export interface Anime {
  id: number;
  title: {
    userPreferred: string;
    english?: string;
    romaji?: string;
    native?: string;
  };
  coverImage: string;
  score?: number | null; // Puntuación de 0 a 100
  status: AnimeStatus;
  episodes?: number | null;
  releaseYear?: number | null;
  format?: string;
  nextAiringEpisode?: {
    episode: number;
    timeUntilAiringSeconds: number;
  } | null;
  relations?: AnimeRelation[];
}
