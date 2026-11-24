import type { ReactNode } from "react";
import { themeToCssVariables } from "@/site/theme-css";
import type { Site } from "@/site/types";
import { SiteFooter, SiteHeader } from "./SiteChrome";

type SiteDocumentProps = {
  site: Site;
  /** The path being shown, so the header can mark the matching link. */
  currentPath: string;
  children: ReactNode;
};

/**
 * The document every page of a site sits in: the site's theme, its header and
 * its footer.
 *
 * The public pages and the editor's preview both use it, so a preview is
 * framed exactly as the real page is.
 */
export function SiteDocument({ site, currentPath, children }: SiteDocumentProps) {
  return (
    <html lang="en">
      <body style={themeToCssVariables(site.theme)}>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <SiteHeader site={site} currentPath={currentPath} />
        <main id="content">{children}</main>
        <SiteFooter site={site} />
      </body>
    </html>
  );
}
