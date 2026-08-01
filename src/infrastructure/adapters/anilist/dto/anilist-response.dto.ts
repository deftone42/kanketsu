export interface AniListTitle {
  userPreferred?: string;
  english?: string;
  romaji?: string;
  native?: string;
}

export interface AniListCoverImage {
  medium?: string;
  large?: string;
}

export interface AniListStartDate {
  year?: number;
}

export interface AniListEndDate {
  year?: number;
}

export interface AniListNextAiringEpisode {
  episode: number;
  timeUntilAiring: number;
}

export interface AniListRelationEdge {
  relationType: string;
  node: {
    id: number;
    status: string;
    nextAiringEpisode?: {
      timeUntilAiring: number;
    } | null;
  };
}

export interface AniListSearchMediaItem {
  id: number;
  title: AniListTitle;
  coverImage?: AniListCoverImage;
  startDate?: AniListStartDate;
  averageScore?: number;
  relations?: {
    edges?: AniListRelationEdge[];
  };
}

export interface AniListSearchResponse {
  data?: {
    Page?: {
      media?: AniListSearchMediaItem[];
    };
  };
}

export interface AniListMediaDetail {
  id: number;
  title: AniListTitle;
  coverImage?: AniListCoverImage;
  averageScore?: number;
  status: string;
  episodes?: number;
  startDate?: AniListStartDate;
  endDate?: AniListEndDate;
  format?: string;
  nextAiringEpisode?: AniListNextAiringEpisode | null;
  relations?: {
    edges?: AniListRelationEdge[];
  };
}

export interface AniListGetByIdResponse {
  data?: {
    Media?: AniListMediaDetail;
  };
}
