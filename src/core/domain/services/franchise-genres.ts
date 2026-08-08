import { AnimeWork } from "../models/franchise-work";
import { Genre } from "../models/genre";

const MOST_REPRESENTATIVE_GENRES = 5;

/**
 * The genres that describe a franchise rather than one of its entries: those
 * the most entries share, so a single comedy special never re-labels a drama.
 * Pure, and ordered — ties keep the order the timeline introduced them in.
 */
export function franchiseGenres(timeline: AnimeWork[]): Genre[] {
  const entriesPerGenre = new Map<Genre, number>();

  for (const work of timeline) {
    for (const genre of new Set(work.genres)) {
      entriesPerGenre.set(genre, (entriesPerGenre.get(genre) ?? 0) + 1);
    }
  }

  return [...entriesPerGenre.entries()]
    .sort(([, entriesA], [, entriesB]) => entriesB - entriesA)
    .slice(0, MOST_REPRESENTATIVE_GENRES)
    .map(([genre]) => genre);
}
