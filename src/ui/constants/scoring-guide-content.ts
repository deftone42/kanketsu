import { ScoreLevel } from "@/core/domain/models/score";
import { BASE_SCORES } from "@/core/domain/services/evaluate-score";
import { WatchingSituation } from "@/core/domain/services/watching-situation";
import { Gauge, GitBranch, Search } from "lucide-react";

export const SITUATIONS_BY_SCORE = (
  Object.keys(BASE_SCORES) as WatchingSituation[]
).sort((first, second) => BASE_SCORES[second] - BASE_SCORES[first]);

interface ScoreBand {
  level: ScoreLevel;
  label: string;
  range: string;
  meaning: string;
}

export const SCORE_BANDS: ReadonlyArray<ScoreBand> = [
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

interface GuideStep {
  icon: typeof Search;
  title: string;
  body: string;
}

export const GUIDE_STEPS: ReadonlyArray<GuideStep> = [
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
