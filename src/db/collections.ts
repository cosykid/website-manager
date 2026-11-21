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

export function sitesCollection(): Collection<SiteRecord> {
  return getDb().collection<SiteRecord>("sites");
}

export function pagesCollection(): Collection<PageRecord> {
  return getDb().collection<PageRecord>("pages");
}

/**
 * The two lookups every public request makes, each backed by a unique index:
 * a site by hostname, then a page by site and path. Both stay a single
 * indexed read however many sites and pages there are.
 */
export async function ensureIndexes(): Promise<void> {
  await sitesCollection().createIndex({ domains: 1 }, { unique: true });
  await pagesCollection().createIndex({ siteId: 1, path: 1 }, { unique: true });
}
