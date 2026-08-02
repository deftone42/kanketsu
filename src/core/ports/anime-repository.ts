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
  score?: number | null;
}

export interface AnimeRepository {
  searchAnime(query: string): Promise<AnimeSearchResult[]>;
  getAnimeById(id: number): Promise<Anime | null>;
  /**
   * Fetches a single anime with its full relation edges populated.
   * The `relations` field contains all relation types (PREQUEL, SEQUEL, SIDE_STORY, etc.).
   * Used by the FranchiseCollector service for graph traversal.
   */
  getAnimeWithRelations(id: number): Promise<Anime | null>;
}
