"use client";

import { Fragment } from "react";
import { AnimeFormat } from "@/core/domain/models/anime";
import { FranchiseSummary } from "@/core/domain/models/franchise";
import {
  AnimeWork,
  SourceFormat,
  SourceWork,
} from "@/core/domain/models/franchise-work";
import { Genre } from "@/core/domain/models/genre";
import {
  BookCheck,
  BookOpen,
  Clock,
  Disc,
  Film,
  History,
  MonitorPlay,
  Sparkles,
  Star,
  Tv,
} from "lucide-react";
import { formatMonthsElapsed } from "./format-elapsed";
import { formatTimeRemaining } from "./format-time-remaining";

interface FranchiseCardProps {
  /** Display name of the series — the first entry's title. */
  name: string;
  summary: FranchiseSummary;
  /** What the franchise as a whole is about, most representative first. */
  genres: Genre[];
  seasonCount: number;
  /** Everything outside the timeline: movies, OVAs, specials, ONAs. */
  related: AnimeWork[];
  sources: SourceWork[];
  monthsSinceLastRelease: number | null;
}

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

const SOURCE_FORMAT_NAMES: Record<SourceFormat, string> = {
  MANGA: "Manga",
  NOVEL: "Novel",
  ONE_SHOT: "One-shot",
};

interface RelatedFormat {
  format: AnimeFormat;
  singular: string;
  plural: string;
  Icon: typeof Film;
}

const COUNTED_RELATED_FORMATS: RelatedFormat[] = [
  { format: "MOVIE", singular: "movie", plural: "movies", Icon: Film },
  { format: "OVA", singular: "OVA", plural: "OVAs", Icon: Disc },
  { format: "SPECIAL", singular: "special", plural: "specials", Icon: Sparkles },
  { format: "ONA", singular: "ONA", plural: "ONAs", Icon: MonitorPlay },
];

function countOf(related: AnimeWork[], format: AnimeFormat): number {
  return related.filter((work) => work.format === format).length;
}

/**
 * Chapter and volume counts only mean something when they describe one work.
 * Monogatari adapts five separate light novels, and their sum would be a
 * number no book has.
 */
function soleSourceOf(sources: SourceWork[]): SourceWork | null {
  return sources.length === 1 ? sources[0] : null;
}

function sourceSizeLabels(source: SourceWork): string[] {
  const labels: string[] = [];

  if (source.chapters !== null) {
    labels.push(
      source.chapters === 1 ? "1 chapter" : `${source.chapters} chapters`,
    );
  }
  if (source.volumes !== null) {
    labels.push(
      source.volumes === 1 ? "1 volume" : `${source.volumes} volumes`,
    );
  }

  return labels;
}

/**
 * How long the wait has been only reads as a wait once the franchise has
 * stopped: beside a countdown to the next episode it contradicts itself.
 */
function isWaiting(status: FranchiseSummary["status"]): boolean {
  return status !== "ONGOING" && status !== "NEW_SEASON_COMING";
}

/**
 * "Manga finished" tells the reader more than "Source finished", and whether
 * the source has concluded is the strongest hint that more anime is coming.
 */
function sourceLabelOf(summary: FranchiseSummary): string | null {
  if (summary.sourceStatus === "UNKNOWN" || summary.sourceFormat === null) {
    return null;
  }

  const name = SOURCE_FORMAT_NAMES[summary.sourceFormat];
  return summary.sourceStatus === "FINISHED"
    ? `${name} finished`
    : `${name} ongoing`;
}

function episodeLabel(totalEpisodes: number): string {
  if (totalEpisodes === 0) return "Episodes TBA";
  return totalEpisodes === 1 ? "1 episode" : `${totalEpisodes} episodes`;
}

/**
 * A franchise that is still running has no end year, which reads as an
 * open range rather than a missing value.
 */
function yearRange(
  startYear: number | null,
  endYear: number | null,
  status: FranchiseSummary["status"],
): string {
  if (startYear === null) return "TBA";
  if (endYear === null) {
    return status === "FINISHED" ? String(startYear) : `${startYear} – present`;
  }
  return startYear === endYear ? String(startYear) : `${startYear} – ${endYear}`;
}

/** The series as a whole: everything the selected entry alone cannot tell you. */
export function FranchiseCard({
  name,
  summary,
  genres,
  seasonCount,
  related,
  sources,
  monthsSinceLastRelease,
}: FranchiseCardProps) {
  const sourceLabel = sourceLabelOf(summary);
  const soleSource = soleSourceOf(sources);
  const sizeLabels = soleSource === null ? [] : sourceSizeLabels(soleSource);
  const showsWait =
    monthsSinceLastRelease !== null && isWaiting(summary.status);

  return (
    <section
      aria-label="Series summary"
      className="bg-gray-900 border border-gray-800 rounded-3xl p-5 space-y-4"
    >
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider font-bold text-gray-400">
          Series
        </p>

        <h2 className="text-base font-bold text-white leading-tight">{name}</h2>

        {genres.length > 0 && (
          <ul aria-label="Genres" className="flex flex-wrap gap-1.5">
            {genres.map((genre) => (
              <li
                key={genre}
                className="text-[11px] font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full"
              >
                {GENRE_NAMES[genre]}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
          <span className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
            <Tv className="w-3 h-3" />
            {seasonCount === 1 ? "1 season" : `${seasonCount} seasons`}
          </span>

          {COUNTED_RELATED_FORMATS.map(
            ({ format, singular, plural, Icon }) => {
              const count = countOf(related, format);
              if (count === 0) return null;

              return (
                <span
                  key={format}
                  className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700"
                >
                  <Icon className="w-3 h-3" />
                  {count === 1 ? `1 ${singular}` : `${count} ${plural}`}
                </span>
              );
            },
          )}

          {summary.averageScore !== null && (
            <span className="flex items-center gap-1 text-amber-400 font-semibold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              <Star className="w-3 h-3 fill-current" />
              <span>{summary.averageScore}%</span>
              <span className="font-medium text-amber-400/70">
                Seasons average user score
              </span>
            </span>
          )}

          {sourceLabel && (
            <span className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
              <BookCheck className="w-3 h-3" />
              {sourceLabel}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
          <span>{episodeLabel(summary.totalEpisodes)}</span>
          <span aria-hidden="true" className="text-gray-600">
            ·
          </span>
          <span>
            {yearRange(summary.startYear, summary.endYear, summary.status)}
          </span>
        </div>

        {soleSource !== null && sizeLabels.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
            <BookOpen className="w-3.5 h-3.5 text-gray-500" />
            <span>{SOURCE_FORMAT_NAMES[soleSource.format]}</span>
            {sizeLabels.map((label) => (
              <Fragment key={label}>
                <span aria-hidden="true" className="text-gray-600">
                  ·
                </span>
                <span>{label}</span>
              </Fragment>
            ))}
          </div>
        )}

        {showsWait && (
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <History className="w-3.5 h-3.5 text-gray-500" />
            <span>Last entry {formatMonthsElapsed(monthsSinceLastRelease)}</span>
          </p>
        )}
      </div>

      {summary.nextAiringEpisode && (
        <div
          role="status"
          aria-label="Next episode"
          className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 flex items-center justify-between gap-3 text-[11px] text-blue-300"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">
                {summary.nextAiringEpisode.seasonTitle}
              </p>
              <p className="text-blue-300/80">
                Episode {summary.nextAiringEpisode.episode}
              </p>
            </div>
          </div>
          <span className="bg-blue-500/20 border border-blue-500/40 text-blue-300 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
            {formatTimeRemaining(
              summary.nextAiringEpisode.timeUntilAiringSeconds,
            )}
          </span>
        </div>
      )}

    </section>
  );
}
