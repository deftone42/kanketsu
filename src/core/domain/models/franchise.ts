import { AnimeStatus } from "./anime";
import {
  AnimeWork,
  FranchiseWork,
  SourceFormat,
  SourceWork,
  WorkStub,
} from "./franchise-work";
import { PartialDate } from "./partial-date";
import { RelationType } from "./relation";

export interface FranchiseEdge {
  sourceId: number;
  targetId: number;
  relationType: RelationType;
}

export interface WorkBatch {
  works: FranchiseWork[];
  edges: FranchiseEdge[];
  stubs: WorkStub[];
}

export type FranchiseSourceStatus = "FINISHED" | "ONGOING" | "UNKNOWN";

export interface FranchiseSummary {
  startYear: number | null;
  endYear: number | null;
  lastEndDate: PartialDate | null;
  totalEpisodes: number;
  averageScore: number | null;
  status: AnimeStatus;
  nextAiringEpisode: AnimeWork["nextAiringEpisode"];
  sourceStatus: FranchiseSourceStatus;
  sourceFormat: SourceFormat | null;
}

export interface Franchise {
  rootId: number;
  nodes: Map<number, FranchiseWork>;
  edges: FranchiseEdge[];
  timeline: AnimeWork[];
  related: AnimeWork[];
  sources: SourceWork[];
  summary: FranchiseSummary;
  isComplete: boolean;
  unresolvedIds: number[];
}
