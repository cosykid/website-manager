"use client";

import { useEffect, useState } from "react";
import { isDraftMessage, type PreviewMessage } from "@/page-model/preview";
import type { ComponentInstance } from "@/page-model/types";
import styles from "./Preview.module.css";
import { PreviewTree } from "./PreviewTree";

/** Sends a message to the editor, which is the page this one is framed in. */
function tellEditor(message: PreviewMessage) {
  window.parent.postMessage(message, window.location.origin);
}

/**
 * The page inside the editor's preview frame.
 *
 * It starts as the saved page. After that the editor sends the page each
 * time it changes, and this draws what it is sent. Nothing here reads or
 * writes the database, so an unsaved change can never reach the public site.
 */
export function PreviewCanvas({ initialContent }: { initialContent: ComponentInstance[] }) {
  const [content, setContent] = useState(initialContent);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Take each draft the editor sends, and tell the editor when to start.
  useEffect(() => {
    function receive(event: MessageEvent) {
      // Only the editor that framed this page may change what it shows.
      const fromEditor =
        event.origin === window.location.origin && event.source === window.parent;
      if (!fromEditor || !isDraftMessage(event.data)) return;

      setContent(event.data.content);
      setSelectedId(event.data.selectedId);
    }

    window.addEventListener("message", receive);
    tellEditor({ type: "ready" });
    return () => window.removeEventListener("message", receive);
  }, []);

  // A click picks the component under it. No link in a preview goes anywhere
  // by itself. A link in the site's own menu is passed on, so that the editor
  // can open the page it leads to.
  useEffect(() => {
    function pick(event: MouseEvent) {
      event.preventDefault();
      if (!(event.target instanceof Element)) return;

      const id = event.target
        .closest("[data-instance-id]")
        ?.getAttribute("data-instance-id");
      if (id) {
        tellEditor({ type: "select", id });
        return;
      }

      const path = event.target.closest("header a")?.getAttribute("href");
      if (path) tellEditor({ type: "visit", path });
    }

    document.addEventListener("click", pick);
    return () => document.removeEventListener("click", pick);
  }, []);

  // Bring the component whose form is open into view.
  useEffect(() => {
    if (!selectedId) return;

    // The wrapper has no box of its own, so measure what it holds.
    const target = document.querySelector(
      `[data-instance-id="${CSS.escape(selectedId)}"]`,
    )?.firstElementChild;
    if (!target) return;

    const box = target.getBoundingClientRect();
    const inView = box.top >= 0 && box.bottom <= window.innerHeight;
    if (inView) return;

    // Leave a little of the page above it showing, and room for its ring.
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: window.scrollY + box.top - 24,
      behavior: calm ? "auto" : "smooth",
    });
  }, [selectedId]);

  if (content.length === 0) {
    return (
      <p className={styles.empty}>
        This page is empty. Add a component in the editor to see it here.
      </p>
    );
  }

  return <PreviewTree nodes={content} selectedId={selectedId} />;
}
