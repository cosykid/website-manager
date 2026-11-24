import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageByPath } from "@/db/pages";
import { getSiteByDomain } from "@/db/sites";
import { pathFromSegments } from "@/renderer/path";
import { RenderTree } from "@/renderer/RenderTree";

type Props = PageProps<"/s/[domain]/[[...path]]">;

// Pages are rendered once and stored (see src/cache), not on every request. A
// save in the manager has its page rendered again straight away. The hour is
// for a change made some other way, such as by hand in MongoDB.
export const dynamic = "force-static";
export const revalidate = 3600;

/** A public page is found by two things: the site's hostname and the path. */
async function findPage(params: Props["params"]) {
  const { domain, path } = await params;

  const site = await getSiteByDomain(domain);
  if (!site) return null;

  const page = await getPageByPath(site.id, pathFromSegments(path));
  return page ? { site, page } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await findPage(params);
  if (!found) return { title: "Page not found" };
  return { title: `${found.page.title} | ${found.site.name}` };
}

export default async function SitePage({ params }: Props) {
  const found = await findPage(params);

  // This runs before any of the response has been sent, so the visitor gets a
  // real HTTP 404. (Do not add a loading.tsx or <Suspense> above this: once a
  // response has started streaming its status can no longer change.)
  if (!found) notFound();

  return (
    <>
      {/* Every page has exactly one h1. Components start at h2. */}
      <h1 className="visually-hidden">{found.page.title}</h1>
      <RenderTree nodes={found.page.content} />
    </>
  );
}
