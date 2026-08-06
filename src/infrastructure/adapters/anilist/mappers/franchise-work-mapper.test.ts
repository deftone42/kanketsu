import { describe, it, expect } from "vitest";
import { mapBatchResponse } from "./franchise-work-mapper";
import { isAnimeWork } from "@/core/domain/models/franchise-work";
import { AniListBatchResponse } from "../dto/anilist-response.dto";

import onePiece from "@/test/fixtures/anilist/one-piece.json";
import monogatari from "@/test/fixtures/anilist/monogatari.json";
import steinsGate from "@/test/fixtures/anilist/steins-gate.json";
import missingWork from "@/test/fixtures/anilist/missing-work.json";
import jujutsuKaisen from "@/test/fixtures/anilist/jujutsu-kaisen.json";

const asResponse = (fixture: { response: unknown }): AniListBatchResponse =>
  fixture.response as AniListBatchResponse;

describe("mapBatchResponse", () => {
  it("hydrates top-level media as works", () => {
    const batch = mapBatchResponse(asResponse(onePiece));
    const work = batch.works.find((candidate) => candidate.id === 21);

    expect(work).toBeDefined();
    expect(work && isAnimeWork(work)).toBe(true);
    expect(work?.title.userPreferred).toBe("ONE PIECE");
  });

  it("preserves a null episode count on an airing series", () => {
    // One Piece reports episodes: null while ongoing. The summary's
    // nextAiringEpisode fallback depends on this surviving the mapping.
    const batch = mapBatchResponse(asResponse(onePiece));
    const work = batch.works.find((candidate) => candidate.id === 21);

    expect(work && isAnimeWork(work) && work.episodes).toBeNull();
    expect(work && isAnimeWork(work) && work.nextAiringEpisode).not.toBeNull();
  });

  it("maps full start dates so same-year entries can be ordered", () => {
    const batch = mapBatchResponse(asResponse(monogatari));
    const kizuOne = batch.works.find((candidate) => candidate.id === 9260);

    expect(kizuOne && isAnimeWork(kizuOne) && kizuOne.startDate.month).not.toBeNull();
    expect(kizuOne && isAnimeWork(kizuOne) && kizuOne.startDate.day).not.toBeNull();
  });

  it("discriminates source works from anime works", () => {
    const batch = mapBatchResponse(asResponse(jujutsuKaisen));
    const stubs = batch.stubs.filter((stub) => stub.kind === "SOURCE");

    expect(stubs.some((stub) => stub.id === 101517)).toBe(true);
  });

  it("records nested relations as edges without hydrating them as works", () => {
    const batch = mapBatchResponse(asResponse(steinsGate));
    const hydratedIds = batch.works.map((work) => work.id);
    const edgeTargets = new Set(batch.edges.map((edge) => edge.targetId));

    // Only the requested id becomes a work; everything the nested projection
    // reveals stays topology. Edges may point back at a hydrated node — a
    // sequel's PREQUEL edge returns to its root — so reachability, not
    // absence, is what distinguishes topology from content here.
    expect(hydratedIds).toEqual([9253]);
    expect(edgeTargets.size).toBeGreaterThan(1);
    expect(batch.stubs.some((stub) => stub.id === 9253)).toBe(false);
    expect(batch.stubs.length).toBeGreaterThan(0);
  });

  it("returns an empty batch for a dead id rather than throwing", () => {
    const batch = mapBatchResponse(asResponse(missingWork));

    expect(batch.works).toEqual([]);
    expect(batch.edges).toEqual([]);
  });

  it("never emits duplicate edges", () => {
    const batch = mapBatchResponse(asResponse(monogatari));
    const keys = batch.edges.map(
      (edge) => `${edge.sourceId}:${edge.relationType}:${edge.targetId}`,
    );

    expect(new Set(keys).size).toBe(keys.length);
  });
});
