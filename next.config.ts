import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components stays off on purpose. With it on, a page that only finds
  // out at request time that it does not exist is streamed with a 200 status.
  // Public pages here must answer unknown paths with a real 404 and must show
  // an editor's latest save on the next refresh, so they render per request.
  cacheComponents: false,

  // Hides the round Next.js badge shown in a corner during development. The
  // editor's preview is a second page in a frame, so the badge would also
  // appear inside the picture of the site. Errors are still reported.
  devIndicators: false,
};

export default nextConfig;
