import { cache } from "react";
import type { Site } from "@/site/types";
import { sitesCollection, type SiteRecord } from "./collections";

function toSite({ _id, ...rest }: SiteRecord): Site {
  return { id: _id, ...rest };
}

export async function listSites(): Promise<Site[]> {
  const records = await sitesCollection().find().sort({ name: 1 }).toArray();
  return records.map(toSite);
}

export async function getSite(id: string): Promise<Site | null> {
  const record = await sitesCollection().findOne({ _id: id });
  return record ? toSite(record) : null;
}

/**
 * Finds the site that answers on a hostname.
 *
 * Wrapped in React's `cache` because the layout, the page and the page's
 * metadata all ask for the same site while rendering one request. With it,
 * that is one database query instead of three.
 */
export const getSiteByDomain = cache(
  async (domain: string): Promise<Site | null> => {
    const record = await sitesCollection().findOne({ domains: domain });
    return record ? toSite(record) : null;
  },
);
