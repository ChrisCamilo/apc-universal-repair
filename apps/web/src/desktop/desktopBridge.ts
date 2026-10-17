// What the desktop app's preload hands the page (see apps/desktop/src/preload.cts): asking for a Windows notification
// and hearing when one was clicked, hearing when a new version is ready and asking to restart into it, and the
// settings of the server the app runs (see apps/desktop/src/serverSettings.ts). In a browser there is none, and the
// web app shows nothing extra.

/** An old server to import: a PostgreSQL address, or a SQLite file with the recovery copy of its key when it is encrypted. */
export type ImportSource = { kind: 'postgresql'; url: string } | { kind: 'sqlite'; file: string; key?: string }
/** How checking an import ended: it can start, or why not, with the problem when the old database only lacks migrations. */
export type ImportCheck = ServerOutcome | { ok: false; message: string; problem: 'sourceBehind' | 'sourceNewer' | 'sourceNotApc' | 'targetHasData' }
/** How an import ended: each table's rows on both sides and the photo files copied and not found, or why it didn't. */
export type ImportOutcome =
  | { ok: true; tables: Record<string, { source: number; target: number }>; photos: { copied: number; missing: number } }
  | { ok: false; message: string }
/** The server the desktop app runs, and its settings. */
export type ServerBridge = {
  /** Asks for a folder, such as the old server's photos, opening at defaultPath; null when the dialog was closed. */
  chooseFolder: (defaultPath?: string) => Promise<string | null>
  /** Asks for an old server's SQLite file, and gives its clone's photos folder; null when the dialog was closed. */
  chooseSqliteFile: () => Promise<{ file: string; photos: string } | null>
  /** Checks an import can start. */
  checkImport: (source: ImportSource) => Promise<ImportCheck>
  /** Imports an old server's data and photos into the database in use, with the server off meanwhile. */
  importServer: (source: ImportSource, photosFrom?: string) => Promise<ImportOutcome>
  /** Applies this version's migrations to an old server's database, which only adds tables. */
  migrateImport: (source: ImportSource) => Promise<ServerOutcome>
  /** Calls a listener each time the tray asks to open the Servidor dialog, and gives the way to stop. */
  onOpen: (listener: () => void) => () => void
  /** Gives the SQLite key's recovery copy, in groups of 8, while the user hasn't said it is kept; null after. */
  recoveryKey: () => Promise<string | null>
  /** Says the user kept the recovery copy, which stops it showing. */
  recoveryKeySaved: () => Promise<void>
  /** Reads the server's settings. */
  settings: () => Promise<ServerSettings>
  /** Moves the server to a PostgreSQL database, checked and migrated first, and restarts it there. */
  usePostgresql: (url: string) => Promise<ServerOutcome>
  /** Moves the server back to its SQLite file, and restarts it there. */
  useSqlite: () => Promise<ServerOutcome>
}
/** How a change of database ended: done, or the message saying why not. */
export type ServerOutcome = { ok: true } | { ok: false; message: string }
/**
 * The server's settings: the app's own server, on SQLite with its folder or PostgreSQL with its server, its photos'
 * folder, port and phone's address, whether PostgreSQL's address is still missing and whether the SQLite key's
 * recovery copy is still to be kept; a server on another computer; or another server that took the port when the app
 * opened.
 */
export type ServerSettings =
  | {
      kind: 'own'
      database: 'postgresql' | 'sqlite'
      location: string
      photos: string
      port: number
      phoneAddress?: string
      needsAddress: boolean
      recoveryKeyPending: boolean
    }
  | { kind: 'elsewhere'; address: string }
  | { kind: 'portTaken'; port: number }

/** The desktop app's bridge. */
export type DesktopBridge = {
  /** Asks for a Windows notification, which the app shows only while its window isn't focused. */
  notify: (title: string, message: string) => void
  /** Calls a listener each time a notification is clicked, and gives the way to stop. */
  onOpenNotifications: (listener: () => void) => () => void
  /** Calls a listener with the new version's number once it is downloaded, at once if it already is, and gives the way to stop. */
  onUpdateReady: (listener: (version: string) => void) => () => void
  /** Closes the app and installs the new version, which opens once it is in. */
  restartToUpdate: () => void
  /** The server the app runs and its settings; without it, the user menu offers no Servidor dialog. */
  server?: ServerBridge
}

declare global {
  interface Window {
    apcDesktop?: DesktopBridge
  }
}

/**
 * Gets the desktop app's bridge.
 * @returns The bridge in the desktop app, or undefined in a browser.
 */
export function desktopBridge(): DesktopBridge | undefined {
  return window.apcDesktop
}
