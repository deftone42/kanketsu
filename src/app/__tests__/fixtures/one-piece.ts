import { Anime } from "@/core/domain/models/anime";

export const onePieceScenario: Anime = {
  id: 21,
  title: {
    userPreferred: "ONE PIECE",
    english: "ONE PIECE",
    romaji: "ONE PIECE",
    native: "ONE PIECE",
  },
  coverImage:
    "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21-ELSYx3yMPcKM.jpg",
  userScore: 87,
  status: "RELEASING",
  episodes: null,
  releaseYear: 1999,
  endDate: null,
  format: "TV",
  nextAiringEpisode: {
    episode: 1172,
    timeUntilAiringSeconds: 87621,
  },
  relations: [
    { relationType: "SIDE_STORY", status: "FINISHED" },
    { relationType: "SUMMARY", status: "FINISHED" },
    { relationType: "PREQUEL", status: "FINISHED" },
    { relationType: "ALTERNATIVE", status: "NOT_YET_RELEASED" },
    { relationType: "SPIN_OFF", status: "FINISHED" },
  ],
};
