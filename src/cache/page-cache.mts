import { readFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { getRedis } from "./redis.mts";

/**
 * Keeps rendered public pages in Redis.
 *
 * Next.js calls this class: next.config.ts names it as the `cacheHandler`. It
 * asks for a page with get(), and if there is none it renders the page and
 * hands it to set(). When the manager calls revalidatePath(), Next.js calls
 * revalidateTag().
 *
 * Redis holds two kinds of thing:
 *
 *   website-manager:page:<build>:<key>   one rendered page, and when it was rendered
 *   website-manager:changes              when each page was last changed
 *
 * Saving a page only writes the time to the second. A page rendered before
 * that time is out of date, and get() acts as if it were not there.
 *
 * Nothing here may throw. Without Redis a page is simply rendered from MongoDB.
 *
 * Node loads this file and redis.mts itself, without Next.js compiling them
 * first, and strips the types as it reads them. That takes Node 22.18 or newer,
 * the .mts ending (it says the file is a module) and the full file name in the
 * import of redis.mts.
 */

const CHANGES = "website-manager:changes";
/** The entry in CHANGES that counts for every page. */
const EVERY_PAGE = "*";
/** How long a page stays in Redis after it was last rendered, in seconds. */
const ONE_WEEK = 7 * 24 * 60 * 60;
/** How long to wait for Redis before carrying on without it, in milliseconds. */
const PATIENCE = 300;

/** A rendered page as Next.js hands it over. It has more in it than is used here. */
type RenderedPage = {
  kind: string;
  html?: string;
  status?: number;
  headers?: { "x-next-cache-tags"?: string };
  rscData?: Buffer;
  segmentData?: Map<string, Buffer>;
};

/** What is kept in Redis for one page. */
type StoredPage = {
  page: RenderedPage;
  renderedAt: number;
  /** How long Next.js may use the page for. Handed back to it as it came. */
  cacheControl: unknown;
};

let buildId: string | undefined;

export default class PageCache {
  #serverDistDir: string;

  /** When Next.js asked for each page, which is just before it renders it. */
  #askedAt = new Map<string, number>();

  constructor({ serverDistDir = "" }: { serverDistDir?: string }) {
    this.#serverDistDir = serverDistDir;
  }

  /** The stored page, or null to have Next.js render it. */
  async get(key: string, { kind }: { kind: string }) {
    // Next.js can store other things here, such as fetch() results. This
    // project uses none of them.
    if (kind !== "APP_PAGE") return null;
    const askedAt = Date.now();

    return withRedis(async (redis) => {
      const stored = await redis.get(this.#pageKey(key));
      this.#askedAt.set(key, askedAt);
      if (!stored) return null;

      const { page, renderedAt, cacheControl } = fromText(stored);
      const changes = await redis.hmGet(CHANGES, [EVERY_PAGE, ...tagsOf(page)]);
      const isOutOfDate = changes.some((changedAt) => Number(changedAt) >= renderedAt);

      return isOutOfDate ? null : { value: page, lastModified: renderedAt, cacheControl };
    });
  }

  /** Stores a page that has just been rendered. */
  async set(
    key: string,
    page: RenderedPage | null,
    { cacheControl }: { cacheControl?: unknown },
  ) {
    // A 404 is never stored. Otherwise anyone could fill Redis by asking for
    // addresses that do not exist.
    if (page?.kind !== "APP_PAGE" || page.status === 404) return;

    // The time the render began, not when it finished. If an editor saves in
    // between, this page was drawn from what they replaced and is out of date.
    // There is no time if Redis did not answer get(), so there is no point
    // waiting for it again here.
    const renderedAt = this.#askedAt.get(key);
    if (!renderedAt) return;

    await withRedis((redis) =>
      redis.set(this.#pageKey(key), toText({ page, renderedAt, cacheControl }), {
        EX: ONE_WEEK,
      }),
    );
  }

  /**
   * Notes that every page carrying one of these tags has changed. Next.js
   * gives each page a tag made from its path.
   */
  async revalidateTag(tags: string | string[]) {
    await recordChange([tags].flat());
  }

  resetRequestCache() {}

  /**
   * A page is tied to the build that rendered it, because its HTML names that
   * build's stylesheets. A new build starts with no pages.
   */
  #pageKey(key: string) {
    buildId ??= readFileSync(path.join(this.#serverDistDir, "..", "BUILD_ID"), "utf8");
    return `website-manager:page:${buildId}:${key}`;
  }
}

/** For changes made outside Next.js, such as by the seed script. */
export async function recordChangeToEveryPage() {
  await recordChange([EVERY_PAGE]);
}

async function recordChange(tags: string[]) {
  const now = Date.now();
  try {
    const redis = await getRedis();
    // While Redis is away the client holds on to this, and sends it before
    // anything else once Redis is back. So a save made meanwhile is not missed,
    // although the editor is not kept waiting for it.
    const recorded = redis
      .hSet(CHANGES, Object.fromEntries(tags.map((tag) => [tag, now])))
      .catch(warn);
    await Promise.race([recorded, sleep(PATIENCE)]);
  } catch (error) {
    warn(error);
  }
}

type Redis = Awaited<ReturnType<typeof getRedis>>;

/**
 * Does something with Redis. If Redis is away, fails or takes too long, the
 * answer is null.
 */
async function withRedis<T>(work: (redis: Redis) => Promise<T>): Promise<T | null> {
  try {
    const redis = await getRedis();
    if (!redis.isReady) return null;
    return await Promise.race([work(redis), giveUp()]);
  } catch (error) {
    warn(error);
    return null;
  }
}

/** Fails once Redis has had long enough to answer. */
async function giveUp(): Promise<never> {
  await sleep(PATIENCE);
  throw new Error(`no answer within ${PATIENCE} ms`);
}

function warn(error: unknown) {
  console.warn(`Redis: ${error instanceof Error ? error.message : error}`);
}

/** The tags Next.js put on a page when it rendered it. */
function tagsOf(page: RenderedPage): string[] {
  return page.headers?.["x-next-cache-tags"]?.split(",") ?? [];
}

/**
 * JSON cannot hold bytes or a Map, so the two parts of a page that use them
 * are written as base64.
 */
function toText({ page, renderedAt, cacheControl }: StoredPage): string {
  const { rscData, segmentData, ...rest } = page;
  return JSON.stringify({
    renderedAt,
    cacheControl,
    page: rest,
    rscData: rscData?.toString("base64"),
    segmentData:
      segmentData &&
      [...segmentData].map(([name, bytes]) => [name, bytes.toString("base64")]),
  });
}

function fromText(text: string): StoredPage {
  const { page, renderedAt, cacheControl, rscData, segmentData } = JSON.parse(text);
  return {
    renderedAt,
    cacheControl,
    page: {
      ...page,
      rscData: rscData && Buffer.from(rscData, "base64"),
      segmentData:
        segmentData &&
        new Map(
          segmentData.map(([name, bytes]: [string, string]) => [
            name,
            Buffer.from(bytes, "base64"),
          ]),
        ),
    },
  };
}
