"use client";

import { useAnimeSearch } from "@/hooks/useAnimeSearch";
import { SearchBar } from "@/components/SearchBar";
import { AnimeDetailCard } from "@/components/AnimeDetailCard";
import { Clock, Sparkles, Loader2 } from "lucide-react";

export default function Home() {
  const {
    query,
    setQuery,
    results,
    isSearching,
    selectedAnime,
    score,
    isFetchingDetail,
    selectAnime,
    clearSelection,
  } = useAnimeSearch();

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto w-full space-y-10 relative z-10 my-auto">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            AniList Powered Decision Engine
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white flex items-center justify-center gap-3">
            <Clock className="w-10 h-10 sm:w-14 sm:h-14 text-indigo-500" />
            Ani<span className="text-indigo-500">Time</span>
          </h1>

          <p className="text-gray-400 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            Find out if it’s the right moment to start watching an anime
          </p>
        </header>

        <section>
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            results={results}
            isSearching={isSearching}
            onSelect={selectAnime}
            onClear={clearSelection}
          />
        </section>

        {isFetchingDetail && (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-gray-400 font-medium animate-pulse">
              Analyzing seasons, sequels, and release status...
            </p>
          </div>
        )}

        {!isFetchingDetail && selectedAnime && score && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AnimeDetailCard anime={selectedAnime} score={score} />
          </section>
        )}

        {/* Estado inicial / vacío */}
        {!isFetchingDetail && !selectedAnime && (
          <div className="text-center py-8 text-gray-600 text-xs uppercase tracking-wider font-semibold">
            Search for any title above to calculate the watch timing
          </div>
        )}
      </div>

      <footer className="text-center text-xs text-gray-600 py-6 relative z-10">
        AniTime &copy; {new Date().getFullYear()} &bull; Built with Next.js &
        AniList GraphQL API
      </footer>
    </main>
  );
}
