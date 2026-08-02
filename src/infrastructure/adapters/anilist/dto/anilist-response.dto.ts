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
