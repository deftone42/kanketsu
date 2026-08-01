export type AnimeStatus =
  | "FINISHED"
  | "RELEASING"
  | "NOT_YET_RELEASED"
  | "CANCELLED"
  | "HIATUS";

export type AnimeRelationType =
  | "SEQUEL"
  | "PREQUEL"
  | "SIDE_STORY"
  | "PARENT"
  | "SPIN_OFF"
  | "ALTERNATIVE"
  | "SUMMARY"
  | "OTHER";

export interface AnimeRelation {
  relationType: AnimeRelationType;
  status:
    | "FINISHED"
    | "RELEASING"
    | "NOT_YET_RELEASED"
    | "CANCELLED"
    | "HIATUS";
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
  userScore: number | null;
  status: AnimeStatus;
  episodes?: number | null;
  releaseYear?: number | null;
  endDate?: { year: number | null } | null;
  format: string;
  nextAiringEpisode: {
    episode: number;
    timeUntilAiringSeconds: number;
  } | null;
  relations?: AnimeRelation[];
}
