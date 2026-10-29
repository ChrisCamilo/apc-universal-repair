import { createHash } from "node:crypto";
import { statSync } from "node:fs";
import path from "node:path";

// The web build the app:// protocol serves: which file a path asks for, with the single-page fallback, and the
// Content-Security-Policy of the HTML, which allows the inline theme boot script by its hash and nothing else inline.

/**
 * Builds the Content-Security-Policy for a page: only the app's own origin, plus the page's inline scripts by hash
 * (the theme boot script the web build writes into index.html).
 * @param html The page's HTML.
 * @returns The header's value.
 */
export function contentSecurityPolicy(html: string): string {
  const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    ([, code]) => `'sha256-${createHash("sha256").update(code).digest("base64")}'`,
  );
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(" ")}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/**
 * Finds the file of the web build a path asks for. A path with no file extension that isn't a file, such as a route
 * of the app (/inventory), gets index.html, so the router takes it; a missing file with an extension gets nothing.
 * A path that climbs out of the build folder gets nothing either.
 * @param root The web build folder (apps/web/dist).
 * @param pathname The request's path, e.g. "/assets/index-abc.js" or "/inventory".
 * @returns The file's full path, or undefined for a 404.
 */
export function staticFile(root: string, pathname: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  const file = path.join(root, path.normalize(decoded));
  if (file !== root && !file.startsWith(root + path.sep)) {
    return undefined;
  }
  if (statSync(file, { throwIfNoEntry: false })?.isFile()) {
    return file;
  }
  return path.extname(decoded) === "" ? path.join(root, "index.html") : undefined;
}
