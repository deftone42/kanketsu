import { FranchiseSummary } from "@/core/domain/models/franchise";

export function yearRange(
  startYear: number | null,
  endYear: number | null,
  status: FranchiseSummary["status"],
): string {
  if (startYear === null) return "TBA";
  if (endYear === null) {
    return status === "FINISHED" ? String(startYear) : `${startYear} – present`;
  }
  return startYear === endYear ? String(startYear) : `${startYear} – ${endYear}`;
}
