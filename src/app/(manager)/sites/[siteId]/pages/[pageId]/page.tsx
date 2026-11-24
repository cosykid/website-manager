import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/db/pages";
import { getSite } from "@/db/sites";
import { definitions } from "@/library/definitions";
import { PageEditor } from "@/manager/PageEditor";
import { getSiteOrigin } from "@/manager/site-origin";

type Props = PageProps<"/sites/[siteId]/pages/[pageId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pageId } = await params;
  const page = await getPage(pageId);
  return { title: page ? `Edit ${page.title}` : "Page not found" };
}

/**
 * Loads a page and hands it to the editor.
 *
 * This is where the manager meets the component library. Definitions are
 * plain data, so they are passed to the browser as they are. The React
 * components that draw the public sites are never imported by the manager.
 */
export default async function EditPagePage({ params }: Props) {
  const { siteId, pageId } = await params;
  const [site, page] = await Promise.all([getSite(siteId), getPage(pageId)]);
  if (!site || !page || page.siteId !== site.id) notFound();

  return (
    <PageEditor
      site={{
        id: site.id,
        name: site.name,
        colors: {
          brand: site.theme.colors.brand,
          accent: site.theme.colors.accent,
          surface: site.theme.colors.surface,
        },
      }}
      siteOrigin={await getSiteOrigin(site)}
      page={{
        id: page.id,
        title: page.title,
        path: page.path,
        content: page.content,
      }}
      definitions={definitions}
    />
  );
}
