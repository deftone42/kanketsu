"use client";

import { Fragment } from "react";
import { FranchiseSummary } from "@/core/domain/models/franchise";
import { AnimeWork, SourceWork } from "@/core/domain/models/franchise-work";
import { Genre } from "@/core/domain/models/genre";
import { BookCheck, BookOpen, Clock, History, Star, Tv } from "lucide-react";
import { episodeLabel } from "@/ui/helpers/episode-label";
import { formatTimeRemaining } from "@/ui/helpers/format-time-remaining";
import { genreName } from "@/ui/helpers/genre-name";
import { lastEntryLabel } from "@/ui/helpers/last-entry-label";
import { relatedFormatCounts } from "@/ui/helpers/related-format-counts";
import {
  soleSourceOf,
  sourceFormatName,
  sourceSizeLabels,
  sourceStatusLabel,
} from "@/ui/helpers/source-labels";
import { yearRange } from "@/ui/helpers/year-range";

interface FranchiseCardProps {
  name: string;
  summary: FranchiseSummary;
  genres: Genre[];
  seasonCount: number;
  related: AnimeWork[];
  sources: SourceWork[];
  monthsSinceLastRelease: number | null;
}

export function FranchiseCard({
  name,
  summary,
  genres,
  seasonCount,
  related,
  sources,
  monthsSinceLastRelease,
}: FranchiseCardProps) {
  const sourceLabel = sourceStatusLabel(summary);
  const soleSource = soleSourceOf(sources);
  const sizeLabels = soleSource === null ? [] : sourceSizeLabels(soleSource);
  const waitLabel = lastEntryLabel(summary.status, monthsSinceLastRelease);

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
                {genreName(genre)}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
          <span className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
            <Tv className="w-3 h-3" />
            {seasonCount === 1 ? "1 season" : `${seasonCount} seasons`}
          </span>

          {relatedFormatCounts(related).map(({ format, label, Icon }) => (
            <span
              key={format}
              className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700"
            >
              <Icon className="w-3 h-3" />
              {label}
            </span>
          ))}

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
            <span>{sourceFormatName(soleSource.format)}</span>
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

        {waitLabel && (
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <History className="w-3.5 h-3.5 text-gray-500" />
            <span>{waitLabel}</span>
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
