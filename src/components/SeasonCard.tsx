"use client";

import Image from "next/image";
import { AnimeWork } from "@/core/domain/models/franchise-work";
import { Calendar, Star, Tv } from "lucide-react";

interface SeasonCardProps {
  /** The entry the user actually selected. */
  season: AnimeWork;
}

function episodeLabel(episodes: number | null): string {
  if (episodes === null) return "Episodes TBA";
  return episodes === 1 ? "1 episode" : `${episodes} episodes`;
}

/**
 * The entry the user picked, on its own terms.
 *
 * Deliberately separate from the franchise card: searching for a second
 * season and being shown the first season's metadata is the confusion this
 * exists to remove.
 */
export function SeasonCard({ season }: SeasonCardProps) {
  return (
    <section
      aria-label="Selected season"
      className="bg-gray-900 border border-gray-800 rounded-3xl p-5 space-y-4"
    >
      <p className="text-xs uppercase tracking-wider font-bold text-gray-400">
        You selected
      </p>

      <div className="flex gap-4">
        <div className="relative w-20 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-gray-800">
          {season.coverImage && (
            <Image
              src={season.coverImage}
              alt={season.title.userPreferred}
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
              {season.startDate.year ?? "TBA"}
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
    </section>
  );
}
