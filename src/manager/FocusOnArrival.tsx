"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Gives the keyboard somewhere to start after moving between screens.
 *
 * The link that was pressed goes away with the screen it was on, and keyboard
 * focus goes with it. This puts focus on whatever the address names, as in
 * "#new-page-title". Without one, it goes to the open page's link in the list
 * of pages, so that Tab carries on down the list. It belongs in the layout,
 * which stays in place from one screen to the next.
 */
export function FocusOnArrival() {
  const pathname = usePathname();
  const lastPathname = useRef(pathname);

  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;

    // With nothing focused, the browser says it is the body.
    if (document.activeElement !== document.body) return;

    const named = window.location.hash.slice(1);
    const start = named
      ? document.getElementById(named)
      : document.querySelector<HTMLElement>('nav [aria-current="page"]');
    start?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}
