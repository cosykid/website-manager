/**
 * The address of the route that serves a public page, for example
 * "/s/ironbarks.localhost/squad". Visitors never see it: src/proxy.ts rewrites
 * their request to it. Inside the app it is the name a page is stored under.
 */
export function publicRoute(domain: string, path: string): string {
  return `/s/${domain}${path === "/" ? "" : path}`;
}
