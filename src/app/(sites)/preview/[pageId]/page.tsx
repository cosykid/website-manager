import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PreviewCanvas } from "@/renderer/preview/PreviewCanvas";
import { findPreviewPage } from "./find-page";

type Props = PageProps<"/preview/[pageId]">;

// Start from the latest save each time the editor opens.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pageId } = await params;
  const found = await findPreviewPage(pageId);

  return {
    title: found ? `Preview of ${found.page.title}` : "Page not found",
    // A working view for editors, not a page for search engines.
    robots: { index: false, follow: false },
  };
}

/**
 * The page the editor shows in its preview frame.
 *
 * It belongs to the renderer's half of the app: it draws a site's page with
 * the site's own components and theme. The editor reaches it only by its
 * address, on the manager's hostname (localhost:3000/preview/...). On a
 * site's hostname the same address means a page with that path, because
 * src/proxy.ts sends every request there to the public route.
 */
export default async function PreviewPage({ params }: Props) {
  const { pageId } = await params;
  const found = await findPreviewPage(pageId);
  if (!found) notFound();

  return <PreviewCanvas initialContent={found.page.content} />;
}
