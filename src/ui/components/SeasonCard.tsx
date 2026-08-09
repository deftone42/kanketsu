"use client";

import Image from "next/image";
import { AnimeWork } from "@/core/domain/models/franchise-work";
import { Calendar, Clock, Star, Tv } from "lucide-react";
import { episodeLabel } from "@/ui/helpers/episode-label";
import { formatTimeRemaining } from "@/ui/helpers/format-time-remaining";
import { runLabel } from "@/ui/helpers/run-label";
import { SEASON_CARD_ID } from "@/ui/constants/section-ids";

interface SeasonCardProps {
  season: AnimeWork;
}

export function SeasonCard({ season }: SeasonCardProps) {
  return (
    <section
      id={SEASON_CARD_ID}
      aria-label="Viewing"
      className="bg-gray-900 border border-gray-800 rounded-3xl p-5 space-y-4"
    >
      <p
        role="status"
        aria-label="Now viewing"
        className="text-xs uppercase tracking-wider font-bold text-gray-400"
      >
        Viewing <span className="sr-only">{season.title.userPreferred}</span>
      </p>

      <div className="flex gap-4">
        <div className="relative w-20 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-gray-800">
          {season.coverImage && (
            <Image
              src={season.coverImage}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
            />
          )}
        </div>

        <div className="space-y-2 min-w-0">
          <h2 className="text-base font-bold text-white leading-tight">
            {season.title.userPreferred}
          </h2>

          <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
            <span className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
              <Tv className="w-3 h-3" />
              {season.format ?? "Unknown format"}
            </span>

            <span className="flex items-center gap-1 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
              <Calendar className="w-3 h-3" />
              {runLabel(season.startDate, season.endDate)}
            </span>

            {season.score !== null && (
              <span className="flex items-center gap-1 text-amber-400 font-semibold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                <Star className="w-3 h-3 fill-current" />
                <span>{season.score}%</span>
                <span className="font-medium text-amber-400/70">
                  User score
                </span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
            <span>{episodeLabel(season.episodes)}</span>
            <span aria-hidden="true" className="text-gray-600">
              ·
            </span>
            <span>{season.status.replace(/_/g, " ")}</span>
          </div>
        </div>
      </div>

      {season.nextAiringEpisode && (
        <div
          role="status"
          aria-label="Next episode"
          className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 flex items-center justify-between gap-3 text-[11px] text-blue-300"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <p className="font-semibold text-white truncate">
              Episode {season.nextAiringEpisode.episode}
            </p>
          </div>
          <span className="bg-blue-500/20 border border-blue-500/40 text-blue-300 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
            {formatTimeRemaining(
              season.nextAiringEpisode.timeUntilAiringSeconds,
            )}
          </span>
        </div>
      )}

      {season.description && (
        <p
          aria-label="Synopsis"
          className="text-xs text-gray-400 leading-relaxed line-clamp-4"
        >
          {season.description}
        </p>
      )}
    </section>
  );
}
