import { AnimeFormat } from "./anime";

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
 * Only PREQUEL and SEQUEL are traversed during BFS to build the main timeline.
 */
export const MAIN_TIMELINE_RELATIONS: ReadonlySet<RelationType> = new Set([
  "PREQUEL",
  "SEQUEL",
]);

/**
 * A single relation edge between two anime entries.
 * Represents a directed edge from the source anime to the target anime.
 */
export interface Relation {
  /** The AniList ID of the related anime (the target node). */
  id: number;
  /** The type of relation from the source to the target. */
  relationType: RelationType;
  /** The format of the related anime (TV, MOVIE, OVA, etc.). */
  format: AnimeFormat | null;
  /** The user-preferred title of the related anime. */
  title: string;
}
