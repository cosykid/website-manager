import type { CSSProperties } from "react";

/**
 * Tells the stylesheet how many steps in from the edge to draw part of a tree:
 * see "Trees" in manager.css.
 */
export function atDepth(depth: number): CSSProperties {
  return { "--depth": depth } as CSSProperties;
}
