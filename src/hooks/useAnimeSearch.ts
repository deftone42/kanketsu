"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AnimeSearchResult,
  AnimeRepository,
} from "@/core/ports/anime-repository";
import { AniListGraphQLRepository } from "@/infraestructure/adapters/anilist-graphql-repository";
import { Anime } from "@/core/domain/models/anime";
import { TimingScore } from "@/core/domain/models/score";
import { evaluateAnimeScore } from "@/core/domain/services/evaluate-score";

// Inyección de dependencias (por defecto la API de AniList)
const repository: AnimeRepository = new AniListGraphQLRepository();

export function useAnimeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnimeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [score, setScore] = useState<TimingScore | null>(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);

  // Debounce para la búsqueda
  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const timer = setTimeout(async () => {
      const searchResults = await repository.searchAnime(query);
      setResults(searchResults);
      setIsSearching(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Selección de un anime
  const selectAnime = useCallback(async (id: number) => {
    setResults([]);
    setIsFetchingDetail(true);

    const animeDetail = await repository.getAnimeById(id);

    if (animeDetail) {
      setSelectedAnime(animeDetail);
      setScore(evaluateAnimeScore(animeDetail));
    }

    setIsFetchingDetail(false);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedAnime(null);
    setScore(null);
    setQuery("");
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
