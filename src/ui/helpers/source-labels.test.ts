import { describe, it, expect } from "vitest";
import { FranchiseSummary } from "@/core/domain/models/franchise";
import { SourceWork } from "@/core/domain/models/franchise-work";
import {
  soleSourceOf,
  sourceSizeLabels,
  sourceStatusLabel,
} from "./source-labels";

const source = (overrides: Partial<SourceWork> = {}): SourceWork =>
  ({
    format: "MANGA",
    chapters: null,
    volumes: null,
    ...overrides,
  }) as SourceWork;

const summary = (overrides: Partial<FranchiseSummary>): FranchiseSummary =>
  ({
    sourceStatus: "UNKNOWN",
    sourceFormat: null,
    ...overrides,
  }) as FranchiseSummary;

describe("soleSourceOf", () => {
  it("returns the source when the franchise adapts exactly one work", () => {
    const only = source();

    expect(soleSourceOf([only])).toBe(only);
  });

  it("refuses to pick one when several works are adapted", () => {
    expect(soleSourceOf([source(), source()])).toBeNull();
  });

  it("has no source to offer when none was found", () => {
    expect(soleSourceOf([])).toBeNull();
  });
});

describe("sourceSizeLabels", () => {
  it("lists chapters and volumes when both are known", () => {
    expect(sourceSizeLabels(source({ chapters: 139, volumes: 34 }))).toEqual([
      "139 chapters",
      "34 volumes",
    ]);
  });

  it("keeps a single chapter and volume singular", () => {
    expect(sourceSizeLabels(source({ chapters: 1, volumes: 1 }))).toEqual([
      "1 chapter",
      "1 volume",
    ]);
  });

  it("says nothing about a size it does not know", () => {
    expect(sourceSizeLabels(source())).toEqual([]);
  });
});

describe("sourceStatusLabel", () => {
  it("names the format rather than calling everything a source", () => {
    expect(
      sourceStatusLabel(
        summary({ sourceStatus: "FINISHED", sourceFormat: "MANGA" }),
      ),
    ).toBe("Manga finished");
  });

  it("reports a source still being written as ongoing", () => {
    expect(
      sourceStatusLabel(
        summary({ sourceStatus: "ONGOING", sourceFormat: "NOVEL" }),
      ),
    ).toBe("Novel ongoing");
  });

  it("stays silent when the source status is unknown", () => {
    expect(
      sourceStatusLabel(
        summary({ sourceStatus: "UNKNOWN", sourceFormat: "MANGA" }),
      ),
    ).toBeNull();
  });

  it("stays silent for an original anime with no source at all", () => {
    expect(
      sourceStatusLabel(
        summary({ sourceStatus: "FINISHED", sourceFormat: null }),
      ),
    ).toBeNull();
  });
});
