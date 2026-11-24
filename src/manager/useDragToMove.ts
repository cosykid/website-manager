"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

/** How far a press moves, in pixels, before it becomes a drag and not a click. */
const DRAG_DISTANCE = 5;

/** A drag this close to the edge of a scrolling area, in pixels, scrolls it. */
const SCROLL_EDGE = 40;

/** How far it scrolls, in pixels, each time the screen is drawn. */
const SCROLL_STEP = 8;

export type Drag = {
  /** The item being dragged. */
  id: string;
  /** The gap it would drop into. */
  target: string;
  /** The gap that is open, to make room for it. */
  open: string;
  /** Whether it has been over any gap but its own. */
  moved: boolean;
  /** Where to draw the item in the window, and its size, all in pixels. */
  top: number;
  left: number;
  width: number;
  height: number;
  /** How tall the list was. It stays that tall, so the page does not jump. */
  listHeight: number;
};

/** A gap, where it is in the window, and how far down the list. */
type MeasuredGap = {
  name: string;
  left: number;
  width: number;
  down: number;
  opens: boolean;
};

type DragActions = {
  /** Moves an item to the gap it was dropped in. */
  onDrop: (id: string, gap: string) => void;
  /** Told where an item being dragged would drop, as that changes. */
  onTarget?: (id: string, gap: string) => void;
  /** Told when a drag is over, whether or not it was dropped anywhere. */
  onEnd?: () => void;
};

/**
 * Dragging an item of a list to a new place, with a mouse, a finger or a pen.
 *
 * The list marks every place an item can go with a `Gap` (Dragging.tsx): an
 * element that has no height and a name. While an item is dragged it is taken
 * out of the list, and the gap nearest to it opens to make room. Letting go
 * drops it there. This hook knows nothing else about the list: what a gap's
 * name means, and what a drop does, are up to it.
 *
 * What the list has to have:
 *
 * - `list` as the ref of its outer element, marked `data-drag-list`, and its
 *   height held at `drag.listHeight`
 * - an <li> for each item, marked `data-dragged` while it is the one dragged.
 *   It starts with the gap in front of the item, and has the item itself in an
 *   element of the class `drag-item`
 * - `data-drag-row` on the part of the item that is lifted out by a drag
 * - `startDrag` called when something inside that row is pressed. A finger
 *   also needs that to be marked `data-drag-handle`, so that swiping over the
 *   rest of the row still scrolls
 */
export function useDragToMove(actions: DragActions) {
  const list = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  // The page can be edited during a drag, from the keyboard. So a drop uses
  // the newest actions, not the ones from when the drag began.
  const newest = useRef(actions);
  useEffect(() => {
    newest.current = actions;
  }, [actions]);

  // Stops listening to the pointer if the list goes away during a drag.
  const listening = useRef<AbortController>(null);
  useEffect(() => () => listening.current?.abort(), []);

  /** Call this when an item is pressed. */
  function startDrag(press: ReactPointerEvent<HTMLElement>, id: string) {
    const pressed = press.currentTarget;
    const { pointerId } = press;
    const item = pressed.closest("li");
    const row = pressed.closest("[data-drag-row]");
    if (!list.current || !item || !row) return;
    const container: HTMLElement = list.current;

    const byFinger = press.pointerType === "touch";
    if (press.button !== 0 || !press.isPrimary) return;
    if (byFinger && !pressed.hasAttribute("data-drag-handle")) return;

    const start = { x: press.clientX, y: press.clientY };
    let pointer = start;
    let stage: "pressed" | "dragging" | "cancelled" = "pressed";

    // Measured now, before anything moves.
    const { top, height } = row.getBoundingClientRect();
    const listHeight = container.offsetHeight;
    const gaps = measureGaps(container, item);
    // The first gap of the item is the place it is in now.
    const home = gaps.find((gap) => gap.name === gapName(item.firstElementChild)) ?? gaps[0];
    let target = home;
    let open = home;
    let moved = false;

    const controller = new AbortController();
    const { signal } = controller;
    listening.current?.abort();
    listening.current = controller;

    // Moves the item up or down with the pointer, and finds where it would
    // drop. It is drawn as far in as it would be there.
    function update() {
      const newTop = top + pointer.y - start.y;

      // A gap opens downwards, so the room it makes starts at the gap. The
      // item goes into the room whose top is nearest to its own.
      const down = newTop - container.getBoundingClientRect().top;
      const nearest = nearestGap(gaps, down);
      if (nearest !== target) newest.current.onTarget?.(id, nearest.name);

      target = nearest;
      if (target.opens) open = target;
      if (target !== home) moved = true;

      setDrag({
        id,
        target: target.name,
        open: open.name,
        moved,
        top: newTop,
        left: target.left,
        width: target.width,
        height,
        listHeight,
      });
    }

    function move(event: PointerEvent) {
      if (event.pointerId !== pointerId || stage === "cancelled") return;
      pointer = { x: event.clientX, y: event.clientY };

      if (stage === "pressed") {
        const distance = Math.hypot(pointer.x - start.x, pointer.y - start.y);
        if (distance < DRAG_DISTANCE) return;

        stage = "dragging";
        // Keeps the pointer's events coming here, even over the preview's frame.
        pressed.setPointerCapture(pointerId);
        // The press put keyboard focus on the row, and would leave it lit up.
        pressed.blur();
        requestAnimationFrame(scrollNearEdge);
        newest.current.onTarget?.(id, home.name);
      }
      update();
    }

    // Runs for as long as the drag does, so that holding still near an edge
    // keeps scrolling. The list then moves under the pointer.
    function scrollNearEdge() {
      if (signal.aborted || stage !== "dragging") return;
      if (scrollToward(pointer.y, container)) update();
      requestAnimationFrame(scrollNearEdge);
    }

    function cancel(event: KeyboardEvent) {
      if (event.key !== "Escape" || stage !== "dragging") return;
      // The pointer is still down. Keep listening until it is let go.
      stage = "cancelled";
      setDrag(null);
      newest.current.onEnd?.();
    }

    function end(event: PointerEvent) {
      if (event.pointerId !== pointerId) return;
      controller.abort();
      if (stage === "pressed") return;

      ignoreNextClick();
      if (stage === "cancelled") return;

      setDrag(null);
      newest.current.onEnd?.();
      const dropped = event.type === "pointerup" && target !== home;
      if (dropped) newest.current.onDrop(id, target.name);
    }

    window.addEventListener("pointermove", move, { signal });
    window.addEventListener("pointerup", end, { signal });
    window.addEventListener("pointercancel", end, { signal });
    window.addEventListener("keydown", cancel, { signal });
  }

  return { list, drag, startDrag };
}

function gapName(element: Element | null): string {
  return element?.getAttribute("data-gap") ?? "";
}

/**
 * Every gap the item could go in, and where it is once the item has been taken
 * out of the list. How far down they are stays true for the whole drag.
 */
function measureGaps(list: HTMLElement, item: HTMLElement): MeasuredGap[] {
  const listTop = list.getBoundingClientRect().top;
  const taken = item.getBoundingClientRect();

  return [...list.querySelectorAll("[data-gap]")]
    .filter((gap) => {
      // A list inside this one has gaps of its own.
      if (gap.closest("[data-drag-list]") !== list) return false;
      // An item cannot go inside itself. Its first gap is the one it is in.
      return !item.contains(gap) || gap === item.firstElementChild;
    })
    .map((gap) => {
      const { top, left, width } = gap.getBoundingClientRect();
      const isBelow = top >= taken.bottom;
      return {
        name: gapName(gap),
        left,
        width,
        down: (isBelow ? top - taken.height : top) - listTop,
        opens: !gap.hasAttribute("data-stays-shut"),
      };
    });
}

/** The gap nearest to a height in the list. Of two the same, the first. */
function nearestGap(gaps: MeasuredGap[], down: number): MeasuredGap {
  return gaps.reduce((best, gap) =>
    Math.abs(gap.down - down) < Math.abs(best.down - down) ? gap : best,
  );
}

/**
 * Scrolls the area the list is in, if a height in the window is close to its
 * top or bottom edge. Answers whether it scrolled.
 */
function scrollToward(y: number, list: HTMLElement): boolean {
  const area = scrollingAreaOf(list);
  const isWindow = area === document.documentElement;
  const top = isWindow ? 0 : area.getBoundingClientRect().top;
  const bottom = isWindow ? window.innerHeight : area.getBoundingClientRect().bottom;

  const before = area.scrollTop;
  if (y < top + SCROLL_EDGE) area.scrollTop -= SCROLL_STEP;
  if (y > bottom - SCROLL_EDGE) area.scrollTop += SCROLL_STEP;
  return area.scrollTop !== before;
}

/** The closest element around the list that scrolls, or the whole window. */
function scrollingAreaOf(element: HTMLElement): HTMLElement {
  let area = element.parentElement;
  while (area && area !== document.body) {
    const scrolls = /auto|scroll/.test(getComputedStyle(area).overflowY);
    if (scrolls && area.scrollHeight > area.clientHeight) return area;
    area = area.parentElement;
  }
  return document.documentElement;
}

/**
 * Letting go of a mouse button ends in a click on whatever was pressed. After
 * a drag that click means nothing, and would open the item's form.
 */
function ignoreNextClick() {
  const ignore = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };
  window.addEventListener("click", ignore, { capture: true, once: true });
  // The click, if there is one, comes straight after. A finger's drag has none.
  setTimeout(() => window.removeEventListener("click", ignore, { capture: true }));
}
