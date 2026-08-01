"use client";

import Image from "next/image";
import { Anime } from "@/core/domain/models/anime";
import { ScoreLevel, TimingScore } from "@/core/domain/models/score";
import { Star, Tv, Calendar, Film, PlayCircle, Clock } from "lucide-react";

interface AnimeDetailCardProps {
  anime: Anime;
  watchingScore: TimingScore;
}

const LEVEL_STYLES: Record<
  ScoreLevel,
  { bg: string; text: string; border: string }
> = {
  PERFECT_TIME: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  GOOD_TIME: {
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    border: "border-teal-500/30",
  },
  IF_CANT_WAIT: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/30",
  },
  RISK_INCOMPLETE: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  NOT_GOOD_TIME: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
  },
  NOT_RECOMMENDED: {
    bg: "bg-red-950/40",
    text: "text-red-400",
    border: "border-red-500/30",
  },
};

function formatTimeRemaining(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export function AnimeDetailCard({
  anime,
  watchingScore,
}: AnimeDetailCardProps) {
  const styles =
    LEVEL_STYLES[watchingScore.level] || LEVEL_STYLES.NOT_GOOD_TIME;

  const seasonsCount = anime.seasons.length;
  const moviesCount = anime.movies.length;

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
            {/* User Score Badge */}
            {anime.userScore !== null && anime.userScore !== undefined && (
              <span
                className="flex items-center gap-1 text-amber-400 font-semibold bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20"
                title="Average score given by AniList users across the franchise"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                {anime.userScore}% Franchise Score
              </span>
            )}

            <span className="flex items-center gap-1 bg-gray-800 px-2.5 py-1 rounded-full border border-gray-700">
              <Tv className="w-3.5 h-3.5" />
              {anime.status.replace(/_/g, " ")}
            </span>

            {/* Franchise Structure Badges */}
            <span className="flex items-center gap-1 bg-gray-800 px-2.5 py-1 rounded-full border border-gray-700">
              <Film className="w-3.5 h-3.5" />
              {seasonsCount} {seasonsCount === 1 ? "Season" : "Seasons"}
              {moviesCount > 0 &&
                ` • ${moviesCount} Movie${moviesCount > 1 ? "s" : ""}`}
            </span>

            {anime.releaseYear && (
              <span className="flex items-center gap-1 bg-gray-800 px-2.5 py-1 rounded-full border border-gray-700">
                <Calendar className="w-3.5 h-3.5" />
                {anime.releaseYear}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-400 pt-1">
            Total TV Episodes:{" "}
            <span className="text-white font-medium">
              {anime.totalEpisodes > 0
                ? anime.totalEpisodes
                : "Ongoing / Unknown"}
            </span>
          </p>
        </div>
      </div>

      {/* NEXT AIRING EPISODE BANNER (si existe) */}
      {anime.nextAiringEpisode && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 flex items-center justify-between text-xs text-blue-300">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-white">
                Next: {anime.nextAiringEpisode.seasonTitle}
              </p>
              <p className="text-blue-300/80">
                Episode {anime.nextAiringEpisode.episode}
              </p>
            </div>
          </div>
          <span className="bg-blue-500/20 border border-blue-500/40 text-blue-300 px-3 py-1 rounded-full font-bold">
            Airing in{" "}
            {formatTimeRemaining(
              anime.nextAiringEpisode.timeUntilAiringSeconds,
            )}
          </span>
        </div>
      )}

      {/* SECTION 2: ANITIME WATCHING SCORE */}
      <div
        className={`p-5 rounded-2xl border ${styles.bg} ${styles.border} space-y-3 transition-all duration-300 relative overflow-hidden`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 opacity-80">
            <PlayCircle className={`w-4 h-4 ${styles.text}`} />
            <span className="text-xs uppercase tracking-wider font-bold text-gray-400">
              AniTime Watching Score
            </span>
          </div>

          {/* OUR NUMERIC SCORE BADGE */}
          {watchingScore.score !== undefined && (
            <div className="flex items-baseline gap-0.5">
              <span className={`text-2xl font-black ${styles.text}`}>
                {watchingScore.score}
              </span>
              <span className="text-xs font-semibold text-gray-400">/100</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-xl font-bold ${styles.text}`}>
            {watchingScore.badgeText}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">
            {watchingScore.summary}
          </p>
          <p className="text-sm text-gray-300 leading-relaxed">
            {watchingScore.details}
          </p>
        </div>
      </div>
    </div>
  );
}
