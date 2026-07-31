"use client";

import Image from "next/image";
import { Search, Loader2, Star, X } from "lucide-react";
import { AnimeSearchResult } from "@/core/ports/anime-repository";

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
  return (
    <div className="relative w-full max-w-xl mx-auto">
      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search anime (e.g. Attack on Titan, Frieren)..."
          className="w-full pl-12 pr-10 py-3.5 bg-gray-900 border border-gray-800 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-lg text-base"
        />
        {query && (
          <button
            onClick={onClear}
            className="absolute right-3 p-1 text-gray-400 hover:text-white transition-colors"
            aria-label="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Loading Indicator */}
      {isSearching && (
        <div className="absolute right-12 top-4">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
        </div>
      )}

      {/* Dropdown Menu */}
      {results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
          {results.map((anime) => (
            <button
              key={anime.id}
              onClick={() => onSelect(anime.id)}
              className="w-full flex items-center gap-4 p-3 hover:bg-gray-800/80 transition-colors text-left border-b border-gray-800/50 last:border-none"
            >
              <div className="relative w-12 h-16 flex-shrink-0">
                <Image
                  src={anime.coverImage}
                  alt={anime.title.userPreferred}
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
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
