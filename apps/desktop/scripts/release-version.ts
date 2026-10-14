import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The version a release publishes, for the Desktop workflow: apps/desktop's, which must equal apps/api's, since the
// desktop app brings the server at home to its own version and compares it with what /health answers. Run as a script,
// it prints the version, or a GitHub Actions error and exit code 1 when the two differ.

/**
 * Picks the version a release publishes.
 * @param desktopVersion apps/desktop/package.json's version.
 * @param apiVersion apps/api/package.json's version.
 * @returns The version, e.g. "0.2.0".
 * @throws When the two differ.
 */
export function releaseVersion(desktopVersion: string, apiVersion: string): string {
  if (desktopVersion !== apiVersion) {
    throw new Error(`apps/desktop is at ${desktopVersion} and apps/api at ${apiVersion}. Raise both to the same version first.`);
  }
  return desktopVersion;
}

/**
 * Reads a package's version.
 * @param app The app's folder under apps, e.g. "api".
 * @returns Its package.json's version.
 */
function versionOf(app: string): string {
  const file = path.join(import.meta.dirname, "..", "..", app, "package.json");
  return (JSON.parse(readFileSync(file, "utf8")) as { version: string }).version;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    console.log(releaseVersion(versionOf("desktop"), versionOf("api")));
  } catch (error) {
    console.log(`::error::${(error as Error).message}`);
    process.exit(1);
  }
}
