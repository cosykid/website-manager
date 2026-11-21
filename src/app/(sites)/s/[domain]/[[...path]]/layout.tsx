import { getSiteByDomain } from "@/db/sites";
import { pathFromSegments } from "@/renderer/path";
import { SiteFooter, SiteHeader } from "@/renderer/SiteChrome";
import "@/renderer/site.css";
import { themeToCssVariables } from "@/site/theme-css";

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
    <html lang="en">
      <body style={themeToCssVariables(site.theme)}>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <SiteHeader site={site} currentPath={pathFromSegments(path)} />
        <main id="content">{children}</main>
        <SiteFooter site={site} />
      </body>
    </html>
  );
}
