"use client";

import Image from "next/image";
import { AnimeWork } from "@/core/domain/models/franchise-work";
import { SEASON_CARD_ID } from "./SeasonCard";

interface FranchiseTimelineProps {
  timeline: AnimeWork[];
  selectedId: number;
  onSelectEntry: (id: number) => void;
}

function entryLabel(work: AnimeWork, position: number): string {
  const releasedOn =
    work.startDate.year === null
      ? "release date to be announced"
      : String(work.startDate.year);

  return `${position}. ${work.title.userPreferred}, ${releasedOn}`;
}

export function FranchiseTimeline({
  timeline,
  selectedId,
  onSelectEntry,
}: FranchiseTimelineProps) {
  if (timeline.length < 2) return null;

  return (
    <section aria-label="Series timeline" className="space-y-3">
      <h2 className="text-xs uppercase tracking-wider font-bold text-gray-400">
        Watch order
      </h2>

      <ol className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory">
        {timeline.map((work, index) => {
          const isSelected = work.id === selectedId;

          return (
            <li key={work.id} className="flex-shrink-0 w-32 snap-start">
              <button
                type="button"
                onClick={() => onSelectEntry(work.id)}
                aria-label={entryLabel(work, index + 1)}
                aria-current={isSelected ? "true" : undefined}
                aria-controls={SEASON_CARD_ID}
                className={`w-full text-left cursor-pointer rounded-2xl border p-2 space-y-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${
                  isSelected
                    ? "bg-indigo-500/10 border-indigo-500/50"
                    : "bg-gray-900 border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-800">
                  {work.coverImage && (
                    <Image
                      src={work.coverImage}
                      alt=""
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

                <p className="text-[10px] text-gray-400 font-medium">
                  {work.startDate.year ?? "TBA"}
                </p>

                {isSelected && (
                  <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-400">
                    Now viewing
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
