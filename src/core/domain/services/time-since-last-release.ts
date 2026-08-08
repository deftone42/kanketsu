import { FranchiseSummary } from "../models/franchise";

const LAST_MONTH_OF_YEAR = 12;

/**
 * Whole months between the franchise's last concluded entry and now.
 *
 * Pure: the clock arrives as a parameter, as it does for the watching score.
 * An end date AniList only knows to the year is read as December, the
 * reading that never overstates how long the wait has been.
 */
export function monthsSinceLastRelease(
  summary: FranchiseSummary,
  now: Date,
): number | null {
  const lastEndDate = summary.lastEndDate;
  if (lastEndDate === null || lastEndDate.year === null) return null;

  const endedInMonths =
    lastEndDate.year * 12 + (lastEndDate.month ?? LAST_MONTH_OF_YEAR) - 1;
  const nowInMonths = now.getFullYear() * 12 + now.getMonth();

  return Math.max(0, nowInMonths - endedInMonths);
}
