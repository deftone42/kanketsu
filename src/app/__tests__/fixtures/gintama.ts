import { Anime } from "@/core/domain/models/anime";

export const gintamaScenario: Anime = {
  id: 918,
  title: {
    userPreferred: "Gintama",
    english: "Gintama",
    romaji: "Gintama",
    native: "銀魂",
  },
  coverImage:
    "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx918-iOaeBVUn4uK7.jpg",
  userScore: 85,
  status: "FINISHED",
  episodes: 201,
  releaseYear: 2006,
  endDate: { year: 2010 },
  format: "TV",
  nextAiringEpisode: null,
  relations: [
    { relationType: "SEQUEL", status: "FINISHED" },
    { relationType: "SIDE_STORY", status: "FINISHED" },
    { relationType: "ALTERNATIVE", status: "FINISHED" },
    { relationType: "SPIN_OFF", status: "FINISHED" },
  ],
};
