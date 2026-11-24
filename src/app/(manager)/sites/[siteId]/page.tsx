import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listPages } from "@/db/pages";
import { getSite } from "@/db/sites";
import { CreatePageForm } from "@/manager/CreatePageForm";
import { Icon } from "@/manager/Icon";
import { ImportPageForm } from "@/manager/ImportPageForm";
import { getSiteOrigin } from "@/manager/site-origin";
import { SiteMark } from "@/manager/SiteMark";

type Props = PageProps<"/sites/[siteId]">;

const updatedFormat = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteId } = await params;
  const site = await getSite(siteId);
  return { title: site ? site.name : "Site not found" };
}

/** One site: its pages, and two ways to add another: a form, or a JSON file. */
export default async function SitePagesPage({ params }: Props) {
  const { siteId } = await params;
  const site = await getSite(siteId);
  if (!site) notFound();

  const [pages, origin] = await Promise.all([
    listPages(site.id),
    getSiteOrigin(site),
  ]);

  return (
    <main className="page">
      <div className="page-header">
        <div className="page-heading">
          <nav aria-label="Breadcrumb">
            <ol className="breadcrumbs">
              <li>
                <Link href="/">Sites</Link>
              </li>
            </ol>
          </nav>
          <h1 className="site-title">
            <SiteMark colors={site.theme.colors} />
            {site.name}
          </h1>
        </div>
        <a className="button" href={origin} target="_blank" rel="noreferrer">
          View site
          <span className="visually-hidden"> in a new tab</span>
          <Icon name="open" />
        </a>
      </div>

      <section aria-labelledby="pages-heading">
        <h2 id="pages-heading" className="section-heading">
          Pages
        </h2>
        {pages.length === 0 ? (
          <p className="empty">
            This site has no pages yet. Create or import the first one below.
          </p>
        ) : (
          <ul className="rows">
            {pages.map((page) => (
              <li key={page.id} className="row">
                <div className="row-main">
                  <h3 className="row-title">
                    {/* The whole row is this link: see .row-link in manager.css. */}
                    <Link
                      className="row-link"
                      href={`/sites/${site.id}/pages/${page.id}`}
                    >
                      {page.title}
                      <span className="visually-hidden">: edit page</span>
                    </Link>
                  </h3>
                  <p className="muted">{page.path}</p>
                </div>

                <p className="row-meta">
                  Saved {updatedFormat.format(page.updatedAt)}
                </p>

                <a
                  className="row-action"
                  href={`${origin}${page.path}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View page
                  <span className="visually-hidden"> {page.title} in a new tab</span>
                  <Icon name="open" size={14} />
                </a>

                <span className="row-chevron">
                  <Icon name="next" />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CreatePageForm siteId={site.id} />
      <ImportPageForm siteId={site.id} />
    </main>
  );
}
