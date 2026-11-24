import type { Collection, ObjectId } from "mongodb";
import type { PageDocument } from "@/page-model/types";
import type { Site } from "@/site/types";
import { getDb } from "./client";

/**
 * The two collections and the shape of what is stored in each.
 *
 * sites  one document per website. Its `_id` is the site's id ("ironbarks"),
 *        so a page's `siteId` can be read by a person.
 * pages  one document per page: the portable page document plus timestamps.
 */

export type SiteRecord = Omit<Site, "id"> & { _id: string };

export type PageRecord = PageDocument & {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export async function sitesCollection(): Promise<Collection<SiteRecord>> {
  const db = await getDb();
  return db.collection<SiteRecord>("sites");
}

export async function pagesCollection(): Promise<Collection<PageRecord>> {
  const db = await getDb();
  return db.collection<PageRecord>("pages");
}

/**
 * The two lookups every public request makes, each backed by a unique index:
 * a site by hostname, then a page by site and path. Both stay a single
 * indexed read however many sites and pages there are.
 */
export async function ensureIndexes(): Promise<void> {
  const sites = await sitesCollection();
  const pages = await pagesCollection();

  await sites.createIndex({ domains: 1 }, { unique: true });
  await pages.createIndex({ siteId: 1, path: 1 }, { unique: true });
}
