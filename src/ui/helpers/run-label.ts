import { PartialDate } from "@/core/domain/models/partial-date";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function monthAndYear(date: PartialDate): string | null {
  if (date.year === null) return null;
  if (date.month === null) return String(date.year);
  return `${MONTH_NAMES[date.month - 1]} ${date.year}`;
}

export function runLabel(
  startDate: PartialDate,
  endDate: PartialDate | null,
): string {
  const start = monthAndYear(startDate);
  if (start === null) return "TBA";

  const end = endDate === null ? null : monthAndYear(endDate);
  if (end === null) return `${start} – present`;
  return start === end ? start : `${start} – ${end}`;
}
