import { Anime } from "../models/anime";
import { TimingScore } from "../models/score";

export function evaluateAnimeScore(anime: Anime): TimingScore {
  const { status, relations = [], episodes = 0 } = anime;

  const upcomingSequel = relations.find(
    (rel) => rel.relationType === "SEQUEL" && rel.status === "NOT_YET_RELEASED",
  );

  if (status === "RELEASING") {
    return {
      level: "IF_CANT_WAIT",
      badgeText: "Watch it if you can't wait",
      summary: "Currently airing in real-time.",
      details:
        "It is actively releasing episodes right now. Great to jump in if you enjoy participating in weekly community discussions.",
    };
  }

  if (upcomingSequel) {
    const daysLeft = upcomingSequel.daysUntilAiring;
    const daysMessage = daysLeft
      ? `A new season premieres in approximately ${daysLeft} days.`
      : "A new season/sequel has been officially announced.";

    return {
      level: "WAIT_A_BIT",
      badgeText: "Wait a little bit",
      summary: "A new season is right around the corner!",
      details: `${daysMessage} You might want to wait or start catching up now so you hit the premiere in sync!`,
    };
  }

  if (status === "FINISHED") {
    return {
      level: "GOOD_TIME",
      badgeText: "Good time to watch!",
      summary: "Complete story available.",
      details: `This anime is finished with ${episodes || "all"} episodes available. Perfect for binge-watching without cliffhangers between seasons!`,
    };
  }

  if (status === "HIATUS" || status === "CANCELLED") {
    return {
      level: "NOT_GOOD_TIME",
      badgeText: "Hmmm not a good time",
      summary: "Production paused or cancelled.",
      details:
        "This series is currently on hiatus or cancelled. Be prepared for an incomplete storyline or indefinite wait.",
    };
  }

  return {
    level: "NOT_GOOD_TIME",
    badgeText: "Hmmm not a good time",
    summary: "Not yet available to stream.",
    details: "This title has not started broadcasting yet.",
  };
}
