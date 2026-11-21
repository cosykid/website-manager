"use server";

import { createPage } from "@/db/pages";
import { getSite } from "@/db/sites";
import {
  checkPageDetails,
  PATH_TAKEN_MESSAGE,
  type PageDetailErrors,
} from "@/page-model/details";

/**
 * What the manager can change. These run on the server and can be called by
 * any browser, so each one checks everything it is given and trusts nothing.
 * (The brief asks for no sign-in. With one, the check would start here.)
 */

export type CreatePageResult =
  | { ok: true; pageId: string }
  | { ok: false; errors: PageDetailErrors };

export async function createPageAction(input: {
  siteId: string;
  title: string;
  path: string;
}): Promise<CreatePageResult> {
  const title = String(input.title).trim();
  const path = String(input.path).trim();

  const errors = checkPageDetails(title, path);
  if (errors.title || errors.path) return { ok: false, errors };

  const site = await getSite(String(input.siteId));
  if (!site) return { ok: false, errors: { title: "This site no longer exists." } };

  const result = await createPage(site.id, title, path);
  if (result === "path-taken") {
    return { ok: false, errors: { path: PATH_TAKEN_MESSAGE } };
  }
  return { ok: true, pageId: result.id };
}
