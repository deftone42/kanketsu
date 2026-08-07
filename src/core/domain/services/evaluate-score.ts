import { FranchiseSummary } from "../models/franchise";
import { TimingScore } from "../models/score";

const BASE_SCORE = 70;
const MEGA_SERIES_EPISODE_THRESHOLD = 150;
const HYPE_WINDOW_DAYS = 60;

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, score));
}

function getQualityBonus(userScore: number | null): number {
  if (!userScore) return 0;
  if (userScore >= 85) return 5;
  if (userScore <= 50) return -5;
  return 0;
}

export function evaluateWatchingScore(summary: FranchiseSummary): TimingScore {
  const { status, averageScore, nextAiringEpisode, totalEpisodes } = summary;
  const qualityBonus = getQualityBonus(averageScore);

  if (status === "CANCELLED") {
    return {
      score: clampScore(BASE_SCORE - 60 + qualityBonus),
      level: "NOT_RECOMMENDED",
      badgeText: "Cancelled Series",
      summary: "Production was officially cancelled.",
      details: "This franchise was cancelled before completing its story.",
      notes: [],
    };
  }

  if (status === "HIATUS") {
    return {
      score: clampScore(BASE_SCORE - 40 + qualityBonus),
      level: "NOT_GOOD_TIME",
      badgeText: "Indefinite Hiatus",
      summary: "Production is currently frozen.",
      details: "The project is on an indefinite pause with no return date.",
      notes: [],
    };
  }

  if (status === "NOT_RELEASED") {
    return {
      score: clampScore(BASE_SCORE - 50),
      level: "NOT_GOOD_TIME",
      badgeText: "Not Yet Released",
      summary: "Broadcast hasn't started.",
      details: "This series has not premiered yet.",
      notes: [],
    };
  }

  if (status === "NEW_SEASON_COMING") {
    if (nextAiringEpisode) {
      const daysLeft = Math.ceil(
        nextAiringEpisode.timeUntilAiringSeconds / 86400,
      );
      const seasonName = nextAiringEpisode.seasonTitle || "New content";

      if (daysLeft <= HYPE_WINDOW_DAYS) {
        return {
          score: clampScore(BASE_SCORE + 25 + qualityBonus),
          level: "PERFECT_TIME",
          badgeText: "Hype Window Active!",
          summary: `${seasonName} premieres in ${daysLeft} days!`,
          details: `"${seasonName}" debuts in about ${daysLeft} days. Perfect timing to binge now!`,
          notes: [],
        };
      }

      return {
        score: clampScore(BASE_SCORE + 10 + qualityBonus),
        level: "GOOD_TIME",
        badgeText: "Good time to catch up",
        summary: `${seasonName} has been officially announced.`,
        details: `"${seasonName}" is scheduled in roughly ${daysLeft} days. Great time to catch up.`,
        notes: [],
      };
    }

    return {
      score: clampScore(BASE_SCORE + 20 + qualityBonus),
      level: "PERFECT_TIME",
      badgeText: "Sequel Announced!",
      summary: "A new season is officially in production.",
      details: `Catch up on all ${totalEpisodes || "available"} released episodes before the upcoming continuation drops!`,
      notes: [],
    };
  }

  if (status === "ONGOING") {
    if (
      totalEpisodes === null ||
      totalEpisodes >= MEGA_SERIES_EPISODE_THRESHOLD
    ) {
      return {
        score: clampScore(BASE_SCORE + 20 + qualityBonus),
        level: "PERFECT_TIME",
        badgeText: "Great Backlog!",
        summary: "Massive episode backlog available.",
        details: `With over ${totalEpisodes || "150+"} episodes ongoing across the franchise, you can binge continuously.`,
        notes: [],
      };
    }

    return {
      score: clampScore(BASE_SCORE - 15 + qualityBonus),
      level: "IF_CANT_WAIT",
      badgeText: "Watch if impatient",
      summary: "Currently releasing weekly.",
      details: "Episodes drop week by week.",
      notes: [],
    };
  }

  if (status === "FINISHED") {
    return {
      score: clampScore(BASE_SCORE + 15 + qualityBonus),
      level: "PERFECT_TIME",
      badgeText: "Completed Story",
      summary: "Available to watch in full.",
      details: `All available episodes and movies (${totalEpisodes || "complete"}) are released. Great time to experience the whole journey.`,
      notes: [],
    };
  }

  return {
    score: 50,
    level: "NOT_GOOD_TIME",
    badgeText: "Status Unknown",
    summary: "Insufficient data.",
    details: "Anime status details are unclear.",
    notes: [],
  };
}
