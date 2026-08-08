import { AnimeFormat, AnimeStatus } from "@/core/domain/models/anime";
import { Genre } from "@/core/domain/models/genre";
import { PartialDate } from "@/core/domain/models/partial-date";
import { RelationType } from "@/core/domain/models/relation";
import { FranchiseEdge, WorkBatch } from "@/core/domain/models/franchise";
import {
  AnimeWork,
  FranchiseWork,
  SourceFormat,
  SourceStatus,
  SourceWork,
  Title,
  WorkKind,
  WorkStub,
} from "@/core/domain/models/franchise-work";
import {
  AniListBatchMediaItem,
  AniListBatchResponse,
  AniListDate,
  AniListNestedEdge,
  AniListNestedNode,
  AniListTitle,
} from "../dto/anilist-response.dto";
import { toPlainText } from "./to-plain-text";

const ANIME_FORMATS: ReadonlySet<string> = new Set([
  "TV",
  "TV_SHORT",
  "MOVIE",
  "SPECIAL",
  "OVA",
  "ONA",
]);

const SOURCE_FORMATS: ReadonlySet<string> = new Set([
  "MANGA",
  "NOVEL",
  "ONE_SHOT",
]);

const RELATION_TYPES: ReadonlySet<string> = new Set([
  "PREQUEL",
  "SEQUEL",
  "PARENT",
  "SIDE_STORY",
  "SPIN_OFF",
  "ALTERNATIVE",
  "COMPILATION",
  "CONTAINS",
  "CHARACTER",
  "OTHER",
  "SUMMARY",
  "ADAPTATION",
  "SOURCE",
]);

/**
 * AniList tags freely and adds genres over time, so an unknown label is
 * expected traffic rather than a defect: it is dropped, never leaked raw.
 */
const GENRES_BY_ANILIST_LABEL: ReadonlyMap<string, Genre> = new Map([
  ["Action", "ACTION"],
  ["Adventure", "ADVENTURE"],
  ["Comedy", "COMEDY"],
  ["Drama", "DRAMA"],
  ["Ecchi", "ECCHI"],
  ["Fantasy", "FANTASY"],
  ["Hentai", "HENTAI"],
  ["Horror", "HORROR"],
  ["Mahou Shoujo", "MAHOU_SHOUJO"],
  ["Mecha", "MECHA"],
  ["Music", "MUSIC"],
  ["Mystery", "MYSTERY"],
  ["Psychological", "PSYCHOLOGICAL"],
  ["Romance", "ROMANCE"],
  ["Sci-Fi", "SCI_FI"],
  ["Slice of Life", "SLICE_OF_LIFE"],
  ["Sports", "SPORTS"],
  ["Supernatural", "SUPERNATURAL"],
  ["Thriller", "THRILLER"],
]);

function mapGenres(genres: string[] | null | undefined): Genre[] {
  return (genres ?? [])
    .map((label) => GENRES_BY_ANILIST_LABEL.get(label))
    .filter((genre): genre is Genre => genre !== undefined);
}

function mapTitle(title: AniListTitle | undefined): Title {
  return {
    userPreferred: title?.userPreferred ?? "",
    english: title?.english ?? null,
    romaji: title?.romaji ?? null,
    native: title?.native ?? null,
  };
}

function mapDate(date: AniListDate | undefined): PartialDate {
  return {
    year: date?.year ?? null,
    month: date?.month ?? null,
    day: date?.day ?? null,
  };
}

function mapEndDate(date: AniListDate | undefined): PartialDate | null {
  return date?.year == null ? null : mapDate(date);
}

function mapAnimeFormat(format: string | null | undefined): AnimeFormat | null {
  return format != null && ANIME_FORMATS.has(format)
    ? (format as AnimeFormat)
    : null;
}

/** AniList's vocabulary differs from ours: RELEASING is our ONGOING. */
function mapAnimeStatus(status: string | null | undefined): AnimeStatus {
  switch (status) {
    case "RELEASING":
      return "ONGOING";
    case "NOT_YET_RELEASED":
      return "NOT_RELEASED";
    case "CANCELLED":
      return "CANCELLED";
    case "HIATUS":
      return "HIATUS";
    default:
      return "FINISHED";
  }
}

function mapSourceStatus(status: string | null | undefined): SourceStatus {
  switch (status) {
    case "RELEASING":
      return "RELEASING";
    case "HIATUS":
      return "HIATUS";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "FINISHED";
  }
}

function workKindOf(
  type: string | null | undefined,
  format: string | null | undefined,
): WorkKind {
  if (type === "MANGA") return "SOURCE";
  if (type === "ANIME") return "ANIME";
  return format != null && SOURCE_FORMATS.has(format) ? "SOURCE" : "ANIME";
}

function mapRelationType(
  relationType: string | null | undefined,
): RelationType | null {
  return relationType != null && RELATION_TYPES.has(relationType)
    ? (relationType as RelationType)
    : null;
}

function toAnimeWork(media: AniListBatchMediaItem): AnimeWork {
  const nextAiring = media.nextAiringEpisode;
  const title = mapTitle(media.title);

  return {
    kind: "ANIME",
    id: media.id,
    title,
    coverImage: media.coverImage?.large ?? "",
    format: mapAnimeFormat(media.format),
    startDate: mapDate(media.startDate),
    endDate: mapEndDate(media.endDate),
    episodes: media.episodes ?? null,
    score: media.averageScore ?? null,
    status: mapAnimeStatus(media.status),
    genres: mapGenres(media.genres),
    description: toPlainText(media.description),
    nextAiringEpisode: nextAiring
      ? {
          episode: nextAiring.episode,
          timeUntilAiringSeconds: nextAiring.timeUntilAiring,
          seasonTitle: title.userPreferred,
        }
      : null,
  };
}

function toSourceWork(media: AniListBatchMediaItem): SourceWork {
  const format =
    media.format != null && SOURCE_FORMATS.has(media.format)
      ? (media.format as SourceFormat)
      : "MANGA";

  return {
    kind: "SOURCE",
    id: media.id,
    title: mapTitle(media.title),
    format,
    status: mapSourceStatus(media.status),
    chapters: media.chapters ?? null,
    volumes: media.volumes ?? null,
  };
}

function toWork(media: AniListBatchMediaItem): FranchiseWork {
  return workKindOf(media.type, media.format) === "SOURCE"
    ? toSourceWork(media)
    : toAnimeWork(media);
}

function toStub(node: AniListNestedNode): WorkStub {
  return {
    id: node.id,
    kind: workKindOf(node.type, node.format),
    format: node.format ?? null,
    title: node.title?.userPreferred ?? "",
  };
}

/**
 * Walks a nested `relations` projection, collecting edges and stubs.
 * Nested nodes are topology, never content, so they never become works.
 */
function collectTopology(
  sourceId: number,
  edges: AniListNestedEdge[] | null | undefined,
  intoEdges: Map<string, FranchiseEdge>,
  intoStubs: Map<number, WorkStub>,
): void {
  for (const edge of edges ?? []) {
    const relationType = mapRelationType(edge.relationType);
    const node = edge.node;
    if (relationType === null || node?.id == null) continue;

    intoEdges.set(`${sourceId}:${relationType}:${node.id}`, {
      sourceId,
      targetId: node.id,
      relationType,
    });

    if (!intoStubs.has(node.id)) intoStubs.set(node.id, toStub(node));

    collectTopology(node.id, node.relations?.edges, intoEdges, intoStubs);
  }
}

/**
 * Turns one batched AniList response into domain works plus the topology
 * discovered around them. Hydration and topology are deliberately separate:
 * only top-level media carry full fields.
 */
export function mapBatchResponse(response: AniListBatchResponse): WorkBatch {
  const media = response.data?.Page?.media ?? [];

  const works: FranchiseWork[] = [];
  const edges = new Map<string, FranchiseEdge>();
  const stubs = new Map<number, WorkStub>();

  for (const item of media) {
    if (item?.id == null) continue;
    works.push(toWork(item));
    collectTopology(item.id, item.relations?.edges, edges, stubs);
  }

  const hydratedIds = new Set(works.map((work) => work.id));

  return {
    works,
    edges: [...edges.values()],
    stubs: [...stubs.values()].filter((stub) => !hydratedIds.has(stub.id)),
  };
}
