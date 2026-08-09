import { Genre } from "@/core/domain/models/genre";

const GENRE_NAMES: Record<Genre, string> = {
  ACTION: "Action",
  ADVENTURE: "Adventure",
  COMEDY: "Comedy",
  DRAMA: "Drama",
  ECCHI: "Ecchi",
  FANTASY: "Fantasy",
  HENTAI: "Hentai",
  HORROR: "Horror",
  MAHOU_SHOUJO: "Mahou Shoujo",
  MECHA: "Mecha",
  MUSIC: "Music",
  MYSTERY: "Mystery",
  PSYCHOLOGICAL: "Psychological",
  ROMANCE: "Romance",
  SCI_FI: "Sci-Fi",
  SLICE_OF_LIFE: "Slice of Life",
  SPORTS: "Sports",
  SUPERNATURAL: "Supernatural",
  THRILLER: "Thriller",
};

export function genreName(genre: Genre): string {
  return GENRE_NAMES[genre];
}
