import { ScoreLevel } from "@/core/domain/models/score";
import {
  BASE_SCORES,
  SITUATION_COPY,
} from "@/core/domain/services/evaluate-score";
import { WatchingSituation } from "@/core/domain/services/watching-situation";
import { Gauge, GitBranch, Search } from "lucide-react";
import { LEVEL_STYLES } from "./score-level-styles";

const situationsByScore = (
  Object.keys(BASE_SCORES) as WatchingSituation[]
).sort((first, second) => BASE_SCORES[second] - BASE_SCORES[first]);

const scoreBands: ReadonlyArray<{
  level: ScoreLevel;
  label: string;
  range: string;
  meaning: string;
}> = [
  {
    level: "PERFECT_TIME",
    label: "Perfect time",
    range: "90 – 100",
    meaning: "Start tonight. Nothing is left to wait for.",
  },
  {
    level: "GOOD_TIME",
    label: "Good time",
    range: "75 – 89",
    meaning: "Plenty to watch before the release schedule can catch up to you.",
  },
  {
    level: "RISK_INCOMPLETE",
    label: "Risk of incomplete",
    range: "60 – 74",
    meaning: "Worth starting, but the story does not end where the episodes do.",
  },
  {
    level: "IF_CANT_WAIT",
    label: "If you can't wait",
    range: "40 – 59",
    meaning: "Go in knowing you may be left hanging, or waiting week to week.",
  },
  {
    level: "NOT_GOOD_TIME",
    label: "Not a good time",
    range: "10 – 39",
    meaning: "Frozen or unreleased. Add it to your list and come back later.",
  },
  {
    level: "NOT_RECOMMENDED",
    label: "Not recommended",
    range: "0 – 9",
    meaning: "Cancelled before the story could be told.",
  },
];

const steps = [
  {
    icon: Search,
    title: "You pick a title",
    body: "Search any anime. Seasons, films and spin-offs all resolve to the same franchise, so it does not matter which entry you land on.",
  },
  {
    icon: GitBranch,
    title: "We walk the whole franchise",
    body: "Kanketsu traverses every prequel, sequel, movie and OVA, then follows the trail back to the manga or novel underneath it.",
  },
  {
    icon: Gauge,
    title: "You get a timing verdict",
    body: "One number out of 100, a plain-language badge, and the reasoning behind it — including how long the wait is likely to be.",
  },
];

export function ScoringGuide() {
  return (
    <div className="relative z-10">
      <section
        aria-labelledby="how-it-works-heading"
        className="border-t border-white/5 bg-gray-900/30 px-6 sm:px-12 py-16 sm:py-24"
      >
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="space-y-3 text-center">
            <h2
              id="how-it-works-heading"
              className="text-2xl sm:text-3xl font-black tracking-tight text-white"
            >
              How Kanketsu decides
            </h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Starting an anime that stops mid-story is a specific kind of
              disappointment. Kanketsu exists to warn you before it happens.
            </p>
          </div>

          <ol className="grid gap-5 sm:grid-cols-3">
            {steps.map(({ icon: Icon, title, body }, index) => (
              <li
                key={title}
                className="bg-gray-900 border border-gray-800 rounded-3xl p-5 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/30">
                    <Icon className="w-4 h-4 text-indigo-400" />
                  </span>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-gray-400">
                    Step {index + 1}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white leading-tight">
                  {title}
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="score-bands-heading"
        className="relative overflow-hidden border-t border-white/5 bg-gray-950 px-6 sm:px-12 py-16 sm:py-24"
      >
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[420px] h-[420px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-10 relative">
          <div className="space-y-3 text-center">
            <h2
              id="score-bands-heading"
              className="text-2xl sm:text-3xl font-black tracking-tight text-white"
            >
              What the number means
            </h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              The score answers <em>is now a good moment</em>, not{" "}
              <em>is this any good</em>. A masterpiece that stops mid-arc scores
              badly, and that is the whole point.
            </p>
          </div>

          <ul className="space-y-3">
            {scoreBands.map(({ level, label, range, meaning }) => {
              const styles = LEVEL_STYLES[level];

              return (
                <li
                  key={level}
                  className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 rounded-3xl border p-5 ${styles.bg} ${styles.border}`}
                >
                  <span
                    className={`text-sm font-black tabular-nums shrink-0 sm:w-24 ${styles.text}`}
                  >
                    {range}
                  </span>
                  <span
                    className={`text-base font-bold shrink-0 sm:w-48 ${styles.text}`}
                  >
                    {label}
                  </span>
                  <span className="text-sm text-gray-300 leading-relaxed">
                    {meaning}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="situations-heading"
        className="border-t border-white/5 bg-gray-900/30 px-6 sm:px-12 py-16 sm:py-24"
      >
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="space-y-3 text-center">
            <h2
              id="situations-heading"
              className="text-2xl sm:text-3xl font-black tracking-tight text-white"
            >
              The eight situations
            </h2>
            <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Every franchise lands in exactly one of these. The situation sets
              the base score, then a couple of modifiers nudge it.
            </p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            {situationsByScore.map((situation) => (
              <div
                key={situation}
                className="bg-gray-900 border border-gray-800 rounded-3xl p-5 space-y-2"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-base font-bold text-white leading-tight">
                    {SITUATION_COPY[situation].badgeText}
                  </dt>
                  <span className="text-sm font-black tabular-nums text-indigo-400 shrink-0">
                    {BASE_SCORES[situation]}
                  </span>
                </div>
                <dd className="text-sm text-gray-300 leading-relaxed">
                  {SITUATION_COPY[situation].details}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section
        aria-labelledby="philosophy-heading"
        className="relative overflow-hidden border-t border-white/5 bg-gray-950 px-6 sm:px-12 py-16 sm:py-24"
      >
        <div className="absolute bottom-0 right-1/4 w-[380px] h-[300px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-2xl mx-auto space-y-5 text-center relative">
          <h2
            id="philosophy-heading"
            className="text-2xl sm:text-3xl font-black tracking-tight text-white"
          >
            Only a finished story reaches 100
          </h2>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            No amount of backlog beats a story you can actually finish. A series
            with four hundred episodes still airing is a great binge, but it is
            not a closed book — so it tops out below one that is.
          </p>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            The community rating from AniList sits next to the score and never
            enters the calculation. Whether a show is worth your time is your
            call. Kanketsu only tells you whether this is the right moment to
            make it.
          </p>
        </div>
      </section>
    </div>
  );
}
