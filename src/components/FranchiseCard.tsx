"use client";

import { FranchiseSummary } from "@/core/domain/models/franchise";
import { SourceFormat } from "@/core/domain/models/franchise-work";
import { BookCheck, Clock, Film, Star, Tv } from "lucide-react";

interface FranchiseCardProps {
  /** Display name of the series — the first entry's title. */
  name: string;
  summary: FranchiseSummary;
  seasonCount: number;
  movieCount: number;
}

const SOURCE_FORMAT_NAMES: Record<SourceFormat, string> = {
  MANGA: "Manga",
  NOVEL: "Novel",
  ONE_SHOT: "One-shot",
};

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

function formatTimeRemaining(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
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
  seasonCount,
  movieCount,
}: FranchiseCardProps) {
  const sourceLabel = sourceLabelOf(summary);

  return (
    <section
      aria-label="Series summary"
      className="bg-gray-900 border border-gray-800 rounded-3xl p-5 space-y-4"
    >
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider font-bold text-gray-500">
          Series
        </p>

        <h2 className="text-base font-bold text-white leading-tight">{name}</h2>

        <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
          <span className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
            <Tv className="w-3 h-3" />
            {seasonCount === 1 ? "1 season" : `${seasonCount} seasons`}
          </span>

          {movieCount > 0 && (
            <span className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
              <Film className="w-3 h-3" />
              {movieCount === 1 ? "1 movie" : `${movieCount} movies`}
            </span>
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
