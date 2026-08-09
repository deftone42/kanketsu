export function episodeLabel(episodes: number | null): string {
  if (episodes === null || episodes === 0) return "Episodes TBA";
  return episodes === 1 ? "1 episode" : `${episodes} episodes`;
}
