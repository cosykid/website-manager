import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, beforeEach, mock, test } from "node:test";
import PageCache, { recordChangeToEveryPage } from "./page-cache.mts";

/** Stands in for Redis: the few commands the cache uses, kept in memory. */
function makeFakeRedis() {
  const stored = new Map<string, string>();
  const changes = new Map<string, string>();

  return {
    isReady: true,
    stored,
    get: async (key: string) => stored.get(key) ?? null,
    set: async (key: string, text: string) => stored.set(key, text),
    hmGet: async (_key: string, tags: string[]) => tags.map((tag) => changes.get(tag) ?? null),
    hSet: async (_key: string, times: Record<string, number>) => {
      for (const [tag, time] of Object.entries(times)) changes.set(tag, String(time));
    },
  };
}

let redis: ReturnType<typeof makeFakeRedis>;

// The cache reads the build's id from a file beside Next.js's server folder.
const buildFolder = mkdtempSync(path.join(tmpdir(), "page-cache-test-"));
writeFileSync(path.join(buildFolder, "BUILD_ID"), "build-1");
const serverDistDir = path.join(buildFolder, "server");
after(() => rmSync(buildFolder, { recursive: true }));

beforeEach(() => {
  redis = makeFakeRedis();
  Object.assign(globalThis, {
    redisConnection: { client: redis, firstAttempt: Promise.resolve() },
  });

  // A clock that only moves when a test says so.
  mock.timers.reset();
  mock.timers.enable({ apis: ["Date"], now: 1_000_000 });
});

/** What Next.js hands over for a rendered page, cut down to the parts that matter. */
function makePage(tag: string, html: string) {
  return {
    kind: "APP_PAGE",
    html,
    rscData: Buffer.from([0, 255, 128, 10]),
    segmentData: new Map([["/_tree", Buffer.from([1, 254])]]),
    headers: { "x-next-cache-tags": `_N_T_/layout,${tag}` },
  };
}

const cacheControl = { revalidate: 3600, expire: 31_536_000 };

/** A visit, as Next.js handles it: use the stored page, or render one and store it. */
async function visit(tag: string, render: () => string | Promise<string>) {
  const cache = new PageCache({ serverDistDir }); // Next.js makes one for each request.
  const found = await cache.get(tag, { kind: "APP_PAGE" });
  if (found) return `stored: ${found.value.html}`;

  const html = await render();
  await cache.set(tag, makePage(tag, html), { cacheControl });
  return `rendered: ${html}`;
}

/** A save in the manager. The clock moves on first: it is later than what came before. */
async function change(tag: string) {
  mock.timers.tick(1);
  await new PageCache({ serverDistDir }).revalidateTag([tag]);
  mock.timers.tick(1);
}

test("a page comes back from Redis exactly as it was stored", async () => {
  await visit("/squad", () => "Squad");

  const found = await new PageCache({ serverDistDir }).get("/squad", { kind: "APP_PAGE" });
  assert.deepEqual(found?.value, makePage("/squad", "Squad"));
  assert.equal(found?.lastModified, 1_000_000);
  assert.deepEqual(found?.cacheControl, cacheControl);
});

test("a page that has changed is rendered again, and the others are not", async () => {
  await visit("/squad", () => "Squad");
  await visit("/teams", () => "Teams");
  await change("/squad");

  assert.equal(await visit("/squad", () => "New squad"), "rendered: New squad");
  assert.equal(await visit("/squad", () => "Not called"), "stored: New squad");
  assert.equal(await visit("/teams", () => "Not called"), "stored: Teams");
});

test("a page that changed while it was being rendered is not kept", async () => {
  await visit("/squad", async () => {
    await change("/squad");
    return "Drawn from what was there before the save";
  });

  assert.equal(await visit("/squad", () => "Squad"), "rendered: Squad");
});

test("a change to every page leaves none of the stored ones in use", async () => {
  await visit("/squad", () => "Squad");
  await visit("/teams", () => "Teams");
  mock.timers.tick(1);
  await recordChangeToEveryPage();
  mock.timers.tick(1);

  assert.equal(await visit("/squad", () => "New squad"), "rendered: New squad");
  assert.equal(await visit("/teams", () => "New teams"), "rendered: New teams");
});

test("a 404 is never stored, and neither is anything that is not a page", async () => {
  const cache = new PageCache({ serverDistDir });
  await cache.get("/nope", { kind: "APP_PAGE" });
  await cache.set("/nope", { ...makePage("/nope", "Not found"), status: 404 }, { cacheControl });
  await cache.get("/data", { kind: "FETCH" });
  await cache.set("/data", { kind: "FETCH" }, {});

  assert.equal(redis.stored.size, 0);
});

test("a page is stored under the build that rendered it", async () => {
  await visit("/squad", () => "Squad");
  assert.deepEqual([...redis.stored.keys()], ["website-manager:page:build-1:/squad"]);
});

test("a Redis that does not answer is given up on", async () => {
  redis.get = () => new Promise(() => {});
  mock.method(console, "warn", () => {});

  assert.equal(await visit("/squad", () => "Squad"), "rendered: Squad");
});

test("without Redis every page is rendered, and nothing fails", async () => {
  redis.isReady = false;
  redis.hSet = () => Promise.reject(new Error("The socket closed"));
  mock.method(console, "warn", () => {});

  assert.equal(await visit("/squad", () => "Squad"), "rendered: Squad");
  await change("/squad");
  assert.equal(await visit("/squad", () => "New squad"), "rendered: New squad");
});
