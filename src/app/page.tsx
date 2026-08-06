"use client";

import { useAnimeSearch } from "@/hooks/useAnimeSearch";
import { SearchBar } from "@/components/SearchBar";
import { SeasonCard } from "@/components/SeasonCard";
import { FranchiseCard } from "@/components/FranchiseCard";
import { ScoreCard } from "@/components/ScoreCard";
import { FranchiseTimeline } from "@/components/FranchiseTimeline";
import { isAnimeWork } from "@/core/domain/models/franchise-work";
import { Clock, Loader2 } from "lucide-react";

export default function Home() {
  const {
    query,
    setQuery,
    results,
    isSearching,
    franchise,
    score,
    isFetchingDetail,
    selectAnime,
    clearSelection,
  } = useAnimeSearch();

  const selectedWork = franchise?.nodes.get(franchise.rootId);
  const selectedSeason =
    selectedWork && isAnimeWork(selectedWork) ? selectedWork : null;

  // The first entry names the franchise: "Shingeki no Kyojin", not "Season 3".
  const franchiseName = franchise?.timeline[0]?.title.userPreferred ?? "";
  const movieCount =
    franchise?.related.filter((work) => work.format === "MOVIE").length ?? 0;

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto w-full space-y-10 relative z-10 my-auto">
        <header className="text-center space-y-4">
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

        {/*
          A failed first request still yields a Franchise — empty, but with a
          summary that scores as "Completed Story". Never show a verdict we
          have no data behind.
        */}
        {!isFetchingDetail && franchise && franchise.timeline.length === 0 && (
          <div
            role="alert"
            className="text-center py-8 space-y-2 text-rose-300/90"
          >
            <p className="text-sm font-semibold">Could not load this series.</p>
            <p className="text-xs text-gray-500">
              AniList may be rate-limiting us. Try again in a moment.
            </p>
          </div>
        )}

        {!isFetchingDetail &&
          franchise &&
          score &&
          franchise.timeline.length > 0 && (
            <section
              aria-label="Anime detail card"
              className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6"
            >
              <div className="grid gap-6 sm:grid-cols-2">
                {selectedSeason && <SeasonCard season={selectedSeason} />}

                <FranchiseCard
                  name={franchiseName}
                  summary={franchise.summary}
                  seasonCount={franchise.timeline.length}
                  movieCount={movieCount}
                />
              </div>

              <ScoreCard score={score} />

              <FranchiseTimeline
                timeline={franchise.timeline}
                selectedId={franchise.rootId}
              />

              {!franchise.isComplete && (
                <p className="text-center text-xs text-amber-400/80">
                  Some entries could not be loaded (
                  {franchise.unresolvedIds.length} missing).
                </p>
              )}
            </section>
          )}

        {!isFetchingDetail && !franchise && (
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
