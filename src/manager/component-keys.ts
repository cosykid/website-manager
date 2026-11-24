/** What a key press asks to have done to a component. */
export type KeyRequest = "rename" | "duplicate" | "remove" | "up" | "down";

/**
 * The keys that act on a component, the same ones a file browser or a design
 * tool uses. They work in two places: on the component's row in the list, and
 * on the heading of its form, which is where keyboard focus goes when a row
 * is clicked. The row's menu shows the same keys beside each choice.
 */
export function keyRequest(event: {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}): KeyRequest | null {
  const { key } = event;

  if (key === "F2") return "rename";
  if (key === "Delete" || key === "Backspace") return "remove";
  // Command on a Mac, Ctrl everywhere else.
  if (key.toLowerCase() === "d" && (event.metaKey || event.ctrlKey)) return "duplicate";
  if (key === "ArrowUp" && event.altKey) return "up";
  if (key === "ArrowDown" && event.altKey) return "down";
  return null;
}
