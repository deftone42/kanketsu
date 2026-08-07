import { FranchiseSummary } from "../models/franchise";

/** Episodes past which an airing franchise is a binge rather than a weekly wait. */
export const MEGA_SERIES_EPISODE_THRESHOLD = 150;

/**
 * Years of silence after which an unfinished adaptation is treated as
 * abandoned. Deliberately conservative: two to three years is the normal
 * production gap between seasons, so a shorter window would flag the common
 * case and the score would lie.
 */
export const DE_FACTO_HIATUS_YEARS = 5;

/**
 * What kind of moment this franchise is in. Mutually exclusive, and the only
 * thing the score reads. The unfinished source and the hype window are
 * modifiers rather than situations, so they do not appear here.
 */
export type WatchingSituation =
  | "CANCELLED"
  | "OFFICIAL_HIATUS"
  | "NOT_RELEASED"
  | "MEGA_SERIES_ONGOING"
  | "ONGOING"
  | "SEQUEL_ANNOUNCED"
  | "DE_FACTO_HIATUS"
  | "FINISHED";

/**
 * Classifies a franchise, most severe signal first. `summarizeFranchise` has
 * already collapsed the works into a single status; this only refines it.
 */
export function deriveWatchingSituation(
  summary: FranchiseSummary,
  now: Date,
): WatchingSituation {
  const { status, totalEpisodes, sourceStatus, endYear } = summary;

  if (status === "CANCELLED") return "CANCELLED";
  if (status === "HIATUS") return "OFFICIAL_HIATUS";
  if (status === "NOT_RELEASED") return "NOT_RELEASED";

  if (status === "ONGOING") {
    return totalEpisodes >= MEGA_SERIES_EPISODE_THRESHOLD
      ? "MEGA_SERIES_ONGOING"
      : "ONGOING";
  }

  if (status === "NEW_SEASON_COMING") return "SEQUEL_ANNOUNCED";

  // AniList reports no status for "the studio quietly stopped": the franchise
  // simply looks finished. A living source plus years of silence is the only
  // signal we have that the story was left hanging.
  if (
    sourceStatus === "ONGOING" &&
    endYear !== null &&
    now.getUTCFullYear() - endYear >= DE_FACTO_HIATUS_YEARS
  ) {
    return "DE_FACTO_HIATUS";
  }

  return "FINISHED";
}
