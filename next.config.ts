import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components stays off on purpose. With it on, a page that only finds
  // out at request time that it does not exist is streamed with a 200 status,
  // and public pages here must answer unknown paths with a real 404.
  cacheComponents: false,

  // Keep rendered pages in Redis, not on this server's disk or in its memory,
  // so that every server shares them and a save replaces them for all.
  cacheHandler: path.resolve("src/cache/page-cache.mts"),
  cacheMaxMemorySize: 0,

  experimental: {
    // An image is uploaded through a server action. This is the largest one
    // that is stored (MAX_IMAGE_BYTES in src/images/image-file.ts), and room
    // for what a form adds around it. The default is 1 MB.
    serverActions: { bodySizeLimit: "4.2mb" },
  },

  // Hides the round Next.js badge shown in a corner during development. The
  // editor's preview is a second page in a frame, so the badge would also
  // appear inside the picture of the site. Errors are still reported.
  devIndicators: false,
};

export default nextConfig;
