/** What a list of pages needs to know about each one. */
export type PageLink = { id: string; title: string; path: string };

/** A page and the pages under it. */
export type PageNode<P> = { page: P; children: PageNode<P>[] };

/**
 * Arranges a site's pages by their paths: /squad/juniors goes under /squad.
 *
 * Pages are stored as a flat list, so this is worked out from the paths each
 * time. A page whose parent path is not a page goes under the closest one
 * that is, or at the top. Every path starts with "/", but the home page is
 * not treated as the parent of them all. That would only push the whole list
 * in by one step.
 */
export function pageTree<P extends { path: string }>(pages: P[]): PageNode<P>[] {
  const top: PageNode<P>[] = [];
  const nodesByPath = new Map<string, PageNode<P>>();

  // In path order, a page always comes after the pages it goes under.
  const inOrder = [...pages].sort((a, b) => (a.path < b.path ? -1 : 1));

  for (const page of inOrder) {
    const node: PageNode<P> = { page, children: [] };
    const parent = findParent(page.path, nodesByPath);
    (parent ? parent.children : top).push(node);
    nodesByPath.set(page.path, node);
  }

  return top;
}

/** For "/squad/juniors/girls", tries "/squad/juniors" and then "/squad". */
function findParent<P>(
  path: string,
  nodesByPath: Map<string, PageNode<P>>,
): PageNode<P> | undefined {
  let end = path.lastIndexOf("/");
  while (end > 0) {
    const parent = nodesByPath.get(path.slice(0, end));
    if (parent) return parent;
    end = path.lastIndexOf("/", end - 1);
  }
  return undefined;
}
