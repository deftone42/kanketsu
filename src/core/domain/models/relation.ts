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

/**
 * Relation types that mean "these two works share a character" and nothing
 * more: cameos, crossovers, commercials. Sharing a character is not belonging
 * to the same franchise, so these edges are recorded as topology but never
 * bring a work into one.
 *
 * Measured against the recorded fixtures, CHARACTER alone reaches Dragon Ball
 * Z and Toriko from One Piece — along with a Nissan commercial, an Arashi
 * music video and a Lakers promo — Level E from HUNTER×HUNTER, and Baccano!
 * from Durarara!!, which are separate series sharing an author's universe.
 * The only genuine work it would have brought in is Fate/Zero Cafe.
 *
 * OTHER is deliberately *not* here: it carries real franchise content, such
 * as Attack on Titan's chibi theatres and Monogatari's Naisho no Hanashi.
 */
export const CROSSOVER_RELATIONS: ReadonlySet<RelationType> = new Set([
  "CHARACTER",
]);
