export type ScoreLevel =
  | "PERFECT_TIME"
  | "GOOD_TIME"
  | "IF_CANT_WAIT"
  | "RISK_INCOMPLETE"
  | "NOT_GOOD_TIME"
  | "NOT_RECOMMENDED";

export interface TimingScore {
  score: number;
  level: ScoreLevel;
  badgeText: string;
  summary: string;
  details: string;
  notes: string[];
}
