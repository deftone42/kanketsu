"use client";

import Image from "next/image";
import { Anime } from "@/core/domain/models/anime";
import { TimingScore, ScoreLevel } from "@/core/domain/models/score";
import { Star, Tv, Calendar, Film } from "lucide-react";

interface AnimeDetailCardProps {
  anime: Anime;
  score: TimingScore;
}

const LEVEL_STYLES: Record<
  ScoreLevel,
  { bg: string; text: string; border: string }
> = {
  GOOD_TIME: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  WAIT_A_BIT: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  IF_CANT_WAIT: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/30",
  },
  NOT_GOOD_TIME: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
  },
};

export function AnimeDetailCard({ anime, score }: AnimeDetailCardProps) {
  const styles = LEVEL_STYLES[score.level];

  return (
    <div className="w-full max-w-2xl mx-auto bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
        <div className="relative w-36 h-52 flex-shrink-0">
          <Image
            src={anime.coverImage}
            alt={anime.title.userPreferred}
            fill
            priority
            sizes="144px"
            className="object-cover rounded-2xl shadow-md"
          />
        </div>

        <div className="space-y-3 text-center sm:text-left flex-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {anime.title.userPreferred}
          </h2>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-gray-400">
            {anime.score && (
              <span className="flex items-center gap-1 text-amber-400 font-semibold bg-amber-400/10 px-2.5 py-1 rounded-full">
                <Star className="w-3.5 h-3.5 fill-current" />
                {anime.score}% AniList Score
              </span>
            )}
            <span className="flex items-center gap-1 bg-gray-800 px-2.5 py-1 rounded-full">
              <Tv className="w-3.5 h-3.5" />
              {anime.status}
            </span>
            {anime.format && (
              <span className="flex items-center gap-1 bg-gray-800 px-2.5 py-1 rounded-full">
                <Film className="w-3.5 h-3.5" />
                {anime.format}
              </span>
            )}
            {anime.releaseYear && (
              <span className="flex items-center gap-1 bg-gray-800 px-2.5 py-1 rounded-full">
                <Calendar className="w-3.5 h-3.5" />
                {anime.releaseYear}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-400 pt-1">
            Total Episodes:{" "}
            <span className="text-white font-medium">
              {anime.episodes || "N/A"}
            </span>
          </p>
        </div>
      </div>

      <div
        className={`p-5 rounded-2xl border ${styles.bg} ${styles.border} space-y-2`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-lg font-bold ${styles.text}`}>
            {score.badgeText}
          </span>
        </div>
        <p className="text-sm font-semibold text-white">{score.summary}</p>
        <p className="text-xs text-gray-300 leading-relaxed">{score.details}</p>
      </div>
    </div>
  );
}
