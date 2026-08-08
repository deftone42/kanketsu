/**
 * Our genre vocabulary. Deliberately ours: AniList spells these as display
 * labels ("Slice of Life", "Sci-Fi"), and a recommendation engine comparing
 * franchises must not depend on how one API happens to write them.
 */
export type Genre =
  | "ACTION"
  | "ADVENTURE"
  | "COMEDY"
  | "DRAMA"
  | "ECCHI"
  | "FANTASY"
  | "HENTAI"
  | "HORROR"
  | "MAHOU_SHOUJO"
  | "MECHA"
  | "MUSIC"
  | "MYSTERY"
  | "PSYCHOLOGICAL"
  | "ROMANCE"
  | "SCI_FI"
  | "SLICE_OF_LIFE"
  | "SPORTS"
  | "SUPERNATURAL"
  | "THRILLER";
