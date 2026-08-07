import { AnimeFormat, AnimeStatus } from "./anime";
import { PartialDate } from "./partial-date";

export type WorkKind = "ANIME" | "SOURCE";

export type SourceStatus = "FINISHED" | "RELEASING" | "HIATUS" | "CANCELLED";

export type SourceFormat = "MANGA" | "NOVEL" | "ONE_SHOT";

export interface Title {
  userPreferred: string;
  english: string | null;
  romaji: string | null;
  native: string | null;
}

export interface NextEpisode {
  episode: number;
  timeUntilAiringSeconds: number;
  seasonTitle: string;
}

export interface AnimeWork {
  kind: "ANIME";
  id: number;
  title: Title;
  coverImage: string;
  format: AnimeFormat | null;
  startDate: PartialDate;
  endDate: PartialDate | null;
  episodes: number | null;
  score: number | null;
  status: AnimeStatus;
  nextAiringEpisode: NextEpisode | null;
}

export interface SourceWork {
  kind: "SOURCE";
  id: number;
  title: Title;
  format: SourceFormat;
  status: SourceStatus;
  chapters: number | null;
  volumes: number | null;
}

export type FranchiseWork = AnimeWork | SourceWork;

/**
 * A work we know exists but have not hydrated. Produced by the nested
 * projection in a batch response; carries only enough to plan the next
 * frontier and label an edge. Never stored as a node.
 */
export interface WorkStub {
  id: number;
  kind: WorkKind;
  format: string | null;
  title: string;
}

export function isAnimeWork(work: FranchiseWork): work is AnimeWork {
  return work.kind === "ANIME";
}

export function isSourceWork(work: FranchiseWork): work is SourceWork {
  return work.kind === "SOURCE";
}
