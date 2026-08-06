import { describe, it, expect } from "vitest";
import { FranchiseCollector } from "./franchise-collector";
import { InMemoryAnimeRepository } from "@/test/fakes/in-memory-anime-repository";
import { AnimeWork, SourceWork } from "../models/franchise-work";
import { AnimeFormat, AnimeStatus } from "../models/anime";
import { PartialDate } from "../models/partial-date";
import { RateLimitedError } from "../errors/repository-errors";

function anime(
  id: number,
  title: string,
  startDate: PartialDate,
  format: AnimeFormat | null = "TV",
  status: AnimeStatus = "FINISHED",
): AnimeWork {
  return {
    kind: "ANIME",
    id,
    title: { userPreferred: title, english: null, romaji: null, native: null },
    coverImage: "",
    format,
    startDate,
    endDate: null,
    episodes: 12,
    score: 80,
    status,
    nextAiringEpisode: null,
  };
}

function source(id: number, title: string): SourceWork {
  return {
    kind: "SOURCE",
    id,
    title: { userPreferred: title, english: null, romaji: null, native: null },
    format: "MANGA",
    status: "RELEASING",
    chapters: null,
    volumes: null,
  };
}

const date = (year: number, month = 1, day = 1): PartialDate => ({
  year,
  month,
  day,
});

describe("FranchiseCollector", () => {
  it("collects a linear chain in release order", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "Season 1", date(2013)))
      .addWork(anime(2, "Season 2", date(2017)))
      .addWork(anime(3, "Season 3", date(2018)))
      .addEdge(1, "SEQUEL", 2)
      .addEdge(2, "SEQUEL", 3);

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.timeline.map((work) => work.id)).toEqual([1, 2, 3]);
    expect(franchise.isComplete).toBe(true);
  });

  it("orders same-year entries by full date", async () => {
    // Regression: year-only sorting put Kizumonogatari II before I.
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "Kizumonogatari II", date(2016, 8, 19)))
      .addWork(anime(2, "Kizumonogatari I", date(2016, 1, 8)))
      .addEdge(1, "PREQUEL", 2);

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.timeline.map((work) => work.title.userPreferred)).toEqual([
      "Kizumonogatari I",
      "Kizumonogatari II",
    ]);
  });

  it("keeps a prequel that aired later in release order", async () => {
    // Fate/Zero (2011) is a PREQUEL to Fate/stay night (2006).
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(10087, "Fate/Zero", date(2011, 10, 2)))
      .addWork(anime(356, "Fate/stay night", date(2006, 1, 7)))
      .addEdge(10087, "PREQUEL", 356);

    const franchise = await new FranchiseCollector(repo).collect(10087);

    expect(franchise.timeline[0]?.id).toBe(356);
    expect(franchise.rootId).toBe(10087);
  });

  it("keeps the selected work as rootId even when it is not first", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "Season 1", date(2020)))
      .addWork(anime(2, "Season 2", date(2023)))
      .addEdge(2, "PREQUEL", 1);

    const franchise = await new FranchiseCollector(repo).collect(2);

    expect(franchise.rootId).toBe(2);
    expect(franchise.timeline[0]?.id).toBe(1);
  });

  it("traverses only PREQUEL and SEQUEL but records every edge", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "Series", date(2013)))
      .addWork(anime(2, "Sequel", date(2015)))
      .addWork(anime(3, "Movie", date(2014), "MOVIE"))
      .addEdge(1, "SEQUEL", 2)
      .addEdge(1, "SIDE_STORY", 3);

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.timeline.map((work) => work.id)).toEqual([1, 2]);
    expect(
      franchise.edges.some((edge) => edge.relationType === "SIDE_STORY"),
    ).toBe(true);
  });

  it("hydrates related works outside the timeline", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "Series", date(2013)))
      .addWork(anime(3, "Movie", date(2014), "MOVIE"))
      .addEdge(1, "SIDE_STORY", 3);

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.related.map((work) => work.id)).toEqual([3]);
  });

  it("hydrates source works without traversing them", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "Series", date(2013)))
      .addWork(source(99, "Series manga"))
      .addEdge(1, "ADAPTATION", 99);

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.sources.map((work) => work.id)).toEqual([99]);
    expect(franchise.summary.sourceStatus).toBe("ONGOING");
  });

  it("survives a cycle", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "A", date(2010)))
      .addWork(anime(2, "B", date(2011)))
      .addEdge(1, "SEQUEL", 2)
      .addEdge(2, "PREQUEL", 1);

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.timeline.map((work) => work.id)).toEqual([1, 2]);
  });

  it("skips an id that does not exist and keeps traversing", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "A", date(2010)))
      .addWork(anime(3, "C", date(2012)))
      .addEdge(1, "SEQUEL", 9183)
      .addEdge(1, "SEQUEL", 3);

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.timeline.map((work) => work.id)).toEqual([1, 3]);
    expect(franchise.isComplete).toBe(true);
  });

  it("stops and reports partial results when rate limited", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "A", date(2010)))
      .addWork(anime(2, "B", date(2011)))
      .addEdge(1, "SEQUEL", 2)
      .failOn(2, new RateLimitedError(60));

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.isComplete).toBe(false);
    expect(franchise.unresolvedIds).toContain(2);
    expect(franchise.timeline.map((work) => work.id)).toEqual([1]);
  });

  it("batches a frontier into a single request", async () => {
    const repository = new InMemoryAnimeRepository()
      .addWork(anime(1, "A", date(2010)))
      .addWork(anime(2, "B", date(2011)))
      .addWork(anime(3, "C", date(2012)))
      .addEdge(1, "SEQUEL", 2)
      .addEdge(1, "SEQUEL", 3);

    await new FranchiseCollector(repository).collect(1);

    // root batch + one frontier batch containing both 2 and 3.
    expect(repository.requestCount).toBeLessThanOrEqual(2);
  });

  it("respects maxDepth", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "A", date(2010)))
      .addWork(anime(2, "B", date(2011)))
      .addWork(anime(3, "C", date(2012)))
      .addEdge(1, "SEQUEL", 2)
      .addEdge(2, "SEQUEL", 3);

    const franchise = await new FranchiseCollector(repo).collect(1, {
      maxDepth: 1,
    });

    expect(franchise.timeline.map((work) => work.id)).toEqual([1, 2]);
    expect(franchise.isComplete).toBe(false);
    expect(franchise.unresolvedIds).toContain(3);
  });

  it("excludes OVA and ONA from the timeline by default", async () => {
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "Series", date(2013)))
      .addWork(anime(2, "Prequel ONA", date(2012), "ONA"))
      .addEdge(1, "PREQUEL", 2);

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.timeline.map((work) => work.id)).toEqual([1]);
    expect(franchise.nodes.has(2)).toBe(true);
  });

  it("returns an empty franchise when the root does not exist", async () => {
    const franchise = await new FranchiseCollector(
      new InMemoryAnimeRepository(),
    ).collect(9183);

    expect(franchise.timeline).toEqual([]);
    expect(franchise.summary.totalEpisodes).toBe(0);
  });
});
