import Link from "next/link";
import { countPagesBySite } from "@/db/pages";
import { listSites } from "@/db/sites";
import { Icon } from "@/manager/Icon";
import { getSiteOrigin } from "@/manager/site-origin";

/** The manager's first screen: every site, and a way into its pages. */
export default async function SitesPage() {
  const [sites, pageCounts] = await Promise.all([
    listSites(),
    countPagesBySite(),
  ]);
  const origins = await Promise.all(sites.map(getSiteOrigin));

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Sites</h1>
          <p className="muted">Choose a site to create and edit its pages.</p>
        </div>
      </div>

      {sites.length === 0 ? (
        <p className="panel empty">
          There are no sites yet. Run <code>npm run seed</code> to add the two
          demo sites.
        </p>
      ) : (
        <ul className="panel rows">
          {sites.map((site, index) => {
            const count = pageCounts[site.id] ?? 0;
            return (
              <li key={site.id} className="row">
                <div className="swatches" aria-hidden="true">
                  <span style={{ background: site.theme.colors.brand }} />
                  <span style={{ background: site.theme.colors.accent }} />
                  <span style={{ background: site.theme.colors.surface }} />
                </div>

                <div className="row-main">
                  <h2 className="row-title">{site.name}</h2>
                  <p className="muted">
                    <span className="data">{site.domains[0]}</span>
                    {" · "}
                    {count} {count === 1 ? "page" : "pages"}
                  </p>
                </div>

                <div className="row-actions">
                  <a
                    className="button"
                    data-variant="quiet"
                    href={origins[index]}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View site
                    <span className="visually-hidden"> {site.name} in a new tab</span>
                    <Icon name="open" />
                  </a>
                  <Link className="button" href={`/sites/${site.id}`}>
                    Manage pages
                    <span className="visually-hidden"> of {site.name}</span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
