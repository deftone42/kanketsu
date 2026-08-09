"use client";

import { TimingScore } from "@/core/domain/models/score";
import { PlayCircle } from "lucide-react";
import { LEVEL_STYLES } from "@/ui/constants/score-level-styles";

interface ScoreCardProps {
  score: TimingScore;
}

export function ScoreCard({ score }: ScoreCardProps) {
  const styles = LEVEL_STYLES[score.level];

  return (
    <section
      aria-label="Watching score"
      aria-describedby="watching-score-verdict"
      className={`rounded-3xl border p-5 space-y-3 ${styles.bg} ${styles.border}`}
    >
      <p id="watching-score-verdict" className="sr-only">
        {score.badgeText}. Scored {score.score} out of 100.
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 opacity-80">
          <PlayCircle className={`w-4 h-4 ${styles.text}`} />
          <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400">
            Kanketsu Watching Score
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

      {score.notes.length > 0 && (
        <ul className="space-y-1 border-t border-white/10 pt-3">
          {score.notes.map((note) => (
            <li key={note} className="text-xs text-gray-400">
              {note}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
