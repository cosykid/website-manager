import type { Site } from "@/site/types";
import styles from "./SiteChrome.module.css";

type SiteHeaderProps = {
  site: Site;
  /** The path being viewed, so the matching link can be marked as current. */
  currentPath: string;
};

/**
 * The site's name and navigation.
 *
 * Links on public sites are plain <a> elements, not next/link: every click is
 * an ordinary page load on the site's own hostname, so an unknown address is
 * always answered by the server with a real 404.
 */
export function SiteHeader({ site, currentPath }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className={styles.siteName} href="/">
          {site.name}
        </a>

        <nav aria-label="Main">
          <ul className={styles.navList} role="list">
            {site.navigation.map((item) => (
              <li key={item.href}>
                <a
                  className={styles.navLink}
                  href={item.href}
                  aria-current={item.href === currentPath ? "page" : undefined}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ site }: { site: Site }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <p className={styles.footerName}>{site.name}</p>
        <p>A demo site. Everything on it is made up.</p>
      </div>
    </footer>
  );
}
