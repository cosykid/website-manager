import { SiteDocument } from "@/renderer/SiteDocument";
import "@/renderer/site.css";
import { findPreviewPage } from "./find-page";

/**
 * The frame around a preview: the same document as the site's public pages,
 * with its theme, header and footer.
 */
export default async function PreviewLayout({
  children,
  params,
}: LayoutProps<"/preview/[pageId]">) {
  const { pageId } = await params;
  const found = await findPreviewPage(pageId);

  // No such page. The page below responds with a 404; this gives its
  // "not found" message a plain document to sit in.
  if (!found) {
    return (
      <html lang="en">
        <body>
          <main id="content">{children}</main>
        </body>
      </html>
    );
  }

  return (
    <SiteDocument site={found.site} currentPath={found.page.path}>
      {children}
    </SiteDocument>
  );
}
