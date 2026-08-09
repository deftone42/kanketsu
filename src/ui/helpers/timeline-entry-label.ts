import { AnimeWork } from "@/core/domain/models/franchise-work";

export function timelineEntryLabel(work: AnimeWork, position: number): string {
  const releasedOn =
    work.startDate.year === null
      ? "release date to be announced"
      : String(work.startDate.year);

  return `${position}. ${work.title.userPreferred}, ${releasedOn}`;
}
