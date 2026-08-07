import { describe, it, expect } from "vitest";
import { FranchiseSummary } from "../models/franchise";
import { NextEpisode } from "../models/franchise-work";
import { evaluateWatchingScore } from "./evaluate-score";

const NOW = new Date("2026-08-07T00:00:00Z");
const DAY_SECONDS = 86_400;

function summary(overrides: Partial<FranchiseSummary> = {}): FranchiseSummary {
  return {
    startYear: 2013,
    endYear: 2023,
    totalEpisodes: 87,
    averageScore: 80,
    status: "FINISHED",
    nextAiringEpisode: null,
    sourceStatus: "UNKNOWN",
    sourceFormat: null,
    ...overrides,
  };
}

function airingIn(days: number): NextEpisode {
  return {
    episode: 1,
    timeUntilAiringSeconds: days * DAY_SECONDS,
    seasonTitle: "Season 2",
  };
}

const score = (overrides: Partial<FranchiseSummary> = {}) =>
  evaluateWatchingScore(summary(overrides), NOW);

describe("evaluateWatchingScore", () => {
  describe("the score table", () => {
    it("gives a closed story with a finished source the only perfect 100", () => {
      const result = score({ status: "FINISHED", sourceStatus: "FINISHED" });

      expect(result.score).toBe(100);
      expect(result.level).toBe("PERFECT_TIME");
    });

    it("scores a closed story whose source is still running at 95", () => {
      const result = score({
        status: "FINISHED",
        sourceStatus: "ONGOING",
        sourceFormat: "MANGA",
        endYear: 2024,
      });

      expect(result.score).toBe(95);
      expect(result.level).toBe("PERFECT_TIME");
    });

    it("scores a sequel inside the hype window at 85", () => {
      const result = score({
        status: "NEW_SEASON_COMING",
        nextAiringEpisode: airingIn(12),
      });

      expect(result.score).toBe(85);
      expect(result.level).toBe("GOOD_TIME");
    });

    it("scores a still-airing mega-series at 80", () => {
      const result = score({ status: "ONGOING", totalEpisodes: 1100 });

      expect(result.score).toBe(80);
      expect(result.level).toBe("GOOD_TIME");
    });

    it("scores a distant sequel at 70", () => {
      const result = score({
        status: "NEW_SEASON_COMING",
        nextAiringEpisode: airingIn(200),
      });

      expect(result.score).toBe(70);
      expect(result.level).toBe("RISK_INCOMPLETE");
    });

    it("scores a normal series airing weekly at 50", () => {
      const result = score({ status: "ONGOING", totalEpisodes: 8 });

      expect(result.score).toBe(50);
      expect(result.level).toBe("IF_CANT_WAIT");
    });

    it("scores a stalled adaptation at 30", () => {
      const result = score({
        status: "FINISHED",
        sourceStatus: "ONGOING",
        sourceFormat: "MANGA",
        endYear: 2015,
      });

      expect(result.score).toBe(30);
      expect(result.level).toBe("NOT_GOOD_TIME");
    });

    it("scores an official hiatus at 20", () => {
      const result = score({ status: "HIATUS" });

      expect(result.score).toBe(20);
      expect(result.level).toBe("NOT_GOOD_TIME");
    });

    it("scores a franchise that has not premiered at 15", () => {
      const result = score({ status: "NOT_RELEASED" });

      expect(result.score).toBe(15);
      expect(result.level).toBe("NOT_GOOD_TIME");
    });

    it("scores a cancelled franchise at 5", () => {
      const result = score({ status: "CANCELLED" });

      expect(result.score).toBe(5);
      expect(result.level).toBe("NOT_RECOMMENDED");
    });
  });

  describe("modifiers", () => {
    it("takes five points off and says so when the source is unfinished", () => {
      const result = score({
        status: "FINISHED",
        sourceStatus: "ONGOING",
        sourceFormat: "MANGA",
        endYear: 2024,
      });

      expect(result.score).toBe(95);
      expect(result.notes).toEqual(["The manga is still being published."]);
    });

    it("names the source format rather than saying 'source'", () => {
      const result = score({
        status: "FINISHED",
        sourceStatus: "ONGOING",
        sourceFormat: "NOVEL",
        endYear: 2024,
      });

      expect(result.notes).toEqual(["The novel is still being published."]);
    });

    it("falls back to generic wording when the format is unknown", () => {
      const result = score({
        status: "FINISHED",
        sourceStatus: "ONGOING",
        sourceFormat: null,
        endYear: 2024,
      });

      expect(result.notes).toEqual([
        "The source material is still being published.",
      ]);
    });

    it("leaves an original series untouched, having no source to finish", () => {
      const result = score({ status: "FINISHED", sourceStatus: "UNKNOWN" });

      expect(result.score).toBe(100);
      expect(result.notes).toEqual([]);
    });

    it("adds fifteen points and counts down when a season is imminent", () => {
      const result = score({
        status: "NEW_SEASON_COMING",
        nextAiringEpisode: airingIn(12),
      });

      expect(result.score).toBe(85);
      expect(result.notes).toEqual(["Season 2 premieres in 12 days."]);
    });

    it("does not count a stalled adaptation's living source twice", () => {
      const result = score({
        status: "FINISHED",
        sourceStatus: "ONGOING",
        sourceFormat: "MANGA",
        endYear: 2015,
      });

      expect(result.score).toBe(30);
      expect(result.notes).toEqual([]);
    });

    it("stacks both modifiers on an imminent sequel with a living source", () => {
      const result = score({
        status: "NEW_SEASON_COMING",
        nextAiringEpisode: airingIn(12),
        sourceStatus: "ONGOING",
        sourceFormat: "MANGA",
      });

      expect(result.score).toBe(80);
      expect(result.notes).toEqual([
        "Season 2 premieres in 12 days.",
        "The manga is still being published.",
      ]);
    });
  });

  describe("boundaries", () => {
    it("counts a season exactly 60 days out as imminent", () => {
      expect(
        score({
          status: "NEW_SEASON_COMING",
          nextAiringEpisode: airingIn(60),
        }).score,
      ).toBe(85);
    });

    it("counts a season 61 days out as distant", () => {
      expect(
        score({
          status: "NEW_SEASON_COMING",
          nextAiringEpisode: airingIn(61),
        }).score,
      ).toBe(70);
    });

    it("treats an announced sequel with no date as distant", () => {
      const result = score({
        status: "NEW_SEASON_COMING",
        nextAiringEpisode: null,
      });

      expect(result.score).toBe(70);
      expect(result.notes).toEqual([]);
    });

    it("keeps every score within 0 and 100", () => {
      const result = score({
        status: "CANCELLED",
        sourceStatus: "ONGOING",
        sourceFormat: "MANGA",
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe("the verdict copy", () => {
    it("no longer calls a stalled adaptation a completed story", () => {
      const result = score({
        status: "FINISHED",
        sourceStatus: "ONGOING",
        sourceFormat: "MANGA",
        endYear: 2015,
      });

      expect(result.badgeText).not.toBe("Completed Story");
      expect(result.badgeText).toBe("Stalled Adaptation");
    });

    it("ignores the AniList rating entirely, judging the moment not the show", () => {
      const acclaimed = score({ status: "FINISHED", averageScore: 95 });
      const panned = score({ status: "FINISHED", averageScore: 30 });

      expect(acclaimed.score).toBe(panned.score);
    });
  });
});
