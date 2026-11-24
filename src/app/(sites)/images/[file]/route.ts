import { getImage } from "@/db/images";
import { imageIdFromFileName } from "@/images/image-file";

/**
 * Serves an uploaded image, on every site and in the manager:
 * "/images/9f86d0….jpg".
 *
 * src/proxy.ts leaves addresses with a dot in them alone, so a request gets
 * here whichever hostname it came in on. No page can have an address like it,
 * because a page's path has no dots.
 */
export async function GET(_request: Request, { params }: RouteContext<"/images/[file]">) {
  const { file } = await params;

  const id = imageIdFromFileName(file);
  const image = id ? await getImage(id) : null;
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.type,
      // An address always means the same picture, so a browser that has it
      // never needs to ask again.
      "Cache-Control": "public, max-age=31536000, immutable",
      // Whatever the bytes look like, they are only ever an image.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
