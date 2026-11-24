/** The most pixels an uploaded image keeps along its longer side. */
const MAX_SIDE = 1600;

/**
 * Makes an image small enough for a web page before it is uploaded, or answers
 * null if the file is not an image the browser can read.
 *
 * A photo straight from a camera is several megabytes and thousands of pixels
 * wide, far more than any page shows. So the browser draws it again at a size
 * that suits a page. An editor never has to resize one first.
 */
export async function shrinkImage(file: File): Promise<Blob | null> {
  const picture = await createImageBitmap(file).catch(() => null);
  if (!picture) return null;

  // Only the first frame of a moving GIF would be drawn.
  if (file.type === "image/gif") return file;

  const scale = Math.min(1, MAX_SIDE / Math.max(picture.width, picture.height));
  // A JPEG is drawn again whatever its size. A camera writes the place a photo
  // was taken into the file, and the new drawing does not have it.
  if (scale === 1 && file.type !== "image/jpeg") return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(picture.width * scale);
  canvas.height = Math.round(picture.height * scale);

  const pen = canvas.getContext("2d");
  if (!pen) return file;
  pen.imageSmoothingQuality = "high";
  pen.drawImage(picture, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => canvas.toBlob(resolve, file.type, 0.85));
}
