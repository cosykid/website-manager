import type { ComponentInstance } from "./types";

/**
 * Edits to a page's tree of component instances.
 *
 * Every function returns a new tree and leaves the one it was given untouched.
 * That is what React state needs, and it makes each edit easy to test.
 */

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
 * Adds an instance as the last item of the page (`parentId` null) or as the
 * last child of the instance with that id.
 */
export function insertInstance(
  nodes: ComponentInstance[],
  parentId: string | null,
  instance: ComponentInstance,
): ComponentInstance[] {
  if (parentId === null) return [...nodes, instance];

  return nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...(node.children ?? []), instance] };
    }
    if (node.children) {
      return {
        ...node,
        children: insertInstance(node.children, parentId, instance),
      };
    }
    return node;
  });
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
