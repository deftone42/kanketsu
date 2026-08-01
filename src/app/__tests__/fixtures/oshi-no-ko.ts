import { Anime } from "@/core/domain/models/anime";

export const oshiNoKoAnime: Anime = {
  id: 150672,
  title: {
    userPreferred: "[Oshi no Ko]",
    english: "OSHI NO KO",
    romaji: "[Oshi no Ko]",
    native: "【推しの子】",
  },
  coverImage:
    "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx150672-WqmmwZ4nMzAy.png",
  userScore: 84,
  status: "FINISHED",
  episodes: 11,
  releaseYear: 2023,
  endDate: { year: 2023 },
  format: "TV",
  nextAiringEpisode: null,
  relations: [
    {
      relationType: "ADAPTATION",
      status: "FINISHED",
      format: "MANGA",
      daysUntilAiring: null,
    },
    {
      relationType: "CHARACTER",
      status: "FINISHED",
      format: "MUSIC",
      daysUntilAiring: null,
    },
    {
      relationType: "SEQUEL",
      status: "FINISHED",
      format: "TV",
      daysUntilAiring: null,
    },
  ],
};
