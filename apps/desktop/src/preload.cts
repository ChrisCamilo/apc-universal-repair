import { contextBridge, ipcRenderer } from "electron";

// The bridge between the web app and the desktop app's main process, the only thing the page gets from Electron: it
// asks for a Windows notification, and hears when one was clicked so it opens the bell's menu; it hears when a new
// version is ready, and asks to restart into it. The window is sandboxed, so this preload can only load Electron's
// renderer modules; the channels are written here as in notify.ts and update.ts.

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
});
