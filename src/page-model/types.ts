/**
 * The page format.
 *
 * A page is one JSON document: a few details about the page plus a tree of
 * component instances. Nothing in this folder knows about React, MongoDB or
 * the manager, so a page can be stored, copied between environments and
 * rendered on its own.
 */

/** A component placed on a page: which component it is and the values it was given. */
export type ComponentInstance = {
  /** Unique within the page. Lets the editor point at one instance. */
  id: string;
  /** Which component to render. Matches a definition's `type` in src/library. */
  type: string;
  /**
   * What an editor has called it, such as "Hero", to tell it from others of
   * its kind in the manager. Visitors never see it.
   */
  name?: string;
  /** The values an editor entered. Their shape is described by the definition's fields. */
  props: Record<string, unknown>;
  /** Present only on components that can hold others, such as Section. */
  children?: ComponentInstance[];
};

/** The portable document. This is the shape documented in the README. */
export type PageDocument = {
  /** Version of this format, so a future change to it can be migrated. */
  schemaVersion: 1;
  /** Which site the page belongs to. */
  siteId: string;
  /** URL path on that site, such as "/" or "/about". */
  path: string;
  title: string;
  content: ComponentInstance[];
};

/** A page as the app reads it back: the document plus what the database adds. */
export type Page = PageDocument & {
  id: string;
  updatedAt: Date;
};
