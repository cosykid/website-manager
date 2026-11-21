import type { ComponentInstance } from "./types";

/**
 * Checks that a value has the shape of a tree of component instances.
 *
 * Page content reaches the server from a browser and from JSON files, so it
 * cannot be trusted to be well formed. This only checks the structure
 * (ids, types, props, children). Whether the props suit each component is
 * the library's job: see src/library/validate.ts.
 */
export function isInstanceTree(value: unknown): value is ComponentInstance[] {
  return Array.isArray(value) && value.every(isInstance) && hasUniqueIds(value);
}

function isInstance(value: unknown): value is ComponentInstance {
  if (!isPlainObject(value)) return false;

  const { id, type, props, children } = value;
  if (typeof id !== "string" || id === "") return false;
  if (typeof type !== "string" || type === "") return false;
  if (!isPlainObject(props)) return false;
  if (children === undefined) return true;

  return Array.isArray(children) && children.every(isInstance);
}

function hasUniqueIds(nodes: ComponentInstance[]): boolean {
  const seen = new Set<string>();

  function visit(list: ComponentInstance[]): boolean {
    for (const node of list) {
      if (seen.has(node.id)) return false;
      seen.add(node.id);
      if (node.children && !visit(node.children)) return false;
    }
    return true;
  }

  return visit(nodes);
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A page path is "/" or one or more lowercase words joined by hyphens and
 * separated by slashes, such as "/about" or "/teams/under-18s".
 */
export function isValidPath(path: string): boolean {
  return /^\/$|^(\/[a-z0-9]+(-[a-z0-9]+)*)+$/.test(path);
}
