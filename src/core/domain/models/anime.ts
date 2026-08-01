export type AnimeFormat =
  | "TV"
  | "TV_SHORT"
  | "MOVIE"
  | "SPECIAL"
  | "OVA"
  | "ONA";

export type AnimeStatus =
  | "FINISHED"
  | "RELEASING"
  | "NOT_YET_RELEASED"
  | "CANCELLED"
  | "HIATUS";

export interface FranchiseMediaItem {
  id: number;
  title: string;
  format: AnimeFormat;
  episodes: number | null;
  score: number | null;
  status: AnimeStatus;
  releaseYear: number | null;
}

export interface Anime {
  // 1. Información común (Anclada a la primera temporada / Nodo raíz)
  id: number;
  title: {
    userPreferred: string;
    english?: string | null;
    romaji?: string | null;
    native?: string | null;
  };
  coverImage: string;
  releaseYear: number | null;
  endDate?: { year?: number | null } | null;

  // 2. Métricas globales de la franquicia (Para el evaluador)
  userScore: number | null;
  status: AnimeStatus;

  // Próximo episodio con el título de la temporada específica al que pertenece
  nextAiringEpisode?: {
    episode: number;
    timeUntilAiringSeconds: number;
    seasonTitle: string;
  } | null;

  // 3. Estructura de la franquicia
  franchise: {
    seasons: FranchiseMediaItem[];
    movies: FranchiseMediaItem[];
    totalEpisodes: number;
  };
}
