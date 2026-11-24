import { MongoServerError, ObjectId } from "mongodb";
import { cache } from "react";
import type { PageLink } from "@/page-model/page-tree";
import type { ComponentInstance, Page } from "@/page-model/types";
import { pagesCollection, type PageRecord } from "./collections";

function toPage(record: PageRecord): Page {
  return {
    id: record._id.toString(),
    schemaVersion: record.schemaVersion,
    siteId: record.siteId,
    path: record.path,
    title: record.title,
    content: record.content,
    updatedAt: record.updatedAt,
  };
}

/** MongoDB's error when a write would break a unique index. */
function isDuplicateKey(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

export async function listPages(siteId: string): Promise<Page[]> {
  const pages = await pagesCollection();
  const records = await pages.find({ siteId }).sort({ path: 1 }).toArray();
  return records.map(toPage);
}

/** A site's pages without their content, to list them beside the editor. */
export async function listPageLinks(siteId: string): Promise<PageLink[]> {
  const pages = await pagesCollection();
  const records = await pages
    .find({ siteId })
    .project<Pick<PageRecord, "_id" | "title" | "path">>({ title: 1, path: 1 })
    .toArray();
  return records.map(({ _id, title, path }) => ({ id: _id.toString(), title, path }));
}

/** Where every page of every site is, without its content. */
export async function listPageAddresses(): Promise<{ siteId: string; path: string }[]> {
  const pages = await pagesCollection();
  return pages
    .find()
    .project<{ siteId: string; path: string }>({ _id: 0, siteId: 1, path: 1 })
    .toArray();
}

/** How many pages each site has, as { siteId: count }, for the list of sites. */
export async function countPagesBySite(): Promise<Record<string, number>> {
  const pages = await pagesCollection();
  const groups = await pages
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$siteId", count: { $sum: 1 } } },
    ])
    .toArray();
  return Object.fromEntries(groups.map((group) => [group._id, group.count]));
}

export async function getPage(id: string): Promise<Page | null> {
  if (!ObjectId.isValid(id)) return null;
  const pages = await pagesCollection();
  const record = await pages.findOne({ _id: new ObjectId(id) });
  return record ? toPage(record) : null;
}

/**
 * The lookup behind every public page: one site, one path. Cached for the
 * length of a request because the page and its metadata both need it.
 */
export const getPageByPath = cache(
  async (siteId: string, path: string): Promise<Page | null> => {
    const pages = await pagesCollection();
    const record = await pages.findOne({ siteId, path });
    return record ? toPage(record) : null;
  },
);

/**
 * Creates a page: an empty one, or one with the content it is given. The
 * unique index decides whether the path is free.
 */
export async function createPage(
  siteId: string,
  title: string,
  path: string,
  content: ComponentInstance[] = [],
): Promise<{ id: string } | "path-taken"> {
  const now = new Date();
  const pages = await pagesCollection();
  try {
    const result = await pages.insertOne({
      _id: new ObjectId(),
      schemaVersion: 1,
      siteId,
      path,
      title,
      content,
      createdAt: now,
      updatedAt: now,
    });
    return { id: result.insertedId.toString() };
  } catch (error) {
    if (isDuplicateKey(error)) return "path-taken";
    throw error;
  }
}

/**
 * Saves a page as a whole, so a page is never left half updated. Answers with
 * its site and the path it had before.
 */
export async function savePage(
  id: string,
  changes: { title: string; path: string; content: ComponentInstance[] },
): Promise<{ siteId: string; previousPath: string } | "path-taken" | "not-found"> {
  if (!ObjectId.isValid(id)) return "not-found";
  const pages = await pagesCollection();
  try {
    const before = await pages.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...changes, updatedAt: new Date() } },
      { returnDocument: "before" },
    );
    if (!before) return "not-found";
    return { siteId: before.siteId, previousPath: before.path };
  } catch (error) {
    if (isDuplicateKey(error)) return "path-taken";
    throw error;
  }
}
