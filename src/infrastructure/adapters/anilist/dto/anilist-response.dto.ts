export interface AniListTitle {
  userPreferred?: string | null;
  english?: string | null;
  romaji?: string | null;
  native?: string | null;
}

export interface AniListCoverImage {
  medium?: string | null;
  large?: string | null;
}

export interface AniListDate {
  year?: number | null;
  month?: number | null;
  day?: number | null;
}

export interface AniListNextAiringEpisode {
  episode: number;
  timeUntilAiring: number;
}

/** A row from the search query — deliberately lean, search fetches little. */
export interface AniListSearchMediaItem {
  id: number;
  title: AniListTitle;
  coverImage?: AniListCoverImage;
  startDate?: AniListDate;
  averageScore?: number | null;
}

export interface AniListSearchResponse {
  data?: {
    Page?: {
      media?: AniListSearchMediaItem[];
    };
  };
}

/** A node inside a nested `relations` projection: topology only. */
export interface AniListNestedNode {
  id: number;
  type?: string | null;
  format?: string | null;
  title?: AniListTitle;
  relations?: { edges?: AniListNestedEdge[] | null } | null;
}

export interface AniListNestedEdge {
  relationType?: string | null;
  node: AniListNestedNode;
}

/** A fully hydrated media item from the top level of a batch response. */
export interface AniListBatchMediaItem {
  id: number;
  type?: string | null;
  format?: string | null;
  status?: string | null;
  episodes?: number | null;
  chapters?: number | null;
  volumes?: number | null;
  averageScore?: number | null;
  description?: string | null;
  title?: AniListTitle;
  coverImage?: AniListCoverImage;
  startDate?: AniListDate;
  endDate?: AniListDate;
  nextAiringEpisode?: AniListNextAiringEpisode | null;
  relations?: { edges?: AniListNestedEdge[] | null } | null;
}

export interface AniListBatchResponse {
  data?: {
    Page?: {
      media?: AniListBatchMediaItem[] | null;
    } | null;
  } | null;
  errors?: { message: string; status?: number }[];
}
