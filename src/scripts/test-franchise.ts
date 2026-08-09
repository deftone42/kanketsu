#!/usr/bin/env node

import { FranchiseCollector } from "../core/domain/services/franchise-collector";
import { AniListGraphQLRepository } from "../infrastructure/adapters/anilist/anilist-graphql-repository";

const args = process.argv.slice(2);
const idArg = args.find((a) => a.startsWith("--id="));
const id = idArg ? parseInt(idArg.split("=")[1] ?? "", 10) : 21;

if (Number.isNaN(id) || id <= 0) {
  console.error("Invalid ID. Usage: npm run test:franchise -- --id=21");
  process.exit(1);
}

function heading(title: string): void {
  console.log(`\n${"─".repeat(45)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(45));
}

async function main(): Promise<void> {
  console.log(`\n🔍 Collecting franchise for anime ID: ${id}\n`);

  const repository = new AniListGraphQLRepository();
  const collector = new FranchiseCollector(repository);

  const startedAt = Date.now();
  const franchise = await collector.collect(id);
  const elapsedMs = Date.now() - startedAt;

  console.log("═".repeat(45));
  console.log("            FRANCHISE COLLECTED");
  console.log("═".repeat(45));
  console.log(`  Root ID:        ${franchise.rootId}`);
  console.log(`  Nodes:          ${franchise.nodes.size}`);
  console.log(`  Edges:          ${franchise.edges.length}`);
  console.log(`  Timeline:       ${franchise.timeline.length}`);
  console.log(`  Related:        ${franchise.related.length}`);
  console.log(`  Sources:        ${franchise.sources.length}`);
  console.log(`  Complete:       ${franchise.isComplete}`);
  if (franchise.unresolvedIds.length > 0) {
    console.log(`  Unresolved:     ${franchise.unresolvedIds.join(", ")}`);
  }
  console.log(`  Elapsed:        ${elapsedMs}ms`);

  heading("TIMELINE (release order)");
  if (franchise.timeline.length === 0) {
    console.log("  (empty)");
  } else {
    franchise.timeline.forEach((work, index) => {
      const { year, month, day } = work.startDate;
      const date = year
        ? `${year}-${String(month ?? 1).padStart(2, "0")}-${String(day ?? 1).padStart(2, "0")}`
        : "unknown";
      const marker = work.id === franchise.rootId ? " ← you picked this" : "";
      console.log(
        `  ${index + 1}. [${work.id}] ${work.title.userPreferred} (${date})${marker}`,
      );
    });
  }

  heading("SUMMARY (feeds the watching score)");
  const { summary } = franchise;
  console.log(`  Years:          ${summary.startYear ?? "?"} – ${summary.endYear ?? "?"}`);
  console.log(`  Total episodes: ${summary.totalEpisodes}`);
  console.log(`  Average score:  ${summary.averageScore ?? "n/a"}`);
  console.log(`  Status:         ${summary.status}`);
  console.log(`  Source status:  ${summary.sourceStatus}`);
  if (summary.nextAiringEpisode) {
    const days = Math.ceil(
      summary.nextAiringEpisode.timeUntilAiringSeconds / 86400,
    );
    console.log(
      `  Next episode:   ${summary.nextAiringEpisode.episode} of "${summary.nextAiringEpisode.seasonTitle}" in ${days}d`,
    );
  }

  heading("RELATED (movies, OVAs, specials)");
  if (franchise.related.length === 0) {
    console.log("  (none)");
  } else {
    for (const work of franchise.related) {
      console.log(
        `  [${work.id}] ${work.title.userPreferred} (${work.format ?? "?"}, ${work.startDate.year ?? "?"})`,
      );
    }
  }

  heading("SOURCES (manga, novels)");
  if (franchise.sources.length === 0) {
    console.log("  (none — original work)");
  } else {
    for (const work of franchise.sources) {
      console.log(
        `  [${work.id}] ${work.title.userPreferred} (${work.format}, ${work.status}, ${work.chapters ?? "?"} ch)`,
      );
    }
  }

  console.log(`\n${"═".repeat(45)}\n`);
}

main().catch((error: unknown) => {
  console.error("\n❌ Error:", error);
  process.exit(1);
});
