import { AnimeStatus } from "./anime";
import {
  AnimeWork,
  FranchiseWork,
  SourceWork,
  WorkStub,
} from "./franchise-work";
import { RelationType } from "./relation";

/** A directed relation between two works, hydrated or not. */
export interface FranchiseEdge {
  sourceId: number;
  targetId: number;
  relationType: RelationType;
}

/** One batched repository response: hydrated works plus discovered topology. */
export interface WorkBatch {
  works: FranchiseWork[];
  edges: FranchiseEdge[];
  stubs: WorkStub[];
}

/** Whether the franchise's written source has concluded. */
export type FranchiseSourceStatus = "FINISHED" | "ONGOING" | "UNKNOWN";

/** The only input the watching score consumes. */
export interface FranchiseSummary {
  startYear: number | null;
  endYear: number | null;
  totalEpisodes: number;
  averageScore: number | null;
  status: AnimeStatus;
  nextAiringEpisode: AnimeWork["nextAiringEpisode"];
  sourceStatus: FranchiseSourceStatus;
}

/** A complete franchise in our own vocabulary. Nothing AniList-shaped here. */
export interface Franchise {
  /** The work the user selected — the entry the UI highlights. */
  rootId: number;
  nodes: Map<number, FranchiseWork>;
  edges: FranchiseEdge[];
  /** PREQUEL/SEQUEL chain in release order. */
  timeline: AnimeWork[];
  /** Movies, OVAs, specials and side stories outside the timeline. */
  related: AnimeWork[];
  sources: SourceWork[];
  summary: FranchiseSummary;
  /** False when traversal stopped early; the franchise is partial. */
  isComplete: boolean;
  /** Works known to exist that were never hydrated. */
  unresolvedIds: number[];
}
