// Serves the GitHub Pages site the Pages workflow puts together, as Pages does, for the demo's end-to-end tests
// (playwright.demo.config.ts): under /apc-universal-repair/, a file of the site, a folder's index.html, or else the
// site's 404.html with status 404, which is how a reload of one of the demo's routes reaches the demo.
// Usage: node scripts/serve-pages.mjs <site folder> <port>.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const BASE = "/apc-universal-repair/";
const TYPES = {
  ".css": "text/css",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const [site, port] = process.argv.slice(2);
const root = path.resolve(site);

/**
 * Finds the file a path of the site stands for: the file, or the folder's index.html.
 * @param pathname The request's path, e.g. "/apc-universal-repair/demo/".
 * @returns The file's path, or undefined when the site has none.
 */
async function fileOf(pathname) {
  if (!pathname.startsWith(BASE)) {
    return undefined;
  }
  const wanted = path.join(root, decodeURIComponent(pathname.slice(BASE.length)));
  if (!wanted.startsWith(root)) {
    return undefined;
  }
  const found = await stat(wanted).catch(() => null);
  if (found?.isDirectory()) {
    return (await stat(path.join(wanted, "index.html")).catch(() => null)) ? path.join(wanted, "index.html") : undefined;
  }
  return found?.isFile() ? wanted : undefined;
}

createServer(async (request, response) => {
  const file = await fileOf(new URL(request.url, "http://localhost").pathname);
  const served = file ?? path.join(root, "404.html");
  response.writeHead(file ? 200 : 404, { "content-type": TYPES[path.extname(served)] ?? "application/octet-stream" });
  response.end(await readFile(served));
}).listen(Number(port), () => console.log(`Serving ${root} at http://localhost:${port}${BASE}`));
