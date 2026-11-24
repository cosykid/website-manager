import type { CSSProperties, ReactNode } from "react";
import type { Drag } from "./useDragToMove";

/** What a list draws so that its items can be dragged: see useDragToMove.ts. */

type GapProps = {
  /** Says which place this is, to the list that draws it. */
  name: string;
  /** What is being dragged, if anything. */
  drag: Drag | null;
  /** For a gap with no room to open, such as one in the middle of a row. */
  staysShut?: boolean;
  style?: CSSProperties;
};

/**
 * A place an item can be dropped. It takes up no room until a drag is over it.
 * Then it opens, pushing what is after it down, and shows an empty slot.
 */
export function Gap({ name, drag, staysShut, style }: GapProps) {
  return (
    <div
      className="drag-gap"
      style={{ ...style, height: drag?.open === name ? drag.height : 0 }}
      data-gap={name}
      data-target={drag?.target === name || undefined}
      data-stays-shut={staysShut}
      aria-hidden="true"
    />
  );
}

/** What is being dragged, lifted out of the list. */
export function Held({ drag, children }: { drag: Drag; children: ReactNode }) {
  const { top, left, width, height } = drag;
  return (
    <div className="drag-held" style={{ top, left, width, height }} aria-hidden="true">
      {children}
    </div>
  );
}
