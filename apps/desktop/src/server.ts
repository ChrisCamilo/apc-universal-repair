// Asks a server whether it is up, through GET /health: before the app starts the server it ships (see
// serverSettings.ts), so one already on the port is used as it is, and while it starts, until it answers. /health
// also gives the server's version, which a server on another computer is warned about (see update.ts).

/** How often to ask a starting API whether it is up. */
const POLL_MS = 1_000;
/** How long to wait for a starting API before opening the app anyway: the first start migrates. */
const START_TIMEOUT_MS = 90_000;

/** What GET /health answers: the API's version, absent on an API before 0.2.0. */
export type ApiHealth = { version?: string };

/**
 * Tells whether the API answers GET /health.
 * @param apiUrl The API address.
 * @returns True when it answers with a success.
 */
export async function apiAnswers(apiUrl: string): Promise<boolean> {
  return (await readHealth(apiUrl)) !== null;
}

/**
 * Asks the API's GET /health.
 * @param apiUrl The API address.
 * @returns What it answers, or null when it doesn't answer with a success.
 */
export async function readHealth(apiUrl: string): Promise<ApiHealth | null> {
  try {
    const response = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(3_000) });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json().catch(() => ({}))) as { version?: unknown };
    return typeof body.version === "string" ? { version: body.version } : {};
  } catch {
    return null;
  }
}

/**
 * Waits for a starting API to answer.
 * @param apiUrl The API address.
 * @returns True once it answers, false after START_TIMEOUT_MS.
 */
export async function waitForApi(apiUrl: string): Promise<boolean> {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await apiAnswers(apiUrl)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  return false;
}
