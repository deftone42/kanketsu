import { Anime } from "./anime";
import { Relation } from "./relation";

/**
 * Represents a complete anime franchise collected via graph traversal.
 *
 * A franchise contains:
 * - A root ID (the starting anime the user searched for)
 * - All nodes (every anime entry connected to the root, all formats)
 * - All edges (every relation edge discovered during traversal)
 * - The main timeline (ordered PREQUEL/SEQUEL chain)
 */
export interface Franchise {
  /** The AniList ID of the anime the user started from. */
  rootId: number;
  /** All anime entries in the franchise, keyed by ID for O(1) lookup. */
  nodes: Map<number, Anime>;
  /** All relation edges discovered during traversal (source → target). */
  edges: FranchiseEdge[];
  /** Ordered list of anime forming the main timeline (PREQUEL/SEQUEL chain). */
  mainTimeline: Anime[];
}

/**
 * A directed relation edge within a franchise graph.
 * Source is the anime that owns this relation, target is the related anime.
 */
export interface FranchiseEdge {
  /** The AniList ID of the source anime. */
  sourceId: number;
  /** The relation edge data. */
  relation: Relation;
}
