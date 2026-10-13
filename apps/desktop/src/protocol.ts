import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { net, protocol } from "electron";
import { contentSecurityPolicy, staticFile } from "./files.js";

// The app://apc protocol the window loads, so the web build runs as it does in the browser: one fixed origin, where
// BrowserRouter's paths and the build's absolute asset paths work and localStorage survives restarts and updates.
// It serves the web build, with index.html for the app's routes, and forwards /api/* to the configured API the way
// the Vite dev proxy does, method, headers and streamed body included, so photo uploads and the CSV import work and
// the API needs no CORS. When the API can't be reached it answers 502, which the screens show as a load error.

/** The scheme and host of the app's origin, app://apc. */
export const APP_ORIGIN = "app://apc";

/**
 * Registers app:// as a standard, secure scheme with fetch and streaming, which Electron only allows before the app
 * is ready.
 */
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
  ]);
}

/**
 * Answers app://apc requests: /api/* goes to the API, the rest to the web build.
 * @param webRoot The web build folder.
 * @param apiUrl The API address, e.g. "http://localhost:3333".
 */
export function serveApp(webRoot: string, apiUrl: string): void {
  protocol.handle("app", async (request) => {
    const url = new URL(request.url);
    if (url.host !== "apc") {
      return new Response(null, { status: 404 });
    }
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return forward(request, `${apiUrl}${url.pathname.slice("/api".length)}${url.search}`);
    }
    const file = staticFile(webRoot, url.pathname);
    if (!file) {
      return new Response(null, { status: 404 });
    }
    if (file.endsWith(".html")) {
      const html = await readFile(file, "utf8");
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": contentSecurityPolicy(html) },
      });
    }
    return net.fetch(pathToFileURL(file).toString());
  });
}

/**
 * Sends a request on to the API as it came, and its answer back.
 * @param request The page's request to app://apc/api/...
 * @param target The same request's address on the API.
 * @returns The API's answer, or a 502 when it can't be reached.
 */
async function forward(request: Request, target: string): Promise<Response> {
  try {
    return await net.fetch(target, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      // Lets the body stream through, which Node's fetch requires for a stream.
      duplex: "half",
    } as RequestInit);
  } catch (error) {
    console.error(`API unreachable at ${target}:`, error);
    return new Response(null, { status: 502 });
  }
}
