export type AnimeFormat =
  | "TV"
  | "TV_SHORT"
  | "MOVIE"
  | "SPECIAL"
  | "OVA"
  | "ONA";

/**
 * Our status vocabulary, which deliberately differs from AniList's:
 * RELEASING becomes ONGOING, and NEW_SEASON_COMING is derived by
 * summarizeFranchise rather than reported by the API.
 */
export type AnimeStatus =
  | "FINISHED"
  | "ONGOING"
  | "NEW_SEASON_COMING"
  | "NOT_RELEASED"
  | "CANCELLED"
  | "HIATUS";
