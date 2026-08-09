export interface PartialDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

export const UNKNOWN_DATE: PartialDate = { year: null, month: null, day: null };

const UNKNOWN_WEIGHT = Number.MAX_SAFE_INTEGER;

export function toSortWeight(date: PartialDate): number {
  if (date.year === null) return UNKNOWN_WEIGHT;
  return date.year * 10000 + (date.month ?? 1) * 100 + (date.day ?? 1);
}

export function comparePartialDates(a: PartialDate, b: PartialDate): number {
  return toSortWeight(a) - toSortWeight(b);
}
