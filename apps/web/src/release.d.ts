// The release the app is built for, which the Vite plugin in vite.config.ts reads at build time.
declare module 'virtual:apc-release' {
  /** The release's version, e.g. "0.6.5". */
  export const RELEASE_VERSION: string
  /** Its notes, docs/releases/v<version>.md, in English and then in Portuguese; undefined while it has none. */
  export const RELEASE_NOTES: string | undefined
}
