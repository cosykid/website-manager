import { isInstanceTree, isPlainObject } from "./shape";
import type { ComponentInstance } from "./types";

/**
 * What the page editor and its live preview say to each other.
 *
 * The preview is a separate page, shown in a frame inside the editor. The two
 * talk with window.postMessage, and these are the only messages. A message
 * arrives as an unknown value, so each kind has a check as well as a type.
 */

/** Editor to preview: the page as it stands in the editor, saved or not. */
export type DraftMessage = {
  type: "draft";
  content: ComponentInstance[];
  /** The component whose form is open, so the preview can mark it. */
  selectedId: string | null;
};

/** Preview to editor. */
export type PreviewMessage =
  // The preview has loaded and is waiting for a draft.
  | { type: "ready" }
  // A component was clicked in the preview.
  | { type: "select"; id: string };

export function isDraftMessage(value: unknown): value is DraftMessage {
  if (!isPlainObject(value) || value.type !== "draft") return false;

  const { content, selectedId } = value;
  return (
    isInstanceTree(content) &&
    (selectedId === null || typeof selectedId === "string")
  );
}

export function isPreviewMessage(value: unknown): value is PreviewMessage {
  if (!isPlainObject(value)) return false;
  if (value.type === "ready") return true;
  return value.type === "select" && typeof value.id === "string";
}
