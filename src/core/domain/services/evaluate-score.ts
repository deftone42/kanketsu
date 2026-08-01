import { Anime } from "../models/anime";
import { TimingScore } from "../models/score";

const CURRENT_YEAR = new Date().getFullYear();
const BASE_SCORE = 70;
const LIMBO_THRESHOLD_YEARS = 3;
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
  const { status, relations = [], episodes = 0, endDate, userScore } = anime;
  const qualityBonus = getQualityBonus(userScore);

  console.log(JSON.stringify(anime));

  // FILTRADO CLAVE: Solo consideramos secuelas de formato principal (TV / MOVIE)
  const validSequels = relations.filter(
    (rel) =>
      rel.relationType === "SEQUEL" &&
      (rel.format === "TV" || rel.format === "MOVIE" || !rel.format),
  );

  const upcomingSequel = validSequels.find(
    (rel) => rel.status === "NOT_YET_RELEASED",
  );

  // Solo cuenta si hay una secuela principal emitida
  const hasMainFinishedSequel = validSequels.some(
    (rel) => rel.status === "FINISHED",
  );

  // =========================================================================
  // CASOS DE ESTADO (CANCELLED, HIATUS, NOT_YET_RELEASED)
  // =========================================================================
  if (status === "CANCELLED") {
    return {
      score: clampScore(BASE_SCORE - 60 + qualityBonus),
      level: "NOT_RECOMMENDED",
      badgeText: "Cancelled Series",
      summary: "Production was officially cancelled.",
      details: "This anime was cancelled before completing its story.",
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

  if (status === "NOT_YET_RELEASED") {
    return {
      score: clampScore(BASE_SCORE - 50),
      level: "NOT_GOOD_TIME",
      badgeText: "Not Yet Released",
      summary: "Broadcast hasn't started.",
      details: "This series has not premiered yet.",
    };
  }

  // =========================================================================
  // HYPE WINDOW (< 60 días) -> 95-100 pts
  // =========================================================================
  if (
    upcomingSequel &&
    upcomingSequel.daysUntilAiring &&
    upcomingSequel.daysUntilAiring <= HYPE_WINDOW_DAYS
  ) {
    const daysLeft = upcomingSequel.daysUntilAiring;
    return {
      score: clampScore(BASE_SCORE + 25 + qualityBonus),
      level: "PERFECT_TIME",
      badgeText: "Hype Window Active!",
      summary: `New season premieres in ${daysLeft} days!`,
      details: `A new season debuts in about ${daysLeft} days. Perfect timing to binge now!`,
    };
  }

  // =========================================================================
  // SECUELA CONFIRMADA (Futuro) -> 80-85 pts
  // =========================================================================
  if (upcomingSequel) {
    const daysLeft = upcomingSequel.daysUntilAiring;
    return {
      score: clampScore(BASE_SCORE + 10 + qualityBonus),
      level: "GOOD_TIME",
      badgeText: "Good time to catch up",
      summary: "A new season has been officially announced.",
      details: daysLeft
        ? `A continuation is scheduled in roughly ${daysLeft} days.`
        : "A continuation is in production. Great time to catch up.",
    };
  }

  // =========================================================================
  // EN EMISIÓN (RELEASING)
  // =========================================================================
  if (status === "RELEASING") {
    if (episodes === null || episodes >= MEGA_SERIES_EPISODE_THRESHOLD) {
      return {
        score: clampScore(BASE_SCORE + 20 + qualityBonus),
        level: "PERFECT_TIME",
        badgeText: "Great Backlog!",
        summary: "Massive episode backlog available.",
        details: `With over ${episodes || "150+"} episodes ongoing, you can binge continuously.`,
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
  // CASO 7: FINALIZADO (FINISHED)
  // =========================================================================
  if (status === "FINISHED") {
    const endYear = endDate?.year;
    const yearsSinceEnded = endYear ? CURRENT_YEAR - endYear : null;

    // 1. Verificamos si el material original (Manga/Novela) sigue en publicación
    const isSourceOngoing = relations.some(
      (rel) => rel.relationType === "ADAPTATION" && rel.status === "RELEASING",
    );

    // Sub-caso A: Limbo de producción (> 3 años sin noticias) -> ~40 pts
    if (
      !hasMainFinishedSequel &&
      yearsSinceEnded !== null &&
      yearsSinceEnded >= LIMBO_THRESHOLD_YEARS
    ) {
      return {
        score: clampScore(BASE_SCORE - 30 + qualityBonus),
        level: "RISK_INCOMPLETE",
        badgeText: "Production Limbo",
        summary: `Ended in ${endYear} without continuation news.`,
        details: `Finished ${yearsSinceEnded} years ago with no new season announced.`,
      };
    }

    // Sub-caso B: Franquicia Concluida Definitivamente (Gintama / FMA) -> 100 pts
    // Para dar 100/100, la obra original NO debe estar en publicación y las secuelas deben estar finalizadas
    if (hasMainFinishedSequel && !upcomingSequel && !isSourceOngoing) {
      return {
        score: clampScore(BASE_SCORE + 25 + qualityBonus), // 70 + 25 + 5 = 100
        level: "PERFECT_TIME",
        badgeText: "Completed Story!",
        summary: "Entire franchise is completed and available.",
        details:
          "All seasons have been fully released. You can watch the complete story.",
      };
    }

    // Sub-caso C: Temporada Finalizada con historia abierta (Frieren Case) -> 85 pts
    // Al estar el manga en "RELEASING", cae automáticamente aquí
    return {
      score: clampScore(BASE_SCORE + 10 + qualityBonus), // 70 + 10 + 5 = 85
      level: "GOOD_TIME",
      badgeText: "Season Complete",
      summary: "Season finished, ongoing story.",
      details: `All ${episodes || ""} episodes of this season are available. The broader story continues.`,
    };
  }

  return {
    score: 50,
    level: "NOT_GOOD_TIME",
    badgeText: "Status Unknown",
    summary: "Insufficient data.",
    details: "Anime status details are unclear.",
  };
}
