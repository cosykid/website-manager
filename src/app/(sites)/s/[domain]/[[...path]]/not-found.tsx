/** Shown, inside the site's own theme, when a site has no page at the path. */
export default function SitePageNotFound() {
  return (
    <div className="not-found">
      <h1>Page not found</h1>
      <p>There is no page at this address.</p>
      {/* A plain link on purpose: see the note in SiteChrome. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/">Go to the home page</a>
    </div>
  );
}
