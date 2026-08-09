import { FranchiseSummary } from "../models/franchise";

export const MEGA_SERIES_EPISODE_THRESHOLD = 150;

export const DE_FACTO_HIATUS_YEARS = 5;

export type WatchingSituation =
  | "CANCELLED"
  | "OFFICIAL_HIATUS"
  | "NOT_RELEASED"
  | "MEGA_SERIES_ONGOING"
  | "ONGOING"
  | "SEQUEL_ANNOUNCED"
  | "DE_FACTO_HIATUS"
  | "FINISHED";

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

  if (
    sourceStatus === "ONGOING" &&
    endYear !== null &&
    now.getUTCFullYear() - endYear >= DE_FACTO_HIATUS_YEARS
  ) {
    return "DE_FACTO_HIATUS";
  }

  return "FINISHED";
}
