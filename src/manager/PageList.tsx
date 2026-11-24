"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { pageTree, type PageLink, type PageNode } from "@/page-model/page-tree";
import { UnsavedMark, useDrafts } from "./Drafts";
import { Icon } from "./Icon";
import styles from "./PageList.module.css";
import { atDepth } from "./tree-depth";

type PageListProps = {
  siteId: string;
  /** Every page of the site. */
  pages: PageLink[];
  /** The page that is open in the editor. */
  currentId: string;
};

/**
 * The site's pages beside the editor, to move from one to another.
 *
 * A page is shown under the page its path starts with, so the list has the
 * same shape as the site's addresses. Unsaved changes are kept when the
 * editor moves on (see Drafts.tsx), so no question is asked first.
 */
export function PageList({ siteId, pages, currentId }: PageListProps) {
  return (
    <nav className={styles.pages} aria-labelledby="pages-heading">
      <div className={styles.heading}>
        <h2 id="pages-heading" className="section-heading">
          Pages
        </h2>
        <Link
          className="icon-button"
          href={`/sites/${siteId}#new-page`}
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
            <Link
              ref={isCurrent ? current : undefined}
              className={`tree-row ${styles.page}`}
              style={atDepth(depth)}
              href={`/sites/${siteId}/pages/${page.id}`}
              aria-current={isCurrent ? "page" : undefined}
            >
              <Icon name="page" />
              <span className="tree-label">{title || "Untitled page"}</span>{" "}
              {/* Under /squad, "/squad/juniors" needs only "/juniors". */}
              <span className="tree-note">{page.path.slice(parentPath.length)}</span>{" "}
              <UnsavedMark pageId={page.id} />
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
