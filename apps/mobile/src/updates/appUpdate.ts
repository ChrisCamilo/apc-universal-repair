// The phone app's updates. It is installed from an APK, outside the Play Store, so Android doesn't update it by itself:
// the app asks GitHub for the latest release, and when its version is newer than the one installed and the release
// carries the APK of that version (apc-universal-repair-<version>.apk, which the Desktop workflow attaches), it offers
// to install it. "Agora não" puts it off for that version until the next day. These are the rules; UpdatePrompt.tsx
// checks and asks.

/** The latest release, from GitHub's API. */
export const LATEST_RELEASE_URL = 'https://api.github.com/repos/ChrisCamilo/apc-universal-repair/releases/latest';
/** Where the app keeps the version put off with "Agora não", and the day it was. */
export const DISMISSED_UPDATE_KEY = 'app-update.dismissed';

/** A version offered: its number and where its APK downloads from. */
export type AppUpdate = { version: string; url: string };
/** The version put off with "Agora não", and the day it was, as dayKey writes it. */
export type DismissedUpdate = { version: string; day: string };
/** What the app reads of a GitHub release. */
export type Release = { tag_name?: unknown; assets?: unknown };

/**
 * Names the APK a release carries.
 * @param version The release's version, e.g. "0.6.9".
 * @returns E.g. "apc-universal-repair-0.6.9.apk".
 */
export function apkName(version: string): string {
  return `apc-universal-repair-${version}.apk`;
}

/**
 * Writes a day as the app keeps it, in the phone's time zone.
 * @param date A moment of the day.
 * @returns E.g. "2026-11-04".
 */
export function dayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Tells whether a version is newer than another, part by part.
 * @param candidate The version that may be newer, e.g. "0.6.10" or "v0.6.10".
 * @param installed The version installed, e.g. "0.6.9".
 * @returns True when candidate is newer; false when it is the same, older, or either isn't major.minor.patch.
 */
export function isNewer(candidate: string, installed: string): boolean {
  const next = versionParts(candidate);
  const current = versionParts(installed);
  if (!next || !current) {
    return false;
  }
  const changed = next.findIndex((part, index) => part !== current[index]);
  return changed >= 0 && next[changed] > current[changed];
}

/**
 * Reads the update a release offers.
 * @param release The latest release, as GitHub's API answers it.
 * @param installed The version installed.
 * @returns Its version and its APK's address, or null when it isn't newer, is malformed or carries no APK of its
 * version.
 */
export function releaseUpdate(release: Release, installed: string): AppUpdate | null {
  if (typeof release.tag_name !== 'string' || !Array.isArray(release.assets)) {
    return null;
  }
  const version = release.tag_name.replace(/^v/, '');
  if (!isNewer(version, installed)) {
    return null;
  }
  const apk = release.assets.find((asset) => asset?.name === apkName(version));
  return typeof apk?.browser_download_url === 'string' ? { version, url: apk.browser_download_url } : null;
}

/**
 * Tells whether to offer an update, unless it was put off with "Agora não" the same day.
 * @param update The version offered.
 * @param dismissed The version put off and its day, if any.
 * @param today Today, as dayKey writes it.
 * @returns True unless that same version was put off today.
 */
export function shouldOffer(update: AppUpdate, dismissed: DismissedUpdate | null, today: string): boolean {
  return !dismissed || dismissed.version !== update.version || dismissed.day !== today;
}

/**
 * Reads a version's parts.
 * @param version E.g. "0.6.9" or "v0.6.9".
 * @returns The major, minor and patch numbers, or null when it isn't major.minor.patch.
 */
function versionParts(version: string): number[] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  return match ? match.slice(1).map(Number) : null;
}
