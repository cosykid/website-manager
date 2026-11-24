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
  /** The gap it would drop into, or null if it would stay where it is. */
  gap: string | null;
  /** Where the pointer is in the window, in pixels. */
  x: number;
  y: number;
};

/**
 * Dragging an item of a list to a new place, with a mouse, a finger or a pen.
 *
 * The list marks every place an item can go with a `Gap` (Dragging.tsx): an
 * element that has no height and a name. While an item is dragged, the gap
 * nearest the pointer is where it will drop. This hook knows nothing else
 * about the list: what a gap's name means, and what a drop does, are up to it.
 *
 * The list's outer element needs the `list` ref and a `data-drag-list`
 * attribute, and each item must be an <li>. A mouse or pen can drag an item by
 * anything that calls `startDrag` when it is pressed. A finger needs an
 * element marked `data-drag-handle`, so that swiping over the list still
 * scrolls it.
 */
export function useDragToMove(onDrop: (id: string, gap: string) => void) {
  const list = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  // Stops listening to the pointer if the list goes away during a drag.
  const listening = useRef<AbortController>(null);
  useEffect(() => () => listening.current?.abort(), []);

  /** Call this when an item is pressed. */
  function startDrag(press: ReactPointerEvent<HTMLElement>, id: string) {
    const pressed = press.currentTarget;
    const { pointerId } = press;
    const byFinger = press.pointerType === "touch";
    if (press.button !== 0 || !press.isPrimary) return;
    if (byFinger && !pressed.hasAttribute("data-drag-handle")) return;

    const start = { x: press.clientX, y: press.clientY };
    let pointer = start;
    let gap: string | null = null;
    let stage: "pressed" | "dragging" | "cancelled" = "pressed";

    const controller = new AbortController();
    const { signal } = controller;
    listening.current?.abort();
    listening.current = controller;

    // Shows where the item is now, and where it would drop.
    function update() {
      gap = list.current && nearestGap(list.current, pointer.y, pressed.closest("li"));
      setDrag({ id, gap, ...pointer });
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
        requestAnimationFrame(scrollNearEdge);
      }
      update();
    }

    // Runs for as long as the drag does, so that holding still near an edge
    // keeps scrolling. The list then moves under the pointer.
    function scrollNearEdge() {
      if (signal.aborted || stage !== "dragging") return;
      if (list.current && scrollToward(pointer.y, list.current)) update();
      requestAnimationFrame(scrollNearEdge);
    }

    function cancel(event: KeyboardEvent) {
      if (event.key !== "Escape" || stage !== "dragging") return;
      // The pointer is still down. Keep listening until it is let go.
      stage = "cancelled";
      setDrag(null);
    }

    function end(event: PointerEvent) {
      if (event.pointerId !== pointerId) return;
      controller.abort();
      if (stage === "pressed") return;

      ignoreNextClick();
      setDrag(null);
      const dropped = event.type === "pointerup" && stage === "dragging";
      if (dropped && gap !== null) onDrop(id, gap);
    }

    window.addEventListener("pointermove", move, { signal });
    window.addEventListener("pointerup", end, { signal });
    window.addEventListener("pointercancel", end, { signal });
    window.addEventListener("keydown", cancel, { signal });
  }

  return { list, drag, startDrag };
}

/**
 * The name of the gap nearest to a height in the window. It is null when that
 * is one of the dragged item's own gaps: in front of it, or inside it.
 */
function nearestGap(
  list: HTMLElement,
  y: number,
  dragged: HTMLElement | null,
): string | null {
  let nearest: HTMLElement | null = null;
  let shortest = Infinity;

  for (const gap of list.querySelectorAll<HTMLElement>("[data-gap]")) {
    // A list inside this one has gaps of its own.
    if (gap.closest("[data-drag-list]") !== list) continue;

    const distance = Math.abs(gap.getBoundingClientRect().top - y);
    if (distance < shortest) {
      nearest = gap;
      shortest = distance;
    }
  }

  if (!nearest || dragged?.contains(nearest)) return null;
  return nearest.dataset.gap ?? null;
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
