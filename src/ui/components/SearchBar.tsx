"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Loader2, Star, X } from "lucide-react";
import { AnimeSearchResult } from "@/core/ports/anime-repository";
import {
  SEARCH_LISTBOX_ID,
  searchResultOptionId,
} from "@/ui/helpers/search-result-ids";

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  results: AnimeSearchResult[];
  isSearching: boolean;
  onSelect: (id: number) => void;
  onClear: () => void;
}

export function SearchBar({
  query,
  onQueryChange,
  results,
  isSearching,
  onSelect,
  onClear,
}: SearchBarProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isDismissed, setIsDismissed] = useState(false);

  const isExpanded = results.length > 0 && !isDismissed;
  const activeOption = isExpanded ? results[activeIndex] : undefined;

  const close = () => {
    setIsDismissed(true);
    setActiveIndex(-1);
  };

  const select = (id: number) => {
    onSelect(id);
    close();
  };

  const moveActiveIndex = (offset: number) => {
    setActiveIndex((current) => {
      const next = current + offset;
      if (next < 0) return results.length - 1;
      if (next >= results.length) return 0;
      return next;
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      close();
      return;
    }

    if (results.length === 0) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setIsDismissed(false);
      moveActiveIndex(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key === "Enter" && activeOption) {
      event.preventDefault();
      select(activeOption.id);
    }
  };

  const status = isSearching
    ? "Searching anime"
    : results.length > 0
      ? `${results.length} suggestions available. Use the arrow keys to review them.`
      : "";

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-gray-400" />
        <input
          type="text"
          role="combobox"
          aria-label="Search anime"
          aria-expanded={isExpanded}
          aria-controls={SEARCH_LISTBOX_ID}
          aria-autocomplete="list"
          aria-activedescendant={
            activeOption ? searchResultOptionId(activeOption.id) : undefined
          }
          autoComplete="off"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setIsDismissed(false);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search anime (e.g. Attack on Titan, Frieren)..."
          className="w-full pl-12 pr-10 py-3.5 bg-gray-900 border border-gray-800 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-lg text-base"
        />
        {query && (
          <button
            onClick={onClear}
            className="absolute right-3 p-1 text-gray-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded transition-colors"
            aria-label="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {status}
      </p>

      {isSearching && (
        <div className="absolute right-12 top-4">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
        </div>
      )}

      <ul
        id={SEARCH_LISTBOX_ID}
        role="listbox"
        aria-label="Anime suggestions"
        hidden={!isExpanded}
        className="absolute z-50 left-0 right-0 mt-2 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md"
      >
        {results.map((anime, index) => (
          <li
            key={anime.id}
            id={searchResultOptionId(anime.id)}
            role="option"
            aria-selected={index === activeIndex}
            onMouseDown={(event) => {
              event.preventDefault();
              select(anime.id);
            }}
            className={`w-full flex items-center gap-4 p-3 cursor-pointer transition-colors text-left border-b border-gray-800/50 last:border-none ${
              index === activeIndex ? "bg-gray-800" : "hover:bg-gray-800/80"
            }`}
          >
            <div className="relative w-12 h-16 flex-shrink-0">
              <Image
                src={anime.coverImage}
                alt=""
                fill
                sizes="48px"
                className="object-cover rounded-lg shadow-sm"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {anime.title.userPreferred}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                {anime.releaseYear && <span>{anime.releaseYear}</span>}
                {anime.score && (
                  <span className="flex items-center gap-1 text-amber-400 font-medium">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {anime.score}%
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
