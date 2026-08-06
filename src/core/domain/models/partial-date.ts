/** A date that AniList may only partially know. Any component can be absent. */
export interface PartialDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

/** A date AniList knows nothing about. Sorts after every known date. */
export const UNKNOWN_DATE: PartialDate = { year: null, month: null, day: null };

const UNKNOWN_WEIGHT = Number.MAX_SAFE_INTEGER;

/**
 * Collapses a partial date into a single comparable number.
 * Absent month/day mean "start of the period", matching how AniList
 * reports a series whose exact premiere day is not yet announced.
 */
export function toSortWeight(date: PartialDate): number {
  if (date.year === null) return UNKNOWN_WEIGHT;
  return date.year * 10000 + (date.month ?? 1) * 100 + (date.day ?? 1);
}

/** Ascending comparator for release ordering. Unknown dates sort last. */
export function comparePartialDates(a: PartialDate, b: PartialDate): number {
  return toSortWeight(a) - toSortWeight(b);
}
