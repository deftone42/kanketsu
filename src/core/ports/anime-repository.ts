import { Anime } from "../domain/models/anime";

export interface AnimeSearchResult {
  id: number;
  title: {
    userPreferred: string;
    english?: string;
    romaji?: string;
  };
  coverImage: string;
  releaseYear?: number | null;
  score?: number | null; // Nota oficial de AniList (0-100)
}

export interface AnimeRepository {
  searchAnime(query: string): Promise<AnimeSearchResult[]>;
  getAnimeById(id: number): Promise<Anime | null>;
}
