import { FranchiseSummary } from "../models/franchise";
import { SourceFormat } from "../models/franchise-work";
import { ScoreLevel, TimingScore } from "../models/score";
import {
  WatchingSituation,
  deriveWatchingSituation,
} from "./watching-situation";

/** Days before a premiere within which catching up is worth a bonus. */
const HYPE_WINDOW_DAYS = 60;
const HYPE_WINDOW_BONUS = 15;
const UNFINISHED_SOURCE_PENALTY = -5;
const SECONDS_PER_DAY = 86_400;

/**
 * What each situation is worth. A closed story is the only route to 100:
 * the score answers "is this a good moment to watch?", and no amount of
 * backlog beats a story you can finish.
 */
export const BASE_SCORES: Record<WatchingSituation, number> = {
  FINISHED: 100,
  MEGA_SERIES_ONGOING: 80,
  SEQUEL_ANNOUNCED: 70,
  DE_FACTO_HIATUS: 55,
  ONGOING: 50,
  OFFICIAL_HIATUS: 20,
  NOT_RELEASED: 15,
  CANCELLED: 5,
};

export interface SituationCopy {
  badgeText: string;
  summary: string;
  details: string;
}

export const SITUATION_COPY: Record<WatchingSituation, SituationCopy> = {
  FINISHED: {
    badgeText: "Completed Story",
    summary: "Available to watch in full.",
    details:
      "Every episode and film is out. Great time to experience the whole journey.",
  },
  MEGA_SERIES_ONGOING: {
    badgeText: "Great Backlog!",
    summary: "Massive episode backlog available.",
    details:
      "Hundreds of episodes are already out, so you can binge for a long time before the weekly wait catches up with you.",
  },
  SEQUEL_ANNOUNCED: {
    badgeText: "Sequel Announced",
    summary: "A new season is officially on the way.",
    details:
      "The story isn't closed yet. Catch up now if you don't mind waiting for the continuation.",
  },
  ONGOING: {
    badgeText: "Airing Weekly",
    summary: "Currently releasing weekly.",
    details:
      "Episodes drop week by week. Watch now only if you don't mind the wait.",
  },
  DE_FACTO_HIATUS: {
    badgeText: "Stalled Adaptation",
    summary: "No continuation in years.",
    details:
      "The last season aired years ago and the source keeps going, with no sequel announced. It may have closed an arc, or stopped mid-story — worth checking before you commit.",
  },
  OFFICIAL_HIATUS: {
    badgeText: "Indefinite Hiatus",
    summary: "Production is currently frozen.",
    details: "The project is on an indefinite pause with no return date.",
  },
  NOT_RELEASED: {
    badgeText: "Not Yet Released",
    summary: "Broadcast hasn't started.",
    details: "This series has not premiered yet.",
  },
  CANCELLED: {
    badgeText: "Cancelled Series",
    summary: "Production was officially cancelled.",
    details: "This franchise was cancelled before completing its story.",
  },
};

const SOURCE_LABELS: Record<SourceFormat, string> = {
  MANGA: "manga",
  NOVEL: "novel",
  ONE_SHOT: "one-shot",
};

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, score));
}

/**
 * The level follows the final score rather than the situation, so a modifier
 * that lifts a franchise into a better band lifts its label too.
 */
function levelForScore(score: number): ScoreLevel {
  if (score >= 90) return "PERFECT_TIME";
  if (score >= 75) return "GOOD_TIME";
  if (score >= 60) return "RISK_INCOMPLETE";
  if (score >= 40) return "IF_CANT_WAIT";
  if (score >= 10) return "NOT_GOOD_TIME";
  return "NOT_RECOMMENDED";
}

/**
 * Is now a good moment to watch this? Deliberately not "is this good" — the
 * AniList rating is shown alongside and never touches this number.
 */
export function evaluateWatchingScore(
  summary: FranchiseSummary,
  now: Date,
): TimingScore {
  const situation = deriveWatchingSituation(summary, now);
  const notes: string[] = [];
  let score = BASE_SCORES[situation];

  const next = summary.nextAiringEpisode;
  if (situation === "SEQUEL_ANNOUNCED" && next !== null) {
    const daysLeft = Math.ceil(next.timeUntilAiringSeconds / SECONDS_PER_DAY);
    if (daysLeft <= HYPE_WINDOW_DAYS) {
      score += HYPE_WINDOW_BONUS;
      const season = next.seasonTitle || "A new season";
      notes.push(`${season} premieres in ${daysLeft} days.`);
    }
  }

  // A stalled adaptation's base already accounts for the source outrunning it;
  // applying the penalty as well would charge it twice for the same fact.
  if (summary.sourceStatus === "ONGOING" && situation !== "DE_FACTO_HIATUS") {
    score += UNFINISHED_SOURCE_PENALTY;
    const label = summary.sourceFormat
      ? SOURCE_LABELS[summary.sourceFormat]
      : "source material";
    notes.push(`The ${label} is still being published.`);
  }

  const finalScore = clampScore(score);

  return {
    score: finalScore,
    level: levelForScore(finalScore),
    ...SITUATION_COPY[situation],
    notes,
  };
}
