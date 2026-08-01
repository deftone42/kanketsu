import { Anime } from "@/core/domain/models/anime";

export const soulEaterAnime: Anime = {
  id: 3588,
  title: {
    userPreferred: "Soul Eater",
    english: "Soul Eater",
    romaji: "Soul Eater",
    native: "ソウルイーター",
  },
  coverImage:
    "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx3588-fSMggQoFSbUI.png",
  userScore: 77,
  status: "FINISHED",
  episodes: 51,
  releaseYear: 2008,
  endDate: { year: 2009 },
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
      relationType: "SPIN_OFF",
      status: "FINISHED",
      format: "TV",
      daysUntilAiring: null,
    },
    {
      relationType: "SPIN_OFF",
      status: "FINISHED",
      format: "SPECIAL",
      daysUntilAiring: null,
    },
    {
      relationType: "OTHER",
      status: "FINISHED",
      format: "TV",
      daysUntilAiring: null,
    },
  ],
};
