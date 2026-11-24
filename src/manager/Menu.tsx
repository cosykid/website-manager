"use client";

import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import styles from "./Menu.module.css";

/** One thing a menu offers, or a line between two groups of them. */
export type MenuItem =
  | {
      label: string;
      /** The keys that do the same thing, to show beside it: "F2". */
      keys?: string;
      /** Shown but not on offer, such as "Move up" for the first in a list. */
      disabled?: boolean;
      onChoose: () => void;
    }
  | "line";

type MenuProps = {
  /** What the menu is about, for screen readers: "Section 2". */
  label: string;
  /** Where its top left corner goes, in pixels from the window's. */
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
};

/** How close to the edge of the window a menu may come, in pixels. */
const EDGE = 8;

/**
 * A short menu of things to do with one row. A row opens it from its "more"
 * button or with a right click.
 *
 * It is a native popover, which the browser draws above everything else on
 * the page, whatever it is inside. Closing it is done here: on a choice, on
 * Escape, and when anything outside it is pressed or scrolled.
 */
export function Menu({ label, x, y, items, onClose }: MenuProps) {
  const menu = useRef<HTMLDivElement>(null);
  // Whatever had keyboard focus when the menu opened, to give it back.
  const opener = useRef<Element | null>(null);

  // Before the browser draws: show it, move it if it would go over the edge
  // of the window, and put keyboard focus on its first choice.
  useLayoutEffect(() => {
    const element = menu.current;
    if (!element) return;
    // A popover is shown by calling it, like a dialog.
    if (!element.matches(":popover-open")) element.showPopover();

    const { width, height } = element.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - width - EDGE);
    const top = Math.min(y, window.innerHeight - height - EDGE);
    element.style.left = `${Math.max(EDGE, left)}px`;
    element.style.top = `${Math.max(EDGE, top)}px`;

    // In development React runs this twice. The second time, focus is
    // already inside the menu, and that is not what opened it.
    if (!element.contains(document.activeElement)) {
      opener.current = document.activeElement;
    }
    choices(element)[0]?.focus();
  }, [x, y]);

  useEffect(() => {
    function pressedOutside(event: PointerEvent) {
      const pressed = event.target as Element;
      if (menu.current?.contains(pressed)) return;
      // The button that opened the menu closes it by itself.
      if (pressed.closest('[aria-haspopup="menu"][aria-expanded="true"]')) return;
      onClose();
    }

    const listening = new AbortController();
    const { signal } = listening;
    document.addEventListener("pointerdown", pressedOutside, { signal });
    // The menu does not move with the row it is about, so it must not stay.
    document.addEventListener("scroll", onClose, { signal, capture: true });
    window.addEventListener("resize", onClose, { signal });
    // A press inside the preview's frame never reaches this page.
    window.addEventListener("blur", onClose, { signal });
    return () => listening.abort();
  }, [onClose]);

  /** Closes the menu from the keyboard, and gives focus back. */
  function closeAndReturn() {
    onClose();
    if (opener.current instanceof HTMLElement) opener.current.focus();
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    const all = choices(event.currentTarget);
    const index = all.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === "ArrowDown") all[(index + 1) % all.length]?.focus();
    else if (event.key === "ArrowUp") all[(index - 1 + all.length) % all.length]?.focus();
    else if (event.key === "Home") all[0]?.focus();
    else if (event.key === "End") all.at(-1)?.focus();
    else if (event.key === "Escape" || event.key === "Tab") closeAndReturn();
    else return;

    event.preventDefault();
  }

  return (
    <div
      ref={menu}
      className={styles.menu}
      popover="manual"
      role="menu"
      aria-label={label}
      onKeyDown={handleKey}
      // A right click on the menu itself does nothing.
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item, index) =>
        item === "line" ? (
          <div key={index} className={styles.line} role="separator" />
        ) : (
          <button
            key={index}
            type="button"
            className={styles.item}
            role="menuitem"
            aria-disabled={item.disabled || undefined}
            onClick={() => {
              if (item.disabled) return;
              closeAndReturn();
              item.onChoose();
            }}
          >
            {item.label}
            {item.keys && <kbd className={styles.keys}>{item.keys}</kbd>}
          </button>
        ),
      )}
    </div>
  );
}

/** The choices of a menu that can be made, in order. */
function choices(menu: HTMLElement): HTMLButtonElement[] {
  return [...menu.querySelectorAll<HTMLButtonElement>('button:not([aria-disabled="true"])')];
}
