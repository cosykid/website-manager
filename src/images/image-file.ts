/**
 * Uploaded images: which files are taken, and the address each one gets.
 *
 * The browser uses this before it uploads a file, the server before it stores
 * one, and the image route when it is asked for one. So there is no React and
 * no database in here.
 */

/** The kinds of image that can be uploaded, and the ending of their addresses. */
export const imageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

export type ImageType = keyof typeof imageTypes;

/**
 * The largest image that is stored. MongoDB holds up to 16 MB in one document,
 * and next.config.ts lets a request of this size through.
 */
export const MAX_IMAGE_BYTES = 4_000_000;

export const IMAGE_TOO_LARGE =
  "That image is larger than 4 MB. Save a smaller copy of it and upload that.";

export const NOT_AN_IMAGE = "Choose a JPEG, PNG, WebP or GIF image.";

/**
 * What kind of image a file is, read from its first few bytes.
 *
 * Every image format starts with bytes of its own. The file's name, and the
 * type the browser gives it, only say what it claims to be.
 *
 * SVG is left out on purpose. An SVG is a document that can hold scripts, which
 * would run on the site's own address if someone opened it there.
 */
export function readImageType(bytes: Uint8Array): ImageType | null {
  // One character for each byte, so that they can be compared as text.
  const start = String.fromCharCode(...bytes.subarray(0, 12));

  if (start.startsWith("\xff\xd8\xff")) return "image/jpeg";
  if (start.startsWith("\x89PNG\r\n\x1a\n")) return "image/png";
  if (start.startsWith("GIF87a") || start.startsWith("GIF89a")) return "image/gif";
  // Four bytes between the two words say how long the file is.
  if (start.startsWith("RIFF") && start.endsWith("WEBP")) return "image/webp";
  return null;
}

/** Where an uploaded image is found, on every site: "/images/9f86d0….jpg". */
export function imageAddress(id: string, type: ImageType): string {
  return `/images/${id}.${imageTypes[type]}`;
}

/** The id in the last part of such an address, or null if it has none. */
export function imageIdFromFileName(fileName: string): string | null {
  return /^([0-9a-f]{32})\.[a-z]+$/.exec(fileName)?.[1] ?? null;
}
