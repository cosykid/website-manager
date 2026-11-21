import { MongoServerError, ObjectId } from "mongodb";
import { cache } from "react";
import type { ComponentInstance, Page } from "@/page-model/types";
import { pagesCollection, type PageRecord } from "./collections";

function toPage({ _id, createdAt: _createdAt, ...rest }: PageRecord): Page {
  return { id: _id.toString(), ...rest };
}

/** MongoDB's error when a write would break a unique index. */
function isDuplicateKey(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

export async function listPages(siteId: string): Promise<Page[]> {
  const records = await pagesCollection()
    .find({ siteId })
    .sort({ path: 1 })
    .toArray();
  return records.map(toPage);
}

export async function getPage(id: string): Promise<Page | null> {
  if (!ObjectId.isValid(id)) return null;
  const record = await pagesCollection().findOne({ _id: new ObjectId(id) });
  return record ? toPage(record) : null;
}

/**
 * The lookup behind every public page: one site, one path. Cached for the
 * length of a request because the page and its metadata both need it.
 */
export const getPageByPath = cache(
  async (siteId: string, path: string): Promise<Page | null> => {
    const record = await pagesCollection().findOne({ siteId, path });
    return record ? toPage(record) : null;
  },
);

/** Creates an empty page. The unique index decides whether the path is free. */
export async function createPage(
  siteId: string,
  title: string,
  path: string,
): Promise<{ id: string } | "path-taken"> {
  const now = new Date();
  try {
    const result = await pagesCollection().insertOne({
      _id: new ObjectId(),
      schemaVersion: 1,
      siteId,
      path,
      title,
      content: [],
      createdAt: now,
      updatedAt: now,
    });
    return { id: result.insertedId.toString() };
  } catch (error) {
    if (isDuplicateKey(error)) return "path-taken";
    throw error;
  }
}

/** Saves a page as a whole, so a page is never left half updated. */
export async function savePage(
  id: string,
  changes: { title: string; path: string; content: ComponentInstance[] },
): Promise<"saved" | "path-taken" | "not-found"> {
  if (!ObjectId.isValid(id)) return "not-found";
  try {
    const result = await pagesCollection().updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...changes, updatedAt: new Date() } },
    );
    return result.matchedCount === 1 ? "saved" : "not-found";
  } catch (error) {
    if (isDuplicateKey(error)) return "path-taken";
    throw error;
  }
}
