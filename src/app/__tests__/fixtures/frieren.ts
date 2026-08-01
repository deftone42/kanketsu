import { Anime } from "@/core/domain/models/anime";

export const frierenScenario: Anime = {
  id: 154587,
  title: {
    userPreferred: "Sousou no Frieren",
    english: "Frieren: Beyond Journey’s End",
    romaji: "Sousou no Frieren",
    native: "葬送のフリーレン",
  },
  coverImage:
    "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx154587-qQTzQnEJJ3oB.jpg",
  userScore: 91,
  status: "FINISHED",
  episodes: 28,
  releaseYear: 2023,
  endDate: { year: 2024 },
  format: "TV",
  nextAiringEpisode: null,
  relations: [
    {
      relationType: "SIDE_STORY",
      status: "FINISHED",
      daysUntilAiring: null,
    },
    { relationType: "OTHER", status: "FINISHED", daysUntilAiring: null },
    { relationType: "SEQUEL", status: "FINISHED", daysUntilAiring: null },
  ],
};
