"use client";

import Image from "next/image";
import { AnimeWork } from "@/core/domain/models/franchise-work";

interface FranchiseTimelineProps {
  /** The franchise chain, already in release order. */
  timeline: AnimeWork[];
  /** The entry the user selected — highlighted in place. */
  selectedId: number;
}

/** Without this a card reads as three fragments: "1", "Jujutsu Kaisen", "2020". */
function entryLabel(work: AnimeWork, position: number): string {
  const releasedOn =
    work.startDate.year === null
      ? "release date to be announced"
      : String(work.startDate.year);

  return `${position}. ${work.title.userPreferred}, ${releasedOn}`;
}

/**
 * The franchise as a horizontal strip in release order, with the entry the
 * user picked marked in place.
 *
 * Entries keep their release position: moving the selection to the front
 * would destroy the ordering this component exists to show. It also never
 * sorts — `buildTimeline` already guarantees the order, and re-sorting here
 * would duplicate that logic in the wrong layer.
 */
export function FranchiseTimeline({
  timeline,
  selectedId,
}: FranchiseTimelineProps) {
  // A strip of one is noise. One Piece and Death Note land here: both are
  // single continuous series whose franchise lives in `related` instead.
  if (timeline.length < 2) return null;

  return (
    <section aria-label="Franchise timeline" className="space-y-3">
      <h3 className="text-xs uppercase tracking-wider font-bold text-gray-400">
        Watch order
      </h3>

      <ol className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory">
        {timeline.map((work, index) => {
          const isSelected = work.id === selectedId;

          return (
            <li
              key={work.id}
              aria-label={entryLabel(work, index + 1)}
              aria-current={isSelected ? "true" : undefined}
              className={`flex-shrink-0 w-32 snap-start rounded-2xl border p-2 space-y-2 transition-colors ${
                isSelected
                  ? "bg-indigo-500/10 border-indigo-500/50"
                  : "bg-gray-900 border-gray-800"
              }`}
            >
              <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-800">
                {work.coverImage && (
                  <Image
                    src={work.coverImage}
                    alt={work.title.userPreferred}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                )}
                <span
                  aria-hidden="true"
                  className="absolute top-1 left-1 bg-gray-950/80 text-gray-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                >
                  {index + 1}
                </span>
              </div>

              <p
                className={`text-xs font-semibold leading-tight line-clamp-2 ${
                  isSelected ? "text-indigo-300" : "text-gray-300"
                }`}
                title={work.title.userPreferred}
              >
                {work.title.userPreferred}
              </p>

              <p className="text-[10px] text-gray-500 font-medium">
                {work.startDate.year ?? "TBA"}
              </p>

              {isSelected && (
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-400">
                  You picked this
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
