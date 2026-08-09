export const SEARCH_LISTBOX_ID = "anime-search-results";

export function searchResultOptionId(animeId: number): string {
  return `anime-search-result-${animeId}`;
}
