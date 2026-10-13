// Where the desktop app finds the API and, when the API runs on this computer, the folder it starts it from. Both
// come from, in order: an environment variable, config.json in the app's userData folder, then the default. The API
// address defaults to this computer; the API folder defaults to the apps/api of the clone the app was built from,
// which the build writes into dist/build-info.json, so an installer built on the computer at home finds it by itself.

/** The API address when nothing sets another: the API of #154 on this computer. */
export const DEFAULT_API_URL = "http://localhost:3333";

/** What config.json in the userData folder may set, e.g. `{ "apiUrl": "http://192.168.0.10:3333" }`. */
export type DesktopConfig = { apiUrl?: string; apiDir?: string };

/** Host names that point at this computer. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Tells whether the API runs on this computer, the only case where the app starts it.
 * @param apiUrl The resolved API address.
 * @returns True for localhost, 127.0.0.1 and ::1.
 */
export function isLocalApi(apiUrl: string): boolean {
  return LOCAL_HOSTS.has(new URL(apiUrl).hostname);
}

/**
 * Reads config.json's text, ignoring a file that isn't a JSON object.
 * @param text The file's text, or undefined when there is no file.
 * @returns The settings it holds.
 */
export function parseConfig(text: string | undefined): DesktopConfig {
  if (!text) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? (parsed as DesktopConfig) : {};
  } catch {
    return {};
  }
}

/**
 * Picks the API address: APC_API_URL, then config.json's apiUrl, then the default. An address that isn't http or
 * https is skipped. The trailing slash is dropped, so paths join on it.
 * @param envUrl APC_API_URL.
 * @param config What config.json sets.
 * @returns The API address, e.g. "http://192.168.0.10:3333".
 */
export function resolveApiUrl(envUrl: string | undefined, config: DesktopConfig): string {
  for (const candidate of [envUrl, config.apiUrl]) {
    if (!candidate) {
      continue;
    }
    try {
      const url = new URL(candidate);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.href.replace(/\/+$/, "");
      }
    } catch {
      // Not an address: try the next one.
    }
  }
  return DEFAULT_API_URL;
}
