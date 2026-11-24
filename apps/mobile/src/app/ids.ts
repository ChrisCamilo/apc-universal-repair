// The ids the phone gives what it makes away from the server, as the server takes them (see @apc/domain/sync-queue): a
// new item, its brands, a photo and each change queued. They are random UUIDs (version 4); Hermes has no crypto, and an
// id isn't a secret, so Math.random draws them, and the server refuses one already taken.

/**
 * Makes a new random UUID.
 * @returns E.g. "3f2c9a4e-8b1d-4c6f-a2e7-5d9b0c1f4a83".
 */
export function newId(): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
  hex[12] = '4';
  // The variant: 8, 9, a or b.
  hex[16] = '89ab'[Math.floor(Math.random() * 4)];
  const text = hex.join('');
  return `${text.slice(0, 8)}-${text.slice(8, 12)}-${text.slice(12, 16)}-${text.slice(16, 20)}-${text.slice(20)}`;
}
