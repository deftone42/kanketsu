export type ScoreLevel =
  | "GOOD_TIME" // 🟢
  | "WAIT_A_BIT" // 🟡
  | "IF_CANT_WAIT" // 🟠
  | "NOT_GOOD_TIME"; // 🔴

export interface TimingScore {
  level: ScoreLevel;
  badgeText: string;
  summary: string;
  details: string;
}
