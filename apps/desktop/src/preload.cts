import { contextBridge, ipcRenderer } from "electron";

// The bridge between the web app and the desktop app's main process, the only thing the page gets from Electron: it
// asks for a Windows notification, and hears when one was clicked so it opens the bell's menu. The window is sandboxed,
// so this preload can only load Electron's renderer modules; the channels are written here as in notify.ts.

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
});
