/**
 * Next.js hands a catch-all route its path as a list of segments:
 * nothing for the home page, ["teams", "under-18s"] for /teams/under-18s.
 * Pages are stored by their full path, so join the segments back up.
 */
export function pathFromSegments(segments: string[] | undefined): string {
  return `/${(segments ?? []).join("/")}`;
}
