// The URLs the API's stand-ins are routed by. A route is matched by a glob or a RegExp, never by a function: Playwright
// can't hand a function to the browser's side, so a page with one route matched by a function sends every request it
// makes to the test to ask whether it matches, Vite's hundreds of modules on each load included, and each load takes up
// to twice as long.

/**
 * Matches the URL of a path of the API, with or without a query.
 * @param path The path under /api, as a RegExp's source, as "/items" or "(/categories|/part-brands)/.+".
 * @returns The RegExp to route by.
 */
export function apiUrl(path: string): RegExp {
  return new RegExp(`^[a-z]+://[^/]+/api${path}(\\?.*)?$`);
}
