// How the phone pairs with the home server (the desktop app's own, see apps/desktop/src/server/certificate.ts): the
// server answers HTTPS with a certificate the desktop app made, and the phone trusts that certificate alone, by its
// SHA-256 fingerprint, whatever address it was made for. The Servidor dialog hands both over in a QR code holding
// apc://pair?url=<the server's address>&fp=<the fingerprint>, and shows them to type in as well. The phone keeps them
// and reaches its API there (apps/mobile/src/server). Only an https:// address pairs: a phone never sends the password
// in clear text. The link also carries an entry code (&code=), which logs the phone into the account open on the
// computer (see POST /sessions/pairing): one use, a few minutes, ENTRY_CODE_LENGTH letters and digits that don't read
// alike, shown in two groups to type in. The link is read by hand, since React Native's URL and URLSearchParams can't
// read one.

/** The letters and digits an entry code is made of: none of 0, 1, I and O, which read alike. */
export const ENTRY_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
/** How many characters an entry code has: 40 bits, out of reach of guessing within its few minutes and its limits. */
export const ENTRY_CODE_LENGTH = 8;
/** The start of the pairing link, before its query. */
export const PAIRING_LINK = "apc://pair";

/** A home server the phone pairs with: its address, e.g. "https://192.168.0.10:3000", and its certificate's fingerprint. */
export type Pairing = { url: string; fingerprint: string };
/** A pairing link as the phone reads it: the server, and the entry code when the link carries one. */
export type PairingInvite = Pairing & { entry?: string };

/** An entry code: ENTRY_CODE_LENGTH characters of ENTRY_CODE_ALPHABET. */
const ENTRY_CODE = new RegExp(`^[${ENTRY_CODE_ALPHABET}]{${ENTRY_CODE_LENGTH}}$`);
/** A certificate's fingerprint: its SHA-256, 32 bytes, in base64url without padding. */
const FINGERPRINT = /^[A-Za-z0-9_-]{43}$/;
/** How many characters the fingerprint and the entry code show in each group, to type them in. */
const GROUP = 4;

/**
 * Shows an entry code in groups, to read and type in.
 * @param code The entry code.
 * @returns E.g. "K7Q2 ZD9M".
 */
export function entryCodeGroups(code: string): string {
  return fingerprintGroups(code);
}
/** A server's address: https:// (or nothing), a name, an IPv4 or a bracketed IPv6, an optional port and slash. */
const SERVER_ADDRESS = /^(?:https:\/\/)?([A-Za-z0-9.-]+|\[[0-9A-Fa-f:.]+\])(?::(\d{1,5}))?\/?$/;

/**
 * Shows a fingerprint in groups, to read and type in.
 * @param fingerprint The fingerprint, as pairingLink takes it.
 * @returns E.g. "q1Wn 7ZbX …", groups of four split by spaces.
 */
export function fingerprintGroups(fingerprint: string): string {
  return (fingerprint.match(new RegExp(`.{1,${GROUP}}`, "g")) ?? []).join(" ");
}

/**
 * Builds the link the Servidor dialog's QR code holds.
 * @param pairing The server's address and its certificate's fingerprint, and the entry code when there is one.
 * @returns E.g. "apc://pair?url=https%3A%2F%2F192.168.0.10%3A3000&fp=q1Wn…&code=K7Q2ZD9M".
 */
export function pairingLink({ url, fingerprint, entry }: PairingInvite): string {
  const link = `${PAIRING_LINK}?url=${encodeURIComponent(url)}&fp=${encodeURIComponent(fingerprint)}`;
  return entry === undefined ? link : `${link}&code=${encodeURIComponent(entry)}`;
}

/**
 * Reads an entry code, as typed in.
 * @param typed The code, in any case, with or without spaces and hyphens.
 * @returns The code in uppercase without them, or null when it isn't one.
 */
export function readEntryCode(typed: string): string | null {
  const code = typed.replace(/[\s-]/g, "").toUpperCase();
  return ENTRY_CODE.test(code) ? code : null;
}

/**
 * Reads a certificate's fingerprint, as typed in.
 * @param code The fingerprint, with or without the spaces it shows with.
 * @returns The fingerprint without spaces, or null when it isn't 43 characters of base64url.
 */
export function readFingerprint(code: string): string | null {
  const fingerprint = code.replace(/\s/g, "");
  return FINGERPRINT.test(fingerprint) ? fingerprint : null;
}

/**
 * Reads a server's address and fingerprint, as typed in or read from a link.
 * @param address The address, as readServerAddress takes it.
 * @param code The fingerprint, as readFingerprint takes it.
 * @returns The pairing, or null when either isn't one.
 */
export function readPairing(address: string, code: string): Pairing | null {
  const url = readServerAddress(address);
  const fingerprint = readFingerprint(code);
  return url && fingerprint ? { url, fingerprint } : null;
}

/**
 * Reads the link of a QR code.
 * @param text What the code holds.
 * @returns The pairing, with the entry code when the link carries one; or null when it isn't a pairing link, or its
 * address, fingerprint or entry code isn't one.
 */
export function readPairingLink(text: string): PairingInvite | null {
  const link = text.trim();
  if (!link.startsWith(`${PAIRING_LINK}?`)) {
    return null;
  }
  const params = new Map<string, string>();
  for (const part of link.slice(PAIRING_LINK.length + 1).split("&")) {
    const [name, value = ""] = part.split("=");
    try {
      params.set(name, decodeURIComponent(value));
    } catch {
      return null;
    }
  }
  const pairing = readPairing(params.get("url") ?? "", params.get("fp") ?? "");
  const code = params.get("code");
  if (!pairing || code === undefined) {
    return pairing;
  }
  const entry = readEntryCode(code);
  return entry ? { ...pairing, entry } : null;
}

/**
 * Reads a server's address, as typed in.
 * @param address The address, with or without https:// and a final slash, e.g. "192.168.0.10:3000".
 * @returns The address as "https://<host>[:<port>]", or null when it isn't one, is http://, has a path, or its port
 * is out of range.
 */
export function readServerAddress(address: string): string | null {
  const match = SERVER_ADDRESS.exec(address.trim());
  const port = match?.[2] === undefined ? undefined : Number(match[2]);
  if (!match || (port !== undefined && (port < 1 || port > 65_535))) {
    return null;
  }
  return `https://${match[1].toLowerCase()}${port === undefined ? "" : `:${port}`}`;
}
