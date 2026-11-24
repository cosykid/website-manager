/**
 * Puts the two demo sites and their pages into MongoDB.
 *
 *   npm run seed              adds whatever is missing and leaves edits alone
 *   npm run seed -- --reset   deletes every site and page first
 *
 * Sites are always written from seed/sites.json, because sites are not edited
 * in the manager. Pages are only added when their site and path don't exist
 * yet, so running this again never overwrites an editor's work.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { recordChangeToEveryPage } from "@/cache/page-cache.mts";
import { getRedis } from "@/cache/redis.mts";
import { getMongoClient } from "@/db/client";
import {
  ensureIndexes,
  pagesCollection,
  sitesCollection,
} from "@/db/collections";
import { definitions } from "@/library/definitions";
import { describeIssues, fillTree, validateTree } from "@/library/validate";
import { isInstanceTree, isValidPath } from "@/page-model/shape";
import type { PageDocument } from "@/page-model/types";
import { findContrastProblems } from "@/site/contrast";
import type { Site } from "@/site/types";

const seedFolder = path.join(process.cwd(), "seed");

function readJson<T>(file: string): T {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch (error) {
    // Say which file, so a missing comma in a hand-written page is easy to find.
    const name = path.relative(process.cwd(), file);
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${name} is not valid JSON: ${reason}`);
  }
}

/** Stops the seed with a clear message if the seed files have a mistake. */
function checkSeedData(sites: Site[], pages: PageDocument[]): void {
  const problems: string[] = [];
  const siteIds = new Set(sites.map((site) => site.id));

  for (const site of sites) {
    for (const problem of findContrastProblems(site.theme)) {
      problems.push(`Site "${site.id}" theme: ${problem}`);
    }
  }

  for (const page of pages) {
    const name = `Page ${page.siteId}${page.path}`;
    if (!siteIds.has(page.siteId)) problems.push(`${name}: unknown site`);
    if (!isValidPath(page.path)) problems.push(`${name}: invalid path`);
    if (typeof page.title !== "string" || page.title.trim() === "") {
      problems.push(`${name}: title is missing`);
    }
    if (!isInstanceTree(page.content)) {
      problems.push(`${name}: content is not a valid tree of components`);
      continue;
    }
    // A hand-written page may leave optional props out. Fill them in before
    // checking, which is the order the renderer uses.
    const filled = fillTree(page.content, definitions);
    for (const line of describeIssues(validateTree(filled, definitions))) {
      problems.push(`${name}, ${line}`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`The seed data has problems:\n  ${problems.join("\n  ")}`);
  }
}

async function seed(): Promise<void> {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");

  const sites = readJson<Site[]>(path.join(seedFolder, "sites.json"));
  const pagesFolder = path.join(seedFolder, "pages");
  const pages = readdirSync(pagesFolder)
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson<PageDocument>(path.join(pagesFolder, file)));

  checkSeedData(sites, pages);

  // Connect once, up front. If MongoDB is not running, the script stops here.
  const client = await getMongoClient();
  try {
    const sitesInDb = await sitesCollection();
    const pagesInDb = await pagesCollection();

    if (process.argv.includes("--reset")) {
      await sitesInDb.deleteMany({});
      await pagesInDb.deleteMany({});
      console.log("Removed every site and page.");
    }

    await ensureIndexes();

    for (const { id, ...site } of sites) {
      await sitesInDb.replaceOne({ _id: id }, site, { upsert: true });
    }

    let pagesAdded = 0;
    const now = new Date();
    for (const page of pages) {
      // Store the page with every prop present, as the manager does on save.
      const content = fillTree(page.content, definitions);
      const result = await pagesInDb.updateOne(
        { siteId: page.siteId, path: page.path },
        { $setOnInsert: { ...page, content, createdAt: now, updatedAt: now } },
        { upsert: true },
      );
      pagesAdded += result.upsertedCount;
    }

    const pagesKept = pages.length - pagesAdded;
    console.log(
      `Seeded ${sites.length} sites. Added ${pagesAdded} pages` +
        (pagesKept > 0 ? `, left ${pagesKept} existing pages as they were.` : "."),
    );
    // Any of them may have changed, so the copies in Redis are out of date.
    const redis = await getRedis();
    if (redis.isReady) await recordChangeToEveryPage();
    redis.destroy();

    console.log("\nWith `npm run dev` running, open:");
    console.log("  Manager         http://localhost:3000");
    for (const site of sites) {
      console.log(`  ${site.name.padEnd(15)} http://${site.domains[0]}:3000`);
    }
  } finally {
    // Close the connection, or the script would never exit.
    await client.close();
  }
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
