import { NextResponse, type NextRequest } from "next/server";

/**
 * Decides from the hostname alone whether a request is for the manager or for
 * a public site.
 *
 *   localhost:3000/sites/ironbarks    the manager, passed through untouched
 *   ironbarks.localhost:3000/squad    served by /s/ironbarks.localhost/squad
 *
 * The rewrite is internal: the visitor's address bar keeps the site's own
 * address. Nothing is looked up here. The route this points at finds the site
 * by hostname and answers 404 if no site owns it.
 */
export function proxy(request: NextRequest) {
  const managerHosts = (
    process.env.MANAGER_HOSTS ?? "localhost,127.0.0.1"
  ).split(",");
  const hostname = (request.headers.get("host") ?? "")
    .replace(/:\d+$/, "")
    .toLowerCase();

  if (managerHosts.includes(hostname)) return NextResponse.next();

  // The hostname becomes part of a path, so refuse anything that is not
  // plainly a hostname (letters, digits, dots and hyphens).
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(hostname)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = request.nextUrl.clone();
  url.pathname = `/s/${hostname}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Leave Next.js internals and files with an extension (images, icons) alone.
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
