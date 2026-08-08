"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AnimeSearchResult,
  AnimeRepository,
} from "@/core/ports/anime-repository";
import { AniListGraphQLRepository } from "@/infrastructure/adapters/anilist/anilist-graphql-repository";
import { Franchise } from "@/core/domain/models/franchise";
import { TimingScore } from "@/core/domain/models/score";
import { evaluateWatchingScore } from "@/core/domain/services/evaluate-score";
import { FranchiseCollector } from "@/core/domain/services/franchise-collector";
import { monthsSinceLastRelease } from "@/core/domain/services/time-since-last-release";

const repository: AnimeRepository = new AniListGraphQLRepository();
const collector = new FranchiseCollector(repository);

export function useAnimeSearch() {
  const [query, setQuery] = useState("");
  const [rawResults, setRawResults] = useState<AnimeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [score, setScore] = useState<TimingScore | null>(null);
  const [viewedId, setViewedId] = useState<number | null>(null);
  const [monthsSinceLastEntry, setMonthsSinceLastEntry] = useState<
    number | null
  >(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);

  const results = useMemo(() => {
    return query.trim().length >= 3 ? rawResults : [];
  }, [query, rawResults]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 3) {
      return;
    }

    let isCancelled = false;

    const timer = setTimeout(async () => {
      if (isCancelled) return;

      setIsSearching(true);

      try {
        const searchResults = await repository.searchAnime(trimmedQuery);
        if (!isCancelled) {
          setRawResults(searchResults);
        }
      } catch (error) {
        console.error("Error al buscar anime:", error);
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const selectAnime = useCallback(async (id: number) => {
    setRawResults([]);
    setIsFetchingDetail(true);

    try {
      const collected = await collector.collect(id);
      const now = new Date();

      setFranchise(collected);
      setViewedId(collected.rootId);
      setScore(evaluateWatchingScore(collected.summary, now));
      setMonthsSinceLastEntry(monthsSinceLastRelease(collected.summary, now));
    } catch (error) {
      console.error("Could not collect the franchise:", error);
      setFranchise(null);
      setScore(null);
      setViewedId(null);
      setMonthsSinceLastEntry(null);
    } finally {
      setIsFetchingDetail(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setFranchise(null);
    setScore(null);
    setViewedId(null);
    setMonthsSinceLastEntry(null);
    setQuery("");
    setRawResults([]);
  }, []);

  const viewEntry = useCallback((id: number) => {
    setViewedId(id);
  }, []);

  return {
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
  };
}
