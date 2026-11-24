"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prerenderPage } from "@/cache/prerender";
import { saveImage } from "@/db/images";
import { createPage, savePage } from "@/db/pages";
import { getSite } from "@/db/sites";
import {
  IMAGE_TOO_LARGE,
  imageAddress,
  MAX_IMAGE_BYTES,
  NOT_AN_IMAGE,
  readImageType,
} from "@/images/image-file";
import { definitions } from "@/library/definitions";
import {
  describeIssues,
  fillTree,
  validateTree,
  type IssuesByInstance,
} from "@/library/validate";
import {
  checkPageDetails,
  PATH_TAKEN_MESSAGE,
  type PageDetailErrors,
} from "@/page-model/details";
import {
  MAX_PAGE_FILE_BYTES,
  PAGE_FILE_TOO_LARGE,
  readPageFile,
} from "@/page-model/file";
import { isInstanceTree } from "@/page-model/shape";
import { publicRoute } from "@/site/public-route";
import type { Site } from "@/site/types";

/**
 * What the manager can change. These run on the server and can be called by
 * any browser, so each one checks everything it is given and trusts nothing.
 * (The brief asks for no sign-in. With one, the check would start here.)
 */

/** Has the stored copy of a public page replaced, now that the page has changed. */
function refreshPublicPage(site: Site, path: string): void {
  for (const domain of site.domains) revalidatePath(publicRoute(domain, path));
  // Once the editor has their answer, so that they do not wait for this.
  after(() => prerenderPage(site, path));
}

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

  refreshPublicPage(site, path);
  return { ok: true, pageId: result.id };
}

export type ImportPageResult =
  | { ok: true; pageId: string }
  /** Why the file was refused: one sentence for each problem. */
  | { ok: false; problems: string[] };

/**
 * Creates a page on a site from the text of a page file. The file gives the
 * title, the path and the components. The site is the one it is imported into.
 */
export async function importPageAction(input: {
  siteId: string;
  fileText: string;
}): Promise<ImportPageResult> {
  const fileText = String(input.fileText);
  // A character is at least one byte, so text this long is over the limit.
  if (fileText.length > MAX_PAGE_FILE_BYTES) {
    return { ok: false, problems: [PAGE_FILE_TOO_LARGE] };
  }

  const read = readPageFile(fileText);
  if (!read.ok) return { ok: false, problems: read.problems };
  const { title, path } = read.page;

  // The same order as a save: fill in what was left out, then check.
  const content = fillTree(read.page.content, definitions);
  const issues = validateTree(content, definitions);
  if (Object.keys(issues).length > 0) {
    return { ok: false, problems: describeIssues(issues) };
  }

  const site = await getSite(String(input.siteId));
  if (!site) return { ok: false, problems: ["This site no longer exists."] };

  const result = await createPage(site.id, title, path, content);
  if (result === "path-taken") {
    return {
      ok: false,
      problems: [
        `${site.name} already has a page at "${path}". Change "path" in the file, or open that page and import the file there to replace its components.`,
      ],
    };
  }

  refreshPublicPage(site, path);
  return { ok: true, pageId: result.id };
}

export type UploadImageResult =
  | { ok: true; address: string }
  | { ok: false; message: string };

/**
 * Stores an image and answers with its address. No page shows it until one
 * that holds the address is saved.
 */
export async function uploadImageAction(form: FormData): Promise<UploadImageResult> {
  const file = form.get("image");
  if (!(file instanceof File)) return { ok: false, message: NOT_AN_IMAGE };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: IMAGE_TOO_LARGE };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = readImageType(bytes);
  if (!type) return { ok: false, message: NOT_AN_IMAGE };

  const id = await saveImage(bytes, type);
  return { ok: true, address: imageAddress(id, type) };
}

export type SavePageResult =
  | { ok: true }
  | {
      ok: false;
      /** One sentence for the editor on what went wrong. */
      message: string;
      detailErrors?: PageDetailErrors;
      issues?: IssuesByInstance;
    };

export async function savePageAction(input: {
  pageId: string;
  title: string;
  path: string;
  content: unknown;
}): Promise<SavePageResult> {
  const title = String(input.title).trim();
  const path = String(input.path).trim();

  const detailErrors = checkPageDetails(title, path);
  if (detailErrors.title || detailErrors.path) {
    return { ok: false, message: "Fix the page details, then save again.", detailErrors };
  }

  if (!isInstanceTree(input.content)) {
    return {
      ok: false,
      message: "The page could not be read. Reload the page and try again.",
    };
  }

  // Fill in any prop that was left out, then check the result. The renderer
  // and the seed script work in the same order. What is stored is only what
  // the definitions describe, with every prop present.
  const content = fillTree(input.content, definitions);
  const issues = validateTree(content, definitions);
  if (Object.keys(issues).length > 0) {
    return { ok: false, message: "Fix the problems below, then save again.", issues };
  }

  const result = await savePage(String(input.pageId), { title, path, content });

  if (result === "path-taken") {
    return {
      ok: false,
      message: "Fix the page details, then save again.",
      detailErrors: { path: PATH_TAKEN_MESSAGE },
    };
  }
  if (result === "not-found") {
    return { ok: false, message: "This page no longer exists. It may have been deleted." };
  }

  const site = await getSite(result.siteId);
  if (site) {
    refreshPublicPage(site, path);
    // The old address has to stop working when a page moves.
    if (result.previousPath !== path) refreshPublicPage(site, result.previousPath);
  }
  return { ok: true };
}
