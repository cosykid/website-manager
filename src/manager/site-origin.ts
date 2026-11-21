import { headers } from "next/headers";
import type { Site } from "@/site/types";

/**
 * The public address of a site, for "View" links in the manager.
 *
 * The site's hostname comes from its document. The port and protocol are
 * copied from the request for the manager itself, so links work on
 * localhost:3000 and on a deployed manager alike.
 */
export async function getSiteOrigin(site: Site): Promise<string> {
  const requestHeaders = await headers();
  const managerHost = requestHeaders.get("host") ?? "";
  const port = managerHost.match(/:\d+$/)?.[0] ?? "";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  return `${protocol}://${site.domains[0]}${port}`;
}
