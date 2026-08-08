import { describe, it, expect } from "vitest";
import { FranchiseCollector } from "./franchise-collector";
import { InMemoryAnimeRepository } from "@/test/fakes/in-memory-anime-repository";
import {
  AnimeWork,
  SourceFormat,
  SourceStatus,
  SourceWork,
} from "../models/franchise-work";
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
    description: null,
    nextAiringEpisode: null,
  };
}

function source(
  id: number,
  title: string,
  format: SourceFormat = "MANGA",
  status: SourceStatus = "RELEASING",
): SourceWork {
  return {
    kind: "SOURCE",
    id,
    title: { userPreferred: title, english: null, romaji: null, native: null },
    format,
    status,
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

  it("does not follow a crossover into somebody else's franchise", async () => {
    // Observed against the live API: One Piece links by CHARACTER to a Nissin
    // commercial, which links by CHARACTER to Sazae-san. Sazae-san airs weekly,
    // so it won the "soonest upcoming episode" pick and the card announced
    // episode 2844 of a franchise that has no such episode.
    //
    // The first hop used to be allowed, and admitted the commercial itself.
    // A shared character is a cameo, not membership, so neither hop is taken.
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(21, "One Piece", date(1999), "TV", "ONGOING"))
      .addWork(anime(101099, "HUNGRY DAYS", date(2019), "SPECIAL"))
      .addWork(anime(2406, "Sazae-san", date(1969), "TV", "ONGOING"))
      .addEdge(21, "CHARACTER", 101099)
      .addEdge(101099, "CHARACTER", 2406);

    const franchise = await new FranchiseCollector(repo).collect(21);

    expect(franchise.nodes.has(101099)).toBe(false);
    expect(franchise.nodes.has(2406)).toBe(false);
    expect(franchise.related).toEqual([]);
    // The edge is still recorded: it is true topology, just not membership.
    expect(
      franchise.edges.some((edge) => edge.relationType === "CHARACTER"),
    ).toBe(true);
  });

  it("does not adopt a sibling series that only shares characters", async () => {
    // Baccano! and Durarara!! are separate series by one author, linked on
    // AniList by CHARACTER alone. Adopting Durarara!! pushed Baccano!'s
    // endYear from 2008 to 2010, and the card claimed a franchise that ended
    // in 2008 ran until 2010.
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(2251, "Baccano!", date(2007, 7, 27)))
      .addWork(
        anime(3901, "Baccano! Bangai-hen", date(2008, 2, 27), "SPECIAL"),
      )
      .addWork(anime(6746, "Durarara!!", date(2010, 1, 8)))
      .addEdge(2251, "SIDE_STORY", 3901)
      .addEdge(2251, "CHARACTER", 6746);

    const franchise = await new FranchiseCollector(repo).collect(2251);

    expect(franchise.nodes.has(6746)).toBe(false);
    expect(franchise.related.map((work) => work.id)).toEqual([3901]);
  });

  it("does not adopt source works reachable only through a crossover", async () => {
    // Same leak, other symptom: Steins;Gate pulled in Saya no Uta and reported
    // the franchise's source as still publishing.
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(9253, "Steins;Gate", date(2011)))
      .addWork(anime(10519, "Steins;Gate OVA", date(2011), "OVA"))
      .addWork(source(47517, "Steins;Gate manga"))
      .addWork(source(145924, "Saya no Uta"))
      .addEdge(9253, "SIDE_STORY", 10519)
      .addEdge(9253, "ADAPTATION", 47517)
      .addEdge(10519, "CHARACTER", 145924);

    const franchise = await new FranchiseCollector(repo).collect(9253);

    expect(franchise.sources.map((work) => work.id)).toEqual([47517]);
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

  it("ignores manga drawn from the source when picking the source material", async () => {
    // Durarara!! adapts a light novel that finished in 2014, but AniList also
    // hangs three manga *drawn from that same novel* off the anime, as
    // ALTERNATIVE, and one of them is still running. Counting them as sources
    // outvoted the single novel and the card read "Manga ongoing".
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(6746, "Durarara!!", date(2010, 1, 8)))
      .addWork(source(46816, "Durarara!! novel", "NOVEL", "FINISHED"))
      .addWork(source(44841, "Durarara!! manga", "MANGA", "FINISHED"))
      .addWork(source(64335, "Durarara!!: Saika-hen", "MANGA", "FINISHED"))
      .addWork(source(93748, "Durarara!!: RE;Dollars-hen", "MANGA", "RELEASING"))
      .addEdge(6746, "ADAPTATION", 46816)
      .addEdge(6746, "ALTERNATIVE", 44841)
      .addEdge(6746, "ALTERNATIVE", 64335)
      .addEdge(6746, "ALTERNATIVE", 93748);

    const franchise = await new FranchiseCollector(repo).collect(6746);

    expect(franchise.sources.map((work) => work.id)).toEqual([46816]);
    expect(franchise.summary.sourceFormat).toBe("NOVEL");
    expect(franchise.summary.sourceStatus).toBe("FINISHED");
  });

  it("excludes a sequel chain that is disconnected from the root", async () => {
    // Attack on Titan's chibi shorts form their own PREQUEL/SEQUEL chain,
    // reachable from nothing. They must not merge into the main timeline
    // just because their internal edges are of a followed type.
    const repo = new InMemoryAnimeRepository()
      .addWork(anime(1, "Season 1", date(2013)))
      .addWork(anime(2, "Season 2", date(2017)))
      .addWork(anime(50, "Chibi Theater", date(2018), "SPECIAL"))
      .addWork(anime(51, "Chibi Theater Part 2", date(2019), "SPECIAL"))
      .addEdge(1, "SEQUEL", 2)
      .addEdge(1, "SPIN_OFF", 50)
      .addEdge(50, "SEQUEL", 51);

    const franchise = await new FranchiseCollector(repo).collect(1);

    expect(franchise.timeline.map((work) => work.id)).toEqual([1, 2]);
    expect(franchise.related.map((work) => work.id)).toContain(50);
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
