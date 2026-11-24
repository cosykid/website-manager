import { createHash } from "node:crypto";
import { Binary } from "mongodb";
import type { ImageType } from "@/images/image-file";
import { imagesCollection } from "./collections";

/**
 * Stores an image and answers with its id.
 *
 * The id is worked out from the bytes. So a picture that is uploaded twice is
 * stored once, and an id can never come to mean a different picture. 32
 * characters of the hash are more than enough to keep any two apart.
 */
export async function saveImage(bytes: Uint8Array, type: ImageType): Promise<string> {
  const id = createHash("sha256").update(bytes).digest("hex").slice(0, 32);

  const images = await imagesCollection();
  await images.updateOne(
    { _id: id },
    { $setOnInsert: { type, bytes: new Binary(bytes), uploadedAt: new Date() } },
    { upsert: true },
  );
  return id;
}

export async function getImage(
  id: string,
): Promise<{ type: ImageType; bytes: Uint8Array } | null> {
  const images = await imagesCollection();
  const record = await images.findOne({ _id: id });
  return record ? { type: record.type, bytes: record.bytes.buffer } : null;
}
