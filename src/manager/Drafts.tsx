"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ComponentInstance } from "@/page-model/types";

/** The parts of a page that its editor can change. */
export type PageValues = {
  title: string;
  path: string;
  content: ComponentInstance[];
};

type Drafts = {
  /** Pages with changes that are not saved, by page id. */
  drafts: Record<string, PageValues>;
  keepDraft: (pageId: string, draft: PageValues) => void;
  /** Forgets a draft, unless it has been changed since `draft` was read. */
  dropDraft: (pageId: string, draft: PageValues | undefined) => void;
};

const DraftsContext = createContext<Drafts | null>(null);

/**
 * Holds the unsaved changes to every page, for as long as this tab is open.
 *
 * It is in the manager's layout, which stays in place while the screens inside
 * it come and go. So an editor can leave a page half done, work on another
 * one, use the Back button, and find the first page as they left it. Nothing
 * here reaches the server: only "Save page" does that.
 */
export function DraftsProvider({ children }: { children: ReactNode }) {
  const [drafts, setDrafts] = useState<Record<string, PageValues>>({});
  const hasDrafts = Object.keys(drafts).length > 0;

  // Closing or reloading the tab would lose them, so the browser asks first.
  useEffect(() => {
    if (!hasDrafts) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasDrafts]);

  function keepDraft(pageId: string, draft: PageValues) {
    setDrafts((all) => ({ ...all, [pageId]: draft }));
  }

  function dropDraft(pageId: string, draft: PageValues | undefined) {
    setDrafts((all) => {
      // A save can finish after a newer edit. The newer edit stays.
      if (all[pageId] !== draft) return all;
      const rest = { ...all };
      delete rest[pageId];
      return rest;
    });
  }

  return (
    <DraftsContext value={{ drafts, keepDraft, dropDraft }}>
      {children}
    </DraftsContext>
  );
}

export function useDrafts(): Drafts {
  const value = useContext(DraftsContext);
  if (!value) throw new Error("useDrafts needs a DraftsProvider around it.");
  return value;
}

/** "Unsaved", beside the name of a page whose changes are not saved. */
export function UnsavedMark({ pageId }: { pageId: string }) {
  const { drafts } = useDrafts();
  return pageId in drafts ? <span className="unsaved">Unsaved</span> : null;
}
