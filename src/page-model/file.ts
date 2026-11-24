import { checkPageDetails } from "./details";
import { isInstanceTree, isPlainObject } from "./shape";
import type { ComponentInstance, PageDocument } from "./types";

/**
 * Page files: a page written out as the text of a JSON file, and read back.
 *
 * The file holds the portable document described in docs/page-json.md. It is
 * the same shape as the files in seed/pages, so a page exported from the
 * manager can be edited by hand, imported into another site, or seeded.
 */

/**
 * The largest page file the manager takes. A page is a few kilobytes. A server
 * action accepts a request of up to 1 MB, so a file of this size still fits
 * with room to spare.
 */
export const MAX_PAGE_FILE_BYTES = 500_000;

export const PAGE_FILE_TOO_LARGE =
  "The file is larger than 500 KB, which is more than a page file can be.";

/** The text of a page's file: indented, so it is comfortable to read and edit. */
export function writePageFile(page: PageDocument): string {
  return `${JSON.stringify(page, null, 2)}\n`;
}

/**
 * A name for a page's file, in the style of seed/pages:
 * "ironbarks.home.json", "harbour-sevens.teams-under-18s.json".
 */
export function pageFileName(siteId: string, path: string): string {
  // Only letters and digits are kept, so a path that is still being typed
  // cannot put odd characters in a file name.
  const words = path.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return `${siteId}.${words.length > 0 ? words.join("-") : "home"}.json`;
}

/**
 * What a page file gives the manager. The file's own `siteId` is left out on
 * purpose: a page belongs to the site it is imported into.
 */
export type PageFromFile = {
  title: string;
  path: string;
  content: ComponentInstance[];
};

export type ReadPageFileResult =
  | { ok: true; page: PageFromFile }
  | { ok: false; problems: string[] };

/**
 * Reads the text of a page file.
 *
 * It checks that the text is JSON and has the shape of a page. Whether the
 * props suit each component is the library's job: see validateTree in
 * src/library/validate.ts.
 */
export function readPageFile(text: string): ReadPageFileResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, problems: [`The file is not valid JSON: ${reason}`] };
  }

  if (!isPlainObject(value)) {
    return {
      ok: false,
      problems: ['The file must hold one page: an object with "title", "path" and "content".'],
    };
  }

  const problems: string[] = [];
  const { schemaVersion, title, path, content } = value;

  // A file in a later version of the format could hold things this version
  // would misread. A file with no version is taken to be version 1.
  if (schemaVersion !== undefined && schemaVersion !== 1) {
    problems.push(
      `"schemaVersion" is ${JSON.stringify(schemaVersion)}. This manager reads version 1.`,
    );
  }

  // The same rules, in the same words, as the forms that take a title and path.
  const titleText = typeof title === "string" ? title : "";
  const pathText = typeof path === "string" ? path : "";
  const details = checkPageDetails(titleText, pathText);
  if (details.title) problems.push(details.title);
  if (details.path) problems.push(details.path);

  if (!isInstanceTree(content)) {
    problems.push(
      '"content" must be a list of components. Each needs an "id" that no other component on the page has, a "type" and "props".',
    );
    return { ok: false, problems };
  }

  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, page: { title: titleText.trim(), path: pathText, content } };
}
