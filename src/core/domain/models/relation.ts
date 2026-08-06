/**
 * All relation types that AniList can return between media entries.
 * @see https://docs.anilist.co/reference/media-object/
 */
export type RelationType =
  | "PREQUEL"
  | "SEQUEL"
  | "PARENT"
  | "SIDE_STORY"
  | "SPIN_OFF"
  | "ALTERNATIVE"
  | "COMPILATION"
  | "CONTAINS"
  | "CHARACTER"
  | "OTHER"
  | "SUMMARY"
  | "ADAPTATION"
  | "SOURCE";

/**
 * Relation types that form the main timeline of a franchise.
 * Only PREQUEL and SEQUEL are traversed when building the timeline.
 */
export const MAIN_TIMELINE_RELATIONS: ReadonlySet<RelationType> = new Set([
  "PREQUEL",
  "SEQUEL",
]);
