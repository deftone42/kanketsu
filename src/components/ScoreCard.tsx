"use client";

import { ScoreLevel, TimingScore } from "@/core/domain/models/score";
import { PlayCircle } from "lucide-react";

interface ScoreCardProps {
  score: TimingScore;
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

/** The app's answer: is now a good time to watch this? */
export function ScoreCard({ score }: ScoreCardProps) {
  const styles = LEVEL_STYLES[score.level];

  return (
    <section
      aria-label="Watching score"
      aria-describedby="watching-score-verdict"
      className={`rounded-3xl border p-5 space-y-3 ${styles.bg} ${styles.border}`}
    >
      {/* The colour carries the verdict visually; this carries it otherwise. */}
      <p id="watching-score-verdict" className="sr-only">
        {score.badgeText}. Scored {score.score} out of 100.
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 opacity-80">
          <PlayCircle className={`w-4 h-4 ${styles.text}`} />
          <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400">
            AniTime Watching Score
          </span>
        </div>

        <div className="flex items-baseline gap-0.5">
          <span className={`text-3xl font-black ${styles.text}`}>
            {score.score}
          </span>
          <span className="text-xs font-semibold text-gray-400">/100</span>
        </div>
      </div>

      <p className={`text-xl font-bold ${styles.text}`}>{score.badgeText}</p>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">{score.summary}</p>
        <p className="text-sm text-gray-300 leading-relaxed">{score.details}</p>
      </div>
    </section>
  );
}
