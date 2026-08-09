import { FranchiseSummary } from "../models/franchise";

const LAST_MONTH_OF_YEAR = 12;

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
