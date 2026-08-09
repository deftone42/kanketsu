const MONTHS_PER_YEAR = 12;

export function formatMonthsElapsed(months: number): string {
  if (months === 0) return "this month";

  if (months < MONTHS_PER_YEAR) {
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }

  const years = Math.floor(months / MONTHS_PER_YEAR);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}
