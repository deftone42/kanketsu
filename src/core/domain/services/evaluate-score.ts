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

  const upcomingSequel = relations.find(
    (rel) => rel.relationType === "SEQUEL" && rel.status === "NOT_YET_RELEASED",
  );
  const hasFinishedSequel = relations.some(
    (rel) => rel.relationType === "SEQUEL" && rel.status === "FINISHED",
  );

  // =========================================================================
  // CASO 1: CANCELADO (~10-15 pts)
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

  // =========================================================================
  // CASO 2: HIATUS (~30-35 pts)
  // =========================================================================
  if (status === "HIATUS") {
    return {
      score: clampScore(BASE_SCORE - 40 + qualityBonus),
      level: "NOT_GOOD_TIME",
      badgeText: "Indefinite Hiatus",
      summary: "Production is currently frozen.",
      details: "The project is on an indefinite pause with no return date.",
    };
  }

  // =========================================================================
  // CASO 3: AÚN NO ESTRENADO (20 pts)
  // =========================================================================
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
  // CASO 4: HYPE WINDOW (< 60 días) (~95-100 pts)
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
      details: `A new season debuts in about ${daysLeft} days. Perfect timing to binge now and join weekly broadcasts!`,
    };
  }

  // =========================================================================
  // CASO 5: SECUELA CONFIRMADA (Fecha lejana / TBD) (~80-85 pts)
  // =========================================================================
  if (upcomingSequel) {
    const daysLeft = upcomingSequel.daysUntilAiring;
    return {
      score: clampScore(BASE_SCORE + 10 + qualityBonus),
      level: "GOOD_TIME",
      badgeText: "Good time to catch up",
      summary: "A new season has been officially announced.",
      details: daysLeft
        ? `A continuation is scheduled in roughly ${daysLeft} days. Great time to catch up.`
        : "A continuation is in production. Great time to watch prior content.",
    };
  }

  // =========================================================================
  // CASO 6: EN EMISIÓN (RELEASING)
  // =========================================================================
  if (status === "RELEASING") {
    // Excepción Mega-Series (One Piece, Conan, etc.) -> ~90-95 pts
    if (episodes === null || episodes >= MEGA_SERIES_EPISODE_THRESHOLD) {
      return {
        score: clampScore(BASE_SCORE + 20 + qualityBonus),
        level: "PERFECT_TIME",
        badgeText: "Great Backlog!",
        summary: "Massive episode backlog available.",
        details: `With over ${episodes || "150+"} episodes ongoing, you have plenty of content to binge continuously without waiting week-to-week for a long time.`,
      };
    }

    // Emisión semanal de temporada corta -> ~55-60 pts
    return {
      score: clampScore(BASE_SCORE - 15 + qualityBonus),
      level: "IF_CANT_WAIT",
      badgeText: "Watch if impatient",
      summary: "Currently releasing weekly.",
      details:
        "Episodes drop week by week. Dive in now for live discussions or wait until the season finishes.",
    };
  }

  // =========================================================================
  // CASO 7: FINALIZADO (FINISHED)
  // =========================================================================
  if (status === "FINISHED") {
    const endYear = endDate?.year;
    const yearsSinceEnded = endYear ? CURRENT_YEAR - endYear : null;

    // Sub-caso A: Limbo de producción (> 3 años sin noticias ni secuelas) -> ~40 pts
    if (
      !hasFinishedSequel &&
      yearsSinceEnded !== null &&
      yearsSinceEnded >= LIMBO_THRESHOLD_YEARS
    ) {
      return {
        score: clampScore(BASE_SCORE - 30 + qualityBonus),
        level: "RISK_INCOMPLETE",
        badgeText: "Production Limbo",
        summary: `Ended in ${endYear} without continuation news.`,
        details: `Finished ${yearsSinceEnded} years ago with no new season announced. Expect an incomplete anime arc.`,
      };
    }

    // Sub-caso B: Franquicia Concluida / Secuelas Completadas (Gintama / FMA Case) -> 100 pts
    // La historia global o el hilo de secuelas está emitido por completo.
    if (hasFinishedSequel && !upcomingSequel) {
      return {
        score: clampScore(BASE_SCORE + 25 + qualityBonus), // 70 + 25 + 5 = 100
        level: "PERFECT_TIME",
        badgeText: "Completed Story!",
        summary: "Entire franchise is completed and available.",
        details:
          "All seasons and sequels have been fully released. You can watch the complete story from start to finish without waiting.",
      };
    }

    // Sub-caso C: Temporada reciente con historia abierta (Frieren Case) -> 85 pts
    // Se ha emitido la temporada actual, pero la historia global continúa sin secuela anunciada aún.
    return {
      score: clampScore(BASE_SCORE + 10 + qualityBonus), // 70 + 10 + 5 = 85
      level: "GOOD_TIME",
      badgeText: "Season Complete",
      summary: "Season finished, ongoing story.",
      details: `All ${episodes || ""} episodes of this season are available. Be aware that the broader story is still ongoing and waiting for future adaptations.`,
    };
  }

  // Fallback
  return {
    score: 50,
    level: "NOT_GOOD_TIME",
    badgeText: "Status Unknown",
    summary: "Insufficient data.",
    details: "Anime status details are unclear.",
  };
}
