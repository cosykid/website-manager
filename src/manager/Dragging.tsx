import type { CSSProperties, ReactNode } from "react";
import type { Drag } from "./useDragToMove";

/** What a list draws so that its items can be dragged: see useDragToMove.ts. */

type GapProps = {
  /** Says which place this is, to the list that draws it. */
  name: string;
  /** The gap a drag would drop into now, if any. */
  target: string | null;
  style?: CSSProperties;
};

/**
 * A place an item can be dropped. It takes up no room, and is only drawn, as a
 * line, while it is where a drag would drop.
 */
export function Gap({ name, target, style }: GapProps) {
  return (
    <div
      className="drag-gap"
      style={style}
      data-gap={name}
      data-target={name === target || undefined}
      aria-hidden="true"
    />
  );
}

/** The name of what is being dragged, beside the pointer. */
export function Held({ drag, children }: { drag: Drag; children: ReactNode }) {
  return (
    <div
      className="drag-held"
      style={{ translate: `${drag.x}px ${drag.y}px` }}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}
