import { AnimeFormat } from "@/core/domain/models/anime";
import { AnimeWork } from "@/core/domain/models/franchise-work";
import { Disc, Film, MonitorPlay, Sparkles } from "lucide-react";

interface CountedRelatedFormat {
  format: AnimeFormat;
  singular: string;
  plural: string;
  Icon: typeof Film;
}

const COUNTED_RELATED_FORMATS: CountedRelatedFormat[] = [
  { format: "MOVIE", singular: "movie", plural: "movies", Icon: Film },
  { format: "OVA", singular: "OVA", plural: "OVAs", Icon: Disc },
  {
    format: "SPECIAL",
    singular: "special",
    plural: "specials",
    Icon: Sparkles,
  },
  { format: "ONA", singular: "ONA", plural: "ONAs", Icon: MonitorPlay },
];

export interface RelatedFormatCount {
  format: AnimeFormat;
  label: string;
  Icon: typeof Film;
}

export function relatedFormatCounts(
  related: AnimeWork[],
): RelatedFormatCount[] {
  return COUNTED_RELATED_FORMATS.flatMap(
    ({ format, singular, plural, Icon }) => {
      const count = related.filter((work) => work.format === format).length;
      if (count === 0) return [];

      return [
        {
          format,
          label: count === 1 ? `1 ${singular}` : `${count} ${plural}`,
          Icon,
        },
      ];
    },
  );
}
