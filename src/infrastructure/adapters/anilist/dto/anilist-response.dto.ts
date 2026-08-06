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

export interface AniListRelationNode {
  id: number;
  format?: string | null;
  status?: string | null;
  startDate?: AniListDate;
  title?: AniListTitle;
  nextAiringEpisode?: {
    episode?: number;
    timeUntilAiring: number;
  } | null;
}

export interface AniListRelationEdge {
  relationType?: string | null;
  node: AniListRelationNode;
}

export interface AniListRelations {
  edges?: AniListRelationEdge[] | null;
}

export interface AniListMediaItem {
  id: number;
  title: AniListTitle;
  coverImage?: AniListCoverImage;
  format?: string | null;
  episodes?: number | null;
  averageScore?: number | null;
  status: string;
  startDate?: AniListDate;
  endDate?: AniListDate;
  nextAiringEpisode?: AniListNextAiringEpisode | null;
  relations?: AniListRelations;
}

export interface AniListPageInfo {
  total?: number;
  perPage?: number;
  currentPage?: number;
  lastPage?: number;
  hasNextPage?: boolean;
}

export interface AniListSearchResponse {
  data?: {
    Page?: {
      pageInfo?: AniListPageInfo;
      media?: AniListMediaItem[];
    };
  };
}

export interface AniListMediaResponse {
  data?: {
    Media?: AniListMediaItem;
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
