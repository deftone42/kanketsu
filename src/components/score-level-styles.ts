import { ScoreLevel } from "@/core/domain/models/score";

export interface ScoreLevelStyle {
  bg: string;
  text: string;
  border: string;
}

export const LEVEL_STYLES: Record<ScoreLevel, ScoreLevelStyle> = {
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
  RISK_INCOMPLETE: {
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
  NOT_RECOMMENDED: {
    bg: "bg-red-950/40",
    text: "text-red-400",
    border: "border-red-500/30",
  },
};
