import http from "node:http";
import { listPageAddresses } from "@/db/pages";
import { listSites } from "@/db/sites";
import type { Site } from "@/site/types";
import { getRedis } from "./redis.mts";

/**
 * Renders public pages before anyone visits them.
 *
 * Next.js renders a page when it is asked for one that is not stored, and has
 * no way to be told to do it sooner. So this asks: it requests the page from
 * this same server, as a visitor would.
 */

/** Renders one page, on every hostname its site answers on. */
export async function prerenderPage(site: Site, path: string): Promise<void> {
  if (!(await canStorePages())) return;
  for (const domain of site.domains) await visit(domain, path);
}

/** Renders every page of every site. */
export async function prerenderAllPages(): Promise<void> {
  if (!(await canStorePages())) return;
  const [sites, addresses] = await Promise.all([listSites(), listPageAddresses()]);

  for (const { siteId, path } of addresses) {
    const site = sites.find((candidate) => candidate.id === siteId);
    if (site) await prerenderPage(site, path);
  }
  console.log(`Pre-rendered ${addresses.length} public pages.`);
}

/** `next dev` never stores a page, and without Redis there is nowhere to. */
async function canStorePages(): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return false;
  const redis = await getRedis();
  return redis.isReady;
}

/**
 * `fetch` would be shorter but ignores a Host header, and the hostname is how
 * a site is found. Next.js sets PORT when the server starts.
 */
function visit(domain: string, path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = http.get(
      { host: "127.0.0.1", port: process.env.PORT, path, headers: { host: domain } },
      (response) => {
        response.resume().on("end", resolve);
      },
    );
    request.on("error", reject);
  });
}
