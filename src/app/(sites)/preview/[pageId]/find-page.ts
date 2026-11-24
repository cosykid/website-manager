import { cache } from "react";
import { getPage } from "@/db/pages";
import { getSite } from "@/db/sites";

/**
 * The page being previewed and the site it belongs to. Cached for the length
 * of a request, because the layout and the page both need it.
 */
export const findPreviewPage = cache(async (pageId: string) => {
  const page = await getPage(pageId);
  if (!page) return null;

  const site = await getSite(page.siteId);
  return site ? { site, page } : null;
});
