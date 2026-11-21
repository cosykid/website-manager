import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components stays off on purpose. With it on, a page that only finds
  // out at request time that it does not exist is streamed with a 200 status.
  // Public pages here must answer unknown paths with a real 404 and must show
  // an editor's latest save on the next refresh, so they render per request.
  cacheComponents: false,
};

export default nextConfig;
