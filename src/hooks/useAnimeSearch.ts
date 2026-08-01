"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AnimeSearchResult,
  AnimeRepository,
} from "@/core/ports/anime-repository";
import { AniListGraphQLRepository } from "@/infrastructure/adapters/anilist/anilist-graphql-repository";
import { Anime } from "@/core/domain/models/anime";
import { TimingScore } from "@/core/domain/models/score";
import { evaluateWatchingScore } from "@/core/domain/services/evaluate-score";

const repository: AnimeRepository = new AniListGraphQLRepository();

export function useAnimeSearch() {
  const [query, setQuery] = useState("");
  const [rawResults, setRawResults] = useState<AnimeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [score, setScore] = useState<TimingScore | null>(null);
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
      const animeDetail = await repository.getAnimeById(id);
      if (animeDetail) {
        setSelectedAnime(animeDetail);
        setScore(evaluateWatchingScore(animeDetail));
      }
    } catch (error) {
      console.error("Error al obtener detalle del anime:", error);
    } finally {
      setIsFetchingDetail(false);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedAnime(null);
    setScore(null);
    setQuery("");
    setRawResults([]);
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    selectedAnime,
    score,
    isFetchingDetail,
    selectAnime,
    clearSelection,
  };
}
