"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { pageTree, type PageLink, type PageNode } from "@/page-model/page-tree";
import { UnsavedMark, useDrafts } from "./Drafts";
import { Icon } from "./Icon";
import styles from "./PageList.module.css";
import { RenameInput } from "./RenameInput";
import { atDepth } from "./tree-depth";

type PageListProps = {
  siteId: string;
  /** Every page of the site. */
  pages: PageLink[];
  /** The page that is open in the editor. */
  currentId: string;
  /**
   * The open page's title was typed over in its row. `typed` is the new
   * title, or null if that was given up. Like any edit to the open page, it
   * is the editor's to keep until "Save page".
   */
  onRename: (typed: string | null) => void;
};

/** The HTML id of the open page's row, for putting focus back on it. */
const currentRowId = "current-page-row";

/**
 * The site's pages beside the editor, to move from one to another.
 *
 * A page is shown under the page its path starts with, so the list has the
 * same shape as the site's addresses. Unsaved changes are kept when the
 * editor moves on (see Drafts.tsx), so no question is asked first.
 *
 * The open page can be renamed here: double-click its row, or press F2.
 */
export function PageList({ siteId, pages, currentId, onRename }: PageListProps) {
  // Whether the open page's title is being typed over.
  const [renaming, setRenaming] = useState(false);

  return (
    <nav className={styles.pages} aria-labelledby="pages-heading">
      <div className={styles.heading}>
        <h2 id="pages-heading" className="section-heading">
          Pages
        </h2>
        <Link
          className="icon-button"
          // Lands in the first input of the form that creates a page.
          href={`/sites/${siteId}#new-page-title`}
          aria-label="New page"
          title="New page"
        >
          <Icon name="add" />
        </Link>
      </div>

      <div className={styles.list}>
        <Level
          nodes={pageTree(pages)}
          parentPath=""
          depth={0}
          siteId={siteId}
          currentId={currentId}
          renaming={renaming}
          startRename={() => setRenaming(true)}
          endRename={(typed) => {
            setRenaming(false);
            onRename(typed);
          }}
        />
      </div>
    </nav>
  );
}

type LevelProps = {
  nodes: PageNode<PageLink>[];
  /** The path of the page these are under, or "" at the top. */
  parentPath: string;
  /** How many steps in from the edge to draw these. */
  depth: number;
  siteId: string;
  currentId: string;
  renaming: boolean;
  startRename: () => void;
  endRename: (typed: string | null) => void;
};

function Level(props: LevelProps) {
  const { nodes, parentPath, depth, siteId, currentId } = props;
  const { drafts } = useDrafts();

  // The list is as tall as a few pages and scrolls beyond that. Opening a page
  // draws the editor afresh, so bring the page that is open back into view.
  const current = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    current.current?.scrollIntoView({ block: "nearest" });
  }, []);

  return (
    <ul className={styles.level}>
      {nodes.map(({ page, children }) => {
        const isCurrent = page.id === currentId;
        // A page's title changes here as it is typed.
        const title = drafts[page.id]?.title.trim() ?? page.title;

        return (
          <li key={page.id}>
            {isCurrent && props.renaming && (
              <div
                className={`tree-row ${styles.page}`}
                style={atDepth(depth)}
                aria-current="page"
              >
                <Icon name="page" />
                <RenameInput
                  value={title}
                  label="Page title"
                  rowId={currentRowId}
                  onDone={props.endRename}
                />
              </div>
            )}
            <Link
              ref={isCurrent ? current : undefined}
              id={isCurrent ? currentRowId : undefined}
              className={`tree-row ${styles.page}`}
              style={atDepth(depth)}
              // Out of sight while its title is typed over, in the same place.
              hidden={isCurrent && props.renaming}
              href={`/sites/${siteId}/pages/${page.id}`}
              aria-current={isCurrent ? "page" : undefined}
              // Only the open page: any other row opens its page on a click.
              onDoubleClick={isCurrent ? props.startRename : undefined}
              onKeyDown={(event) => {
                if (isCurrent && event.key === "F2") props.startRename();
              }}
            >
              <Icon name="page" />
              <span className="tree-text">
                <span className="tree-label">{title || "Untitled page"}</span>{" "}
                {/* Under /squad, "/squad/juniors" needs only "/juniors". */}
                <span className="tree-note">{page.path.slice(parentPath.length)}</span>{" "}
                <UnsavedMark pageId={page.id} />
              </span>
            </Link>

            {children.length > 0 && (
              <div className="tree-children" style={atDepth(depth)}>
                <Level
                  {...props}
                  nodes={children}
                  parentPath={page.path}
                  depth={depth + 1}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
