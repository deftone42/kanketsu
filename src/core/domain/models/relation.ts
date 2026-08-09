export type RelationType =
  | "PREQUEL"
  | "SEQUEL"
  | "PARENT"
  | "SIDE_STORY"
  | "SPIN_OFF"
  | "ALTERNATIVE"
  | "COMPILATION"
  | "CONTAINS"
  | "CHARACTER"
  | "OTHER"
  | "SUMMARY"
  | "ADAPTATION"
  | "SOURCE";

export const MAIN_TIMELINE_RELATIONS: ReadonlySet<RelationType> = new Set([
  "PREQUEL",
  "SEQUEL",
]);

export const CROSSOVER_RELATIONS: ReadonlySet<RelationType> = new Set([
  "CHARACTER",
]);
