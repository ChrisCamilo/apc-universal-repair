// localStorage access that keeps working when storage is blocked (private mode, disabled cookies):
// reads come back empty and choices last until the page reloads.

/**
 * Reads a saved value without failing when storage is blocked.
 * @param key Storage key.
 * @returns The saved value, or null when there is none or storage can't be read.
 */
export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Removes a saved value, ignoring blocked storage.
 * @param key Storage key.
 */
export function removeStored(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // storage unavailable: nothing was saved
  }
}


/**
 * Saves a value, ignoring blocked storage: the choice then lasts until the page reloads.
 * @param key Storage key.
 * @param value Value to save.
 */
export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage unavailable: keep the choice in memory only
  }
}
