"use client";

import { useAnimeSearch } from "@/hooks/useAnimeSearch";
import { SearchBar } from "@/components/SearchBar";
import { SeasonCard } from "@/components/SeasonCard";
import { FranchiseCard } from "@/components/FranchiseCard";
import { ScoreCard } from "@/components/ScoreCard";
import { FranchiseTimeline } from "@/components/FranchiseTimeline";
import { ScoringGuide } from "@/components/ScoringGuide";
import { isAnimeWork } from "@/core/domain/models/franchise-work";
import { franchiseGenres } from "@/core/domain/services/franchise-genres";
import { Clock, Loader2 } from "lucide-react";
import { Analytics } from "@vercel/analytics/next";

export default function Home() {
  const {
    query,
    setQuery,
    results,
    isSearching,
    franchise,
    score,
    viewedId,
    monthsSinceLastEntry,
    isFetchingDetail,
    selectAnime,
    clearSelection,
    viewEntry,
  } = useAnimeSearch();

  const viewedWork =
    viewedId === null ? undefined : franchise?.nodes.get(viewedId);
  const viewedSeason =
    viewedWork && isAnimeWork(viewedWork) ? viewedWork : null;

  const franchiseName = franchise?.timeline[0]?.title.userPreferred ?? "";

  return (
    <main className="bg-gray-950 text-gray-100">
      <Analytics />

      <section className="relative overflow-hidden flex items-center min-h-[90vh] px-6 sm:px-12 py-16">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto w-full space-y-10 relative z-10">
          <header className="text-center space-y-4">
            <h1 className="space-y-3">
              <span className="text-4xl sm:text-6xl font-black tracking-tight text-white flex items-center justify-center gap-3">
                <Clock className="w-10 h-10 sm:w-14 sm:h-14 text-indigo-500" />
                Ani<span className="text-indigo-500">Time</span>
              </span>
              <span className="block text-lg sm:text-2xl font-bold tracking-tight text-gray-200">
                Is now a good time to start that anime?
              </span>
            </h1>

            <p className="text-gray-400 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
              Search any series and find out whether the story is finished,
              still airing, or quietly abandoned — before you commit to it.
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
            <div
              role="status"
              className="flex flex-col items-center justify-center py-12 space-y-3"
            >
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-gray-400 font-medium animate-pulse">
                Analyzing seasons, sequels, and release status...
              </p>
            </div>
          )}

          {!isFetchingDetail &&
            franchise &&
            franchise.timeline.length === 0 && (
              <div
                role="alert"
                className="text-center py-8 space-y-2 text-rose-300/90"
              >
                <p className="text-sm font-semibold">
                  Could not load this series.
                </p>
                <p className="text-xs text-gray-400">
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
                  {viewedSeason && <SeasonCard season={viewedSeason} />}

                  <FranchiseCard
                    name={franchiseName}
                    summary={franchise.summary}
                    genres={franchiseGenres(franchise.timeline)}
                    seasonCount={franchise.timeline.length}
                    related={franchise.related}
                    sources={franchise.sources}
                    monthsSinceLastRelease={monthsSinceLastEntry}
                  />
                </div>

                <ScoreCard score={score} />

                <FranchiseTimeline
                  timeline={franchise.timeline}
                  selectedId={viewedId ?? franchise.rootId}
                  onSelectEntry={viewEntry}
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
            <div className="text-center py-8 text-gray-400 text-xs uppercase tracking-wider font-semibold">
              Search for any title above to calculate the watch timing
            </div>
          )}
        </div>
      </section>

      <ScoringGuide />

      <footer className="border-t border-white/5 text-center text-xs text-gray-400 py-8 px-6">
        Kanketsu &copy; {new Date().getFullYear()} &bull; Built with Next.js &
        AniList GraphQL API
      </footer>
    </main>
  );
}
