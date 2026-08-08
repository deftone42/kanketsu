import { AnimeStatus } from "../models/anime";
import {
  AnimeWork,
  NextEpisode,
  SourceFormat,
  SourceWork,
} from "../models/franchise-work";
import { FranchiseSourceStatus, FranchiseSummary } from "../models/franchise";

/**
 * Episodes a single entry contributes to the franchise total.
 * An airing entry rarely reports its final count, so we fall back to the
 * episodes already broadcast: the next one to air, minus one.
 */
function releasedEpisodes(work: AnimeWork): number {
  if (work.episodes !== null) return work.episodes;
  if (work.nextAiringEpisode !== null) {
    return Math.max(0, work.nextAiringEpisode.episode - 1);
  }
  return 0;
}

/**
 * Franchise-level status, most severe signal first.
 * NOT_RELEASED is checked before NEW_SEASON_COMING so a franchise that has
 * never aired is not advertised as having a sequel on the way.
 */
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

function latestEndYear(works: AnimeWork[]): number | null {
  const years = works
    .map((work) => work.endDate?.year ?? null)
    .filter((year): year is number => year !== null);

  return years.length === 0 ? null : Math.max(...years);
}

/**
 * A franchise can adapt several works of different kinds — Monogatari draws
 * on many light novels plus a stray manga — so the label reflects whichever
 * kind predominates.
 */
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

/**
 * Folds a whole franchise into the handful of facts the watching score needs.
 * Pure: give it the same works and it gives the same summary.
 */
export function summarizeFranchise(
  timeline: AnimeWork[],
  related: AnimeWork[],
  sources: SourceWork[],
): FranchiseSummary {
  const watchable = [...timeline, ...related];

  return {
    startYear: timeline[0]?.startDate.year ?? null,
    // Both ends read the timeline, and only the timeline. Taking the end from
    // `related` too built the range out of two different populations: searching
    // HUNTER×HUNTER (1999) reported "1999 – 2014", the end year belonging to
    // the 2011 remake, while its episode count and score described the 1999
    // series. `related` holds what does not advance the story — side stories,
    // OVAs, remakes — so it does not date the story either. A sequel film does
    // advance it, and DEFAULT_TIMELINE_FORMATS already keeps films on the
    // timeline.
    endYear: latestEndYear(timeline),
    totalEpisodes: timeline.reduce(
      (total, work) => total + releasedEpisodes(work),
      0,
    ),
    // Seasons only. Including movies and specials makes a single-season
    // series report a score its one season never had.
    averageScore: averageScore(timeline),
    status: deriveStatus(timeline),
    nextAiringEpisode: soonestUpcomingEpisode(watchable),
    sourceStatus: deriveSourceStatus(sources),
    sourceFormat: derivePredominantFormat(sources),
  };
}
