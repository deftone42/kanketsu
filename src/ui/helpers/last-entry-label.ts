import { FranchiseSummary } from "@/core/domain/models/franchise";
import { formatMonthsElapsed } from "./format-elapsed";

export function lastEntryLabel(
  status: FranchiseSummary["status"],
  monthsSinceLastRelease: number | null,
): string | null {
  if (monthsSinceLastRelease === null) return null;
  if (status === "ONGOING" || status === "NEW_SEASON_COMING") return null;

  return `Last entry ${formatMonthsElapsed(monthsSinceLastRelease)}`;
}
