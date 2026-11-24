import type { ComponentInstance } from "./types";

/**
 * Edits to a page's tree of component instances.
 *
 * Every function returns a new tree and leaves the one it was given untouched.
 * That is what React state needs, and it makes each edit easy to test.
 */

/**
 * Somewhere an instance can be: the gap in front of one of its neighbours, or
 * the gap after the last of them.
 *
 * A place names a neighbour, not a position number, because taking an
 * instance out of a list renumbers everything after it.
 */
export type Place = {
  /** The instance it is inside, or null for the page itself. */
  parentId: string | null;
  /** The instance it comes before, or null for last. */
  beforeId: string | null;
};

/** Finds an instance anywhere in the tree. */
export function findInstance(
  nodes: ComponentInstance[],
  id: string,
): ComponentInstance | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = node.children && findInstance(node.children, id);
    if (found) return found;
  }
  return undefined;
}

/**
 * What an instance is inside: the outermost instance first, its own parent
 * last. Empty for one placed straight on the page.
 */
export function findAncestors(
  nodes: ComponentInstance[],
  id: string,
): ComponentInstance[] {
  for (const node of nodes) {
    if (!node.children || !findInstance(node.children, id)) continue;
    return [node, ...findAncestors(node.children, id)];
  }
  return [];
}

/** Where an instance is now. */
export function findPlace(
  nodes: ComponentInstance[],
  id: string,
  parentId: string | null = null,
): Place | undefined {
  for (const [index, node] of nodes.entries()) {
    if (node.id === id) {
      return { parentId, beforeId: nodes[index + 1]?.id ?? null };
    }
    const found = node.children && findPlace(node.children, id, node.id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Adds an instance to the page (`parentId` null) or inside the instance with
 * that id: in front of the neighbour named by `beforeId`, or last without one.
 */
export function insertInstance(
  nodes: ComponentInstance[],
  parentId: string | null,
  instance: ComponentInstance,
  beforeId: string | null = null,
): ComponentInstance[] {
  if (parentId === null) return insertBefore(nodes, instance, beforeId);

  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        children: insertBefore(node.children ?? [], instance, beforeId),
      };
    }
    if (node.children) {
      return {
        ...node,
        children: insertInstance(node.children, parentId, instance, beforeId),
      };
    }
    return node;
  });
}

function insertBefore(
  siblings: ComponentInstance[],
  instance: ComponentInstance,
  beforeId: string | null,
): ComponentInstance[] {
  const index = siblings.findIndex((sibling) => sibling.id === beforeId);
  if (index === -1) return [...siblings, instance];
  return [...siblings.slice(0, index), instance, ...siblings.slice(index)];
}

/** Removes an instance, and everything inside it, wherever it is. */
export function removeInstance(
  nodes: ComponentInstance[],
  id: string,
): ComponentInstance[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) =>
      node.children
        ? { ...node, children: removeInstance(node.children, id) }
        : node,
    );
}

/**
 * Moves an instance one place up or down among its siblings. At the first or
 * last position the tree comes back unchanged.
 */
export function moveInstance(
  nodes: ComponentInstance[],
  id: string,
  direction: "up" | "down",
): ComponentInstance[] {
  const index = nodes.findIndex((node) => node.id === id);

  if (index === -1) {
    // Not at this level, so look inside each container.
    return nodes.map((node) =>
      node.children
        ? { ...node, children: moveInstance(node.children, id, direction) }
        : node,
    );
  }

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= nodes.length) return nodes;

  const reordered = [...nodes];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  return reordered;
}

/**
 * Moves an instance, and everything inside it, to another place on the page.
 * The tree comes back unchanged if it is already there, or if the place does
 * not exist once it has been taken out, such as a place inside itself.
 */
export function moveInstanceTo(
  nodes: ComponentInstance[],
  id: string,
  to: Place,
): ComponentInstance[] {
  const instance = findInstance(nodes, id);
  const from = findPlace(nodes, id);
  if (!instance || !from) return nodes;

  // The gaps just before it and just after it are both where it is now.
  const isThereNow =
    to.parentId === from.parentId &&
    (to.beforeId === id || to.beforeId === from.beforeId);
  if (isThereNow) return nodes;

  const rest = removeInstance(nodes, id);
  if (to.parentId !== null && !findInstance(rest, to.parentId)) return nodes;

  return insertInstance(rest, to.parentId, instance, to.beforeId);
}

/** Replaces the props of one instance. */
export function updateProps(
  nodes: ComponentInstance[],
  id: string,
  props: Record<string, unknown>,
): ComponentInstance[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, props };
    if (node.children) {
      return { ...node, children: updateProps(node.children, id, props) };
    }
    return node;
  });
}
