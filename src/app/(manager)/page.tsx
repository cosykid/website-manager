import Link from "next/link";
import { countPagesBySite } from "@/db/pages";
import { listSites } from "@/db/sites";
import { Icon } from "@/manager/Icon";
import { getSiteOrigin } from "@/manager/site-origin";
import { SiteMark } from "@/manager/SiteMark";

/** The manager's first screen: every site, and a way into its pages. */
export default async function SitesPage() {
  const [sites, pageCounts] = await Promise.all([
    listSites(),
    countPagesBySite(),
  ]);
  const origins = await Promise.all(sites.map(getSiteOrigin));

  return (
    <main className="page">
      <div className="page-heading">
        <h1>Sites</h1>
        <p className="muted">Choose a site to edit its pages.</p>
      </div>

      {sites.length === 0 ? (
        <p className="empty">
          There are no sites yet. Run <code>npm run seed</code> to add the two
          demo sites.
        </p>
      ) : (
        <ul className="rows">
          {sites.map((site, index) => {
            const count = pageCounts[site.id] ?? 0;
            return (
              <li key={site.id} className="row">
                <SiteMark colors={site.theme.colors} />

                <div className="row-main">
                  <h2 className="row-title">
                    {/* The whole row is this link: see .row-link in manager.css. */}
                    <Link className="row-link" href={`/sites/${site.id}`}>
                      {site.name}
                      <span className="visually-hidden">: manage pages</span>
                    </Link>
                  </h2>
                  <p className="muted">{site.domains[0]}</p>
                </div>

                <p className="row-meta">
                  {count} {count === 1 ? "page" : "pages"}
                </p>

                <a
                  className="row-action"
                  href={origins[index]}
                  target="_blank"
                  rel="noreferrer"
                >
                  View site
                  <span className="visually-hidden"> {site.name} in a new tab</span>
                  <Icon name="open" size={14} />
                </a>

                <span className="row-chevron">
                  <Icon name="next" />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
