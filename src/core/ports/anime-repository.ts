import { WorkBatch } from "../domain/models/franchise";

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
  /**
   * Fetches many works in a single request, with three hops of relation
   * topology around each. Throws RepositoryError subclasses; never returns
   * null for a failure, so a rate limit cannot be mistaken for absence.
   */
  getWorksByIds(ids: number[]): Promise<WorkBatch>;
}
