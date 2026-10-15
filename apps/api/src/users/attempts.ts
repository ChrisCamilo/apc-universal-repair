// Counts attempts per key, such as a username and address, in fixed windows: the first attempt opens a window of
// ATTEMPT_WINDOW_MS, and once the key reaches its limit within it, it waits until the window ends. The counts live in
// memory, as there is one server, and are lost on restart, which only lets someone start over.

/** How long a window of attempts lasts: 15 minutes, in milliseconds. */
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
/** How many keys a limiter holds before it drops the ones whose window ended. */
const SWEEP_SIZE = 1000;

/** The attempts of each key within its window. */
export type Limiter = {
  /** Counts an attempt for the key, opening a window when it has none. */
  count: (key: string) => void;
  /** Forgets the key's attempts, e.g. after a login goes through. */
  clear: (key: string) => void;
  /** How long the key must wait before another attempt, in milliseconds; 0 while it is under its limit. */
  wait: (key: string) => number;
};

/**
 * Builds a limiter of attempts per key.
 * @param limit How many attempts a key gets within a window.
 * @returns The limiter.
 */
export function createLimiter(limit: number): Limiter {
  const windows = new Map<string, { attempts: number; endsAt: number }>();
  /** The key's window, when it hasn't ended. */
  const current = (key: string) => {
    const window = windows.get(key);
    if (window && window.endsAt <= Date.now()) {
      windows.delete(key);
      return undefined;
    }
    return window;
  };
  return {
    count: (key) => {
      if (windows.size >= SWEEP_SIZE) {
        windows.forEach((window, held) => window.endsAt <= Date.now() && windows.delete(held));
      }
      const window = current(key);
      if (window) {
        window.attempts++;
      } else {
        windows.set(key, { attempts: 1, endsAt: Date.now() + ATTEMPT_WINDOW_MS });
      }
    },
    clear: (key) => {
      windows.delete(key);
    },
    wait: (key) => {
      const window = current(key);
      return window && window.attempts >= limit ? window.endsAt - Date.now() : 0;
    },
  };
}
