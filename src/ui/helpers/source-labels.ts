import { FranchiseSummary } from "@/core/domain/models/franchise";
import { SourceFormat, SourceWork } from "@/core/domain/models/franchise-work";

const SOURCE_FORMAT_NAMES: Record<SourceFormat, string> = {
  MANGA: "Manga",
  NOVEL: "Novel",
  ONE_SHOT: "One-shot",
};

export function sourceFormatName(format: SourceFormat): string {
  return SOURCE_FORMAT_NAMES[format];
}

export function soleSourceOf(sources: SourceWork[]): SourceWork | null {
  return sources.length === 1 ? sources[0] : null;
}

export function sourceSizeLabels(source: SourceWork): string[] {
  const labels: string[] = [];

  if (source.chapters !== null) {
    labels.push(
      source.chapters === 1 ? "1 chapter" : `${source.chapters} chapters`,
    );
  }
  if (source.volumes !== null) {
    labels.push(
      source.volumes === 1 ? "1 volume" : `${source.volumes} volumes`,
    );
  }

  return labels;
}

export function sourceStatusLabel(summary: FranchiseSummary): string | null {
  if (summary.sourceStatus === "UNKNOWN" || summary.sourceFormat === null) {
    return null;
  }

  const name = sourceFormatName(summary.sourceFormat);
  return summary.sourceStatus === "FINISHED"
    ? `${name} finished`
    : `${name} ongoing`;
}
