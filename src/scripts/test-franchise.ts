#!/usr/bin/env node

/**
 * CLI test harness for the FranchiseCollector service.
 *
 * Usage:
 *   npm run test:franchise -- --id=21        # One Piece
 *   npm run test:franchise -- --id=9183      # Gintama
 *
 * Hits the real AniList API, runs the FranchiseCollector BFS traversal,
 * and prints the full franchise tree + main timeline.
 */

import { FranchiseCollector } from "../core/domain/services/franchise-collector";
import { AniListGraphQLRepository } from "../infrastructure/adapters/anilist/anilist-graphql-repository";

// Parse --id=X from command line arguments
const args = process.argv.slice(2);
const idArg = args.find((a) => a.startsWith("--id="));
const id = idArg ? parseInt(idArg.split("=")[1] ?? "", 10) : 21; // Default: One Piece

if (Number.isNaN(id) || id <= 0) {
  console.error("Invalid ID. Usage: npm run test:franchise -- --id=21");
  process.exit(1);
}

async function main(): Promise<void> {
  console.log(`\n🔍 Fetching franchise for anime ID: ${id}\n`);

  const repo = new AniListGraphQLRepository();
  const collector = new FranchiseCollector(repo);

  const franchise = await collector.collect(id);

  console.log("═══════════════════════════════════════════");
  console.log("          FRANCHISE COLLECTED              ");
  console.log("═══════════════════════════════════════════\n");

  console.log(`  Root ID:            ${franchise.rootId}`);
  console.log(`  Total nodes:        ${franchise.nodes.size}`);
  console.log(`  Total edges:        ${franchise.edges.length}`);
  console.log(
    `  Main timeline:      ${franchise.mainTimeline.length} entries\n`,
  );

  // Print all nodes
  console.log("───────────────────────────────────────────");
  console.log("               ALL NODES                  ");
  console.log("───────────────────────────────────────────\n");

  const sortedNodeIds = Array.from(franchise.nodes.keys()).sort(
    (a, b) => a - b,
  );
  for (const nodeId of sortedNodeIds) {
    const anime = franchise.nodes.get(nodeId)!;
    const year = anime.releaseYear ?? "????";
    const format =
      anime.relations.length > 0
        ? `[${anime.relations.length} relations]`
        : "[no relations]";
    console.log(
      `  [${nodeId}] ${anime.title.userPreferred} (${year}) ${format}`,
    );
  }

  // Print all edges
  console.log("\n───────────────────────────────────────────");
  console.log("               ALL EDGES                   ");
  console.log("───────────────────────────────────────────\n");

  for (const edge of franchise.edges) {
    const sourceAnime = franchise.nodes.get(edge.sourceId);
    const sourceTitle =
      sourceAnime?.title.userPreferred ?? `ID:${edge.sourceId}`;
    const targetTitle = edge.relation.title || `ID:${edge.relation.id}`;
    const format = edge.relation.format ?? "????";
    console.log(
      `  ${sourceTitle} --${edge.relation.relationType}--> ${targetTitle} [${format}]`,
    );
  }

  // Print main timeline
  console.log("\n───────────────────────────────────────────");
  console.log("          MAIN TIMELINE                   ");
  console.log("    (PREQUEL/SEQUEL, ordered by year)     ");
  console.log("───────────────────────────────────────────\n");

  if (franchise.mainTimeline.length === 0) {
    console.log("  (empty — no main timeline nodes found)");
  } else {
    for (let i = 0; i < franchise.mainTimeline.length; i++) {
      const anime = franchise.mainTimeline[i]!;
      const year = anime.releaseYear ?? "????";
      const arrow = i < franchise.mainTimeline.length - 1 ? " →" : "";
      console.log(
        `  ${i + 1}. [${anime.id}] ${anime.title.userPreferred} (${year})${arrow}`,
      );
    }
  }

  console.log("\n═══════════════════════════════════════════");
  console.log("               DONE!                       ");
  console.log("═══════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error("\n❌ Error:", error);
  process.exit(1);
});
