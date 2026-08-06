export type AnimeFormat =
  | "TV"
  | "TV_SHORT"
  | "MOVIE"
  | "SPECIAL"
  | "OVA"
  | "ONA";

export type AnimeStatus =
  | "FINISHED"
  | "ONGOING"
  | "NEW_SEASON_COMING"
  | "NOT_RELEASED"
  | "CANCELLED"
  | "HIATUS";

export interface FranchiseMediaItem {
  id: number;
  title: string;
  format: AnimeFormat | null;
  episodes: number | null;
  score: number | null;
  status: AnimeStatus;
  releaseYear: number | null;
}

import type { Relation } from "./relation";

export type { Relation, RelationType } from "./relation";

export interface Anime {
  id: number;
  title: {
    userPreferred: string;
    english?: string | null;
    romaji?: string | null;
    native?: string | null;
  };
  coverImage: string;
  format: AnimeFormat | null;
  releaseYear: number | null;
  endDate?: { year?: number | null } | null;
  userScore: number | null;
  status: AnimeStatus;
  nextAiringEpisode?: {
    episode: number;
    timeUntilAiringSeconds: number;
    seasonTitle: string;
  } | null;
  seasons: FranchiseMediaItem[];
  movies: FranchiseMediaItem[];
  totalEpisodes: number;
  relations: Relation[];
}
