export type AnimeFormat =
  | "TV"
  | "TV_SHORT"
  | "MOVIE"
  | "SPECIAL"
  | "OVA"
  | "ONA"
  | "MUSIC"
  | "MANGA"
  | "NOVEL"
  | "ONE_SHOT";

export type AnimeStatus =
  | "FINISHED"
  | "RELEASING"
  | "NOT_YET_RELEASED"
  | "CANCELLED"
  | "HIATUS";

export type AnimeRelationType =
  | "ADAPTATION"
  | "SEQUEL"
  | "PREQUEL"
  | "SIDE_STORY"
  | "PARENT"
  | "SPIN_OFF"
  | "ALTERNATIVE"
  | "CHARACTER"
  | "SUMMARY"
  | "SOURCE"
  | "COMPILATION"
  | "CONTAINS"
  | "OTHER";

export interface AnimeRelation {
  relationType: AnimeRelationType;
  status: AnimeStatus;
  format?: AnimeFormat | null;
  daysUntilAiring?: number | null;
}

export interface Anime {
  id: number;
  title: {
    userPreferred: string;
    english?: string | null;
    romaji?: string | null;
    native?: string | null;
  };
  coverImage: string;
  userScore: number | null;
  status: AnimeStatus;
  episodes: number | null;
  releaseYear: number | null;
  endDate?: { year?: number | null } | null;
  format?: AnimeFormat | null;
  nextAiringEpisode?: {
    episode: number;
    timeUntilAiringSeconds: number;
  } | null;
  relations: AnimeRelation[];
}
