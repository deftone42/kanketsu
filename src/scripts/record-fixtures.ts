#!/usr/bin/env node

/**
 * Records real AniList responses into test fixtures.
 *
 * Usage: npm run record:fixtures
 *
 * Hand-written mocks encode what we assume the API returns. Every defect
 * found while designing this model came from a shape nobody would have
 * invented, so fixtures are recorded and replayed instead.
 *
 * Re-run whenever FRANCHISE_BATCH_QUERY changes.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { FRANCHISE_BATCH_QUERY } from "../infrastructure/adapters/anilist/graphql/queries";

const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const FIXTURE_DIR = join(process.cwd(), "src/test/fixtures/anilist");

const SCENARIOS: { name: string; ids: number[] }[] = [
  { name: "attack-on-titan", ids: [16498, 20958, 99147] }, // linear chain
  { name: "monogatari", ids: [5081, 11597, 9260, 21399] }, // same-year ties
  { name: "one-piece", ids: [21] }, // wide; episodes null while ongoing
  { name: "fate", ids: [10087, 356] }, // prequel aired later; absent source
  { name: "steins-gate", ids: [9253] }, // original anime, no source
  { name: "jujutsu-kaisen", ids: [113415, 145064] }, // multi-season, shared source
  { name: "missing-work", ids: [9183] }, // dead id -> empty media array
];

/** AniList throttles at 30 req/min; space recordings out generously. */
const DELAY_BETWEEN_CALLS_MS = 2500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function record(name: string, ids: number[]): Promise<void> {
  const response = await fetch(ANILIST_ENDPOINT, {
    method: "POST",
    headers: {
      "User-Agent": "Kanketsu/1.0",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: FRANCHISE_BATCH_QUERY, variables: { ids } }),
  });

  if (!response.ok) {
    throw new Error(`Recording "${name}" failed: HTTP ${response.status}`);
  }

  const body: unknown = await response.json();
  const fixture = { requestedIds: ids, response: body };

  await writeFile(
    join(FIXTURE_DIR, `${name}.json`),
    `${JSON.stringify(fixture, null, 2)}\n`,
    "utf8",
  );
  console.log(`  recorded ${name}.json (${ids.length} ids)`);
}

async function main(): Promise<void> {
  await mkdir(FIXTURE_DIR, { recursive: true });
  console.log(`Recording ${SCENARIOS.length} fixtures into ${FIXTURE_DIR}\n`);

  for (const [index, scenario] of SCENARIOS.entries()) {
    await record(scenario.name, scenario.ids);
    if (index < SCENARIOS.length - 1) await wait(DELAY_BETWEEN_CALLS_MS);
  }

  console.log("\nDone. Commit the fixtures.");
}

main().catch((error: unknown) => {
  console.error("Recording failed:", error);
  process.exit(1);
});
