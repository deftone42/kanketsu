import { AnimeStatus } from "../models/anime";
import {
  AnimeWork,
  NextEpisode,
  SourceFormat,
  SourceWork,
} from "../models/franchise-work";
import { FranchiseSourceStatus, FranchiseSummary } from "../models/franchise";
import { comparePartialDates, PartialDate } from "../models/partial-date";

function releasedEpisodes(work: AnimeWork): number {
  if (work.episodes !== null) return work.episodes;
  if (work.nextAiringEpisode !== null) {
    return Math.max(0, work.nextAiringEpisode.episode - 1);
  }
  return 0;
}

function deriveStatus(timeline: AnimeWork[]): AnimeStatus {
  if (timeline.length === 0) return "FINISHED";

  if (timeline.some((work) => work.status === "CANCELLED")) return "CANCELLED";
  if (timeline.some((work) => work.status === "HIATUS")) return "HIATUS";
  if (timeline.every((work) => work.status === "NOT_RELEASED")) {
    return "NOT_RELEASED";
  }
  if (timeline.some((work) => work.status === "ONGOING")) return "ONGOING";

  const hasUnairedEntry = timeline.some(
    (work) => work.status === "NOT_RELEASED",
  );
  const hasUpcomingEpisode = timeline.some(
    (work) => work.nextAiringEpisode !== null,
  );
  if (hasUnairedEntry || hasUpcomingEpisode) return "NEW_SEASON_COMING";

  return "FINISHED";
}

function averageScore(works: AnimeWork[]): number | null {
  const scores = works
    .map((work) => work.score)
    .filter((score): score is number => score !== null);

  if (scores.length === 0) return null;
  return Math.round(
    scores.reduce((total, score) => total + score, 0) / scores.length,
  );
}

function soonestUpcomingEpisode(works: AnimeWork[]): NextEpisode | null {
  return works
    .map((work) => work.nextAiringEpisode)
    .filter((next): next is NextEpisode => next !== null)
    .reduce<NextEpisode | null>(
      (soonest, next) =>
        soonest === null ||
        next.timeUntilAiringSeconds < soonest.timeUntilAiringSeconds
          ? next
          : soonest,
      null,
    );
}

function latestEndDate(works: AnimeWork[]): PartialDate | null {
  const endDates = works
    .map((work) => work.endDate)
    .filter((date): date is PartialDate => date !== null && date.year !== null);

  return endDates.reduce<PartialDate | null>(
    (latest, date) =>
      latest === null || comparePartialDates(latest, date) < 0 ? date : latest,
    null,
  );
}

function derivePredominantFormat(sources: SourceWork[]): SourceFormat | null {
  const tally = new Map<SourceFormat, number>();
  for (const source of sources) {
    tally.set(source.format, (tally.get(source.format) ?? 0) + 1);
  }

  let predominant: SourceFormat | null = null;
  let highest = 0;
  for (const [format, count] of tally) {
    if (count > highest) {
      predominant = format;
      highest = count;
    }
  }

  return predominant;
}

function deriveSourceStatus(sources: SourceWork[]): FranchiseSourceStatus {
  if (sources.length === 0) return "UNKNOWN";
  return sources.every((source) => source.status === "FINISHED")
    ? "FINISHED"
    : "ONGOING";
}

export function summarizeFranchise(
  timeline: AnimeWork[],
  related: AnimeWork[],
  sources: SourceWork[],
): FranchiseSummary {
  const watchable = [...timeline, ...related];
  const lastEndDate = latestEndDate(timeline);

  return {
    startYear: timeline[0]?.startDate.year ?? null,
    endYear: lastEndDate?.year ?? null,
    lastEndDate,
    totalEpisodes: timeline.reduce(
      (total, work) => total + releasedEpisodes(work),
      0,
    ),
    averageScore: averageScore(timeline),
    status: deriveStatus(timeline),
    nextAiringEpisode: soonestUpcomingEpisode(watchable),
    sourceStatus: deriveSourceStatus(sources),
    sourceFormat: derivePredominantFormat(sources),
  };
}
