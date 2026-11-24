import { getSiteByDomain } from "@/db/sites";
import { pathFromSegments } from "@/renderer/path";
import { SiteDocument } from "@/renderer/SiteDocument";
import "@/renderer/site.css";

/**
 * The frame around every public page: the site's theme, header and footer.
 *
 * Visitors never see "/s/..." in their address bar. src/proxy.ts sends any
 * request on a site's hostname here, with that hostname as `domain`.
 */
export default async function SiteLayout({
  children,
  params,
}: LayoutProps<"/s/[domain]/[[...path]]">) {
  const { domain, path } = await params;
  const site = await getSiteByDomain(domain);

  // No site answers on this hostname. The page responds with a 404; this
  // gives its "not found" message a plain document to sit in.
  if (!site) {
    return (
      <html lang="en">
        <body>
          <main id="content">{children}</main>
        </body>
      </html>
    );
  }

  return (
    <SiteDocument site={site} currentPath={pathFromSegments(path)}>
      {children}
    </SiteDocument>
  );
}
