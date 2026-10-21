import { contextBridge, ipcRenderer } from "electron";

// The bridge between the web app and the desktop app's main process, the only thing the page gets from Electron: it
// asks for a Windows notification, and hears when one was clicked so it opens the bell's menu; it hears when a new
// version is ready, and asks to restart into it; it reads and changes the settings of the server the app runs, and
// hears when that server isn't on, with why, and asks to try again. The
// window is sandboxed, so this preload can only load Electron's renderer modules; the channels are written here as in
// notify.ts, update.ts and serverSettings.ts.

/** The new version that is ready, kept for a listener that comes after the main process said so. */
let readyVersion: string | undefined;
ipcRenderer.on("apc:update-ready", (_event, version: string) => {
  readyVersion = version;
});

contextBridge.exposeInMainWorld("apcDesktop", {
  /**
   * Asks for a Windows notification, which the main process shows only while the window isn't focused.
   * @param title The notification's title, e.g. "Aviso".
   * @param message Its text.
   */
  notify: (title: string, message: string) => ipcRenderer.send("apc:notify", { title, message }),
  /**
   * Calls a listener each time a notification is clicked.
   * @param listener What to do, e.g. open the bell's menu.
   * @returns The way to stop listening.
   */
  onOpenNotifications: (listener: () => void) => {
    const heard = () => listener();
    ipcRenderer.on("apc:open-notifications", heard);
    return () => {
      ipcRenderer.removeListener("apc:open-notifications", heard);
    };
  },
  /**
   * Calls a listener when a new version is downloaded and ready, at once when it already is.
   * @param listener What to do with the version's number, e.g. show the update notice.
   * @returns The way to stop listening.
   */
  onUpdateReady: (listener: (version: string) => void) => {
    const heard = (_event: unknown, version: string) => listener(version);
    ipcRenderer.on("apc:update-ready", heard);
    if (readyVersion) {
      listener(readyVersion);
    }
    return () => {
      ipcRenderer.removeListener("apc:update-ready", heard);
    };
  },
  /** Asks to close the app now and install the new version, which opens once it is in. */
  restartToUpdate: () => ipcRenderer.send("apc:restart-to-update"),
  /** The server the app runs and its settings, which the Servidor dialog shows and changes (see serverSettings.ts). */
  server: {
    /**
     * Asks for the folder of an old server's photos.
     * @param defaultPath Where the folder dialog opens.
     * @returns The folder, or null when the dialog was closed.
     */
    chooseFolder: (defaultPath?: string) => ipcRenderer.invoke("apc:server-choose-folder", defaultPath),
    /**
     * Asks for an old server's SQLite file.
     * @returns The file and its clone's photos folder, or null when the dialog was closed.
     */
    chooseSqliteFile: () => ipcRenderer.invoke("apc:server-choose-sqlite-file"),
    /**
     * Checks an import can start.
     * @param source The old server: a PostgreSQL address or a SQLite file.
     * @returns Done, or why not.
     */
    checkImport: (source: unknown) => ipcRenderer.invoke("apc:server-check-import", source),
    /**
     * Tells why the server isn't on, while it isn't.
     * @returns Why and the log to look at, or null while it is on.
     */
    failure: () => ipcRenderer.invoke("apc:server-failure"),
    /**
     * Imports an old server's data and photos into the database in use.
     * @param source The old server.
     * @param photosFrom Its photos folder, if any.
     * @returns What was copied, or why it wasn't.
     */
    importServer: (source: unknown, photosFrom?: string) => ipcRenderer.invoke("apc:server-import", source, photosFrom),
    /**
     * Applies this version's migrations to an old server's database.
     * @param source The old server.
     * @returns Done, or why not.
     */
    migrateImport: (source: unknown) => ipcRenderer.invoke("apc:server-migrate-import", source),
    /**
     * Calls a listener each time the server turns out not to be on.
     * @param listener What to do with why and the log, e.g. show them instead of the login.
     * @returns The way to stop listening.
     */
    onFailure: (listener: (failure: unknown) => void) => {
      const heard = (_event: unknown, failure: unknown) => listener(failure);
      ipcRenderer.on("apc:server-failed", heard);
      return () => {
        ipcRenderer.removeListener("apc:server-failed", heard);
      };
    },
    /**
     * Calls a listener each time the tray asks to open the Servidor dialog.
     * @param listener What to do, e.g. open the dialog.
     * @returns The way to stop listening.
     */
    onOpen: (listener: () => void) => {
      const heard = () => listener();
      ipcRenderer.on("apc:open-server-settings", heard);
      return () => {
        ipcRenderer.removeListener("apc:open-server-settings", heard);
      };
    },
    /**
     * Gives the SQLite key's recovery copy, while the user hasn't said it is kept.
     * @returns The key in groups of 8, or null.
     */
    recoveryKey: () => ipcRenderer.invoke("apc:server-recovery-key"),
    /** Says the user kept the recovery copy, which stops it showing. */
    recoveryKeySaved: () => ipcRenderer.invoke("apc:server-recovery-key-saved"),
    /**
     * Starts the server again after it didn't start.
     * @returns Whether it answers now.
     */
    retry: () => ipcRenderer.invoke("apc:server-retry"),
    /**
     * Reads the server's settings.
     * @returns The database in use and where, the port and the phone's address, or where a server elsewhere is.
     */
    settings: () => ipcRenderer.invoke("apc:server-settings"),
    /**
     * Moves the server to another port, checked free first.
     * @param port The new port.
     * @returns Done, or why not.
     */
    usePort: (port: number) => ipcRenderer.invoke("apc:server-use-port", port),
    /**
     * Moves the server to a PostgreSQL database.
     * @param url Its address.
     * @returns Done, or why not.
     */
    usePostgresql: (url: string) => ipcRenderer.invoke("apc:server-use-postgresql", url),
    /**
     * Brings back the SQLite file's key from its recovery copy, checked to open the file first, and starts the server.
     * @param text The recovery copy, as typed.
     * @returns Done, or why not.
     */
    useRecoveryKey: (text: string) => ipcRenderer.invoke("apc:server-use-recovery-key", text),
    /**
     * Moves the server back to its SQLite file.
     * @returns Done, or why not.
     */
    useSqlite: () => ipcRenderer.invoke("apc:server-use-sqlite"),
  },
});
