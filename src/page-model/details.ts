import { isValidPath } from "./shape";

/** Problems with a page's title or path, by field. Empty when both are fine. */
export type PageDetailErrors = { title?: string; path?: string };

/** Shown when a page is given a path that another page on its site has. */
export const PATH_TAKEN_MESSAGE =
  "Another page on this site already uses this path. Choose a different one.";

/**
 * Checks a page's title and path. The manager runs this as the editor types
 * and the server runs it again before saving.
 */
export function checkPageDetails(title: string, path: string): PageDetailErrors {
  const errors: PageDetailErrors = {};

  if (title.trim() === "") {
    errors.title = "Title is required.";
  }
  if (!isValidPath(path)) {
    errors.path =
      'Path must start with "/" and use lowercase letters, numbers and hyphens, such as /about-us. The home page is "/".';
  }

  return errors;
}

/** Turns a title into a path to suggest: "Meet the Team!" becomes "/meet-the-team". */
export function suggestPath(title: string): string {
  const words = title.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return `/${words.join("-")}`;
}
