import { Anime } from "../models/anime";
import { TimingScore } from "../models/score";

const CURRENT_YEAR = new Date().getFullYear();
const BASE_SCORE = 70;
const LIMBO_THRESHOLD_YEARS = 5;
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

export function evaluateWatchingScore(anime: Anime): TimingScore {
  const { status, endDate, userScore, nextAiringEpisode, totalEpisodes } =
    anime;
  console.log(anime);
  const qualityBonus = getQualityBonus(userScore);

  // =========================================================================
  // 1. ESTADOS ESPECIALES (CANCELLED, HIATUS, NOT_RELEASED)
  // =========================================================================
  if (status === "CANCELLED") {
    return {
      score: clampScore(BASE_SCORE - 60 + qualityBonus),
      level: "NOT_RECOMMENDED",
      badgeText: "Cancelled Series",
      summary: "Production was officially cancelled.",
      details: "This franchise was cancelled before completing its story.",
    };
  }

  if (status === "HIATUS") {
    return {
      score: clampScore(BASE_SCORE - 40 + qualityBonus),
      level: "NOT_GOOD_TIME",
      badgeText: "Indefinite Hiatus",
      summary: "Production is currently frozen.",
      details: "The project is on an indefinite pause with no return date.",
    };
  }

  if (status === "NOT_RELEASED") {
    return {
      score: clampScore(BASE_SCORE - 50),
      level: "NOT_GOOD_TIME",
      badgeText: "Not Yet Released",
      summary: "Broadcast hasn't started.",
      details: "This series has not premiered yet.",
    };
  }

  // =========================================================================
  // 2. NUEVA TEMPORADA EN EL HORIZONTE (NEW_SEASON_COMING)
  // =========================================================================
  if (status === "NEW_SEASON_COMING") {
    // Si hay una fecha exacta de próximo episodio con cuenta atrás cercana
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
        };
      }

      return {
        score: clampScore(BASE_SCORE + 10 + qualityBonus),
        level: "GOOD_TIME",
        badgeText: "Good time to catch up",
        summary: `${seasonName} has been officially announced.`,
        details: `"${seasonName}" is scheduled in roughly ${daysLeft} days. Great time to catch up.`,
      };
    }

    // Anunciada pero sin fecha exacta todavía (ej. Frieren / Oshi no Ko con temporada confirmada)
    return {
      score: clampScore(BASE_SCORE + 20 + qualityBonus),
      level: "PERFECT_TIME",
      badgeText: "Sequel Announced!",
      summary: "A new season is officially in production.",
      details: `Catch up on all ${totalEpisodes || "available"} released episodes before the upcoming continuation drops!`,
    };
  }

  // =========================================================================
  // 3. EN EMISIÓN ACTUALMENTE (ONGOING)
  // =========================================================================
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
      };
    }

    return {
      score: clampScore(BASE_SCORE - 15 + qualityBonus),
      level: "IF_CANT_WAIT",
      badgeText: "Watch if impatient",
      summary: "Currently releasing weekly.",
      details: "Episodes drop week by week.",
    };
  }

  // =========================================================================
  // 4. FINALIZADO (FINISHED)
  // =========================================================================
  if (status === "FINISHED") {
    const endYear = endDate?.year;
    const yearsSinceEnded = endYear ? CURRENT_YEAR - endYear : null;

    // Sub-caso A: Limbo de producción (> 5 años desde su finalización sin noticias)
    if (yearsSinceEnded !== null && yearsSinceEnded >= LIMBO_THRESHOLD_YEARS) {
      return {
        score: clampScore(BASE_SCORE - 30 + qualityBonus),
        level: "RISK_INCOMPLETE",
        badgeText: "Production Limbo",
        summary: `Ended in ${endYear} without continuation news.`,
        details: `Finished ${yearsSinceEnded} years ago with no new seasons announced.`,
      };
    }

    // Sub-caso B: Franquicia Concluida / Disponible al completo
    return {
      score: clampScore(BASE_SCORE + 15 + qualityBonus),
      level: "PERFECT_TIME",
      badgeText: "Completed Story",
      summary: "Available to watch in full.",
      details: `All available TV episodes (${totalEpisodes || "complete"}) are released. Great time to experience the whole journey.`,
    };
  }

  // Fallback por defecto
  return {
    score: 50,
    level: "NOT_GOOD_TIME",
    badgeText: "Status Unknown",
    summary: "Insufficient data.",
    details: "Anime status details are unclear.",
  };
}
