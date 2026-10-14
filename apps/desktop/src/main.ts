import { readFileSync } from "node:fs";
import path from "node:path";
import { app, BrowserWindow, dialog, ipcMain, Menu, Notification, screen, session, shell } from "electron";
import electronUpdater from "electron-updater";
import { isLocalApi, parseConfig, resolveApiUrl, type DesktopConfig } from "./config.js";
import { NOTIFY_CHANNEL, OPEN_NOTIFICATIONS_CHANNEL, parseNotifyRequest } from "./notify.js";
import { APP_ORIGIN, registerAppScheme, serveApp } from "./protocol.js";
import { apiAnswers, readHealth, startApi, updateApi, waitForApi } from "./server.js";
import {
  CHECK_INTERVAL_MS,
  checksForUpdates,
  RESTART_TO_UPDATE_CHANNEL,
  serverActionFor,
  serverVersionWarning,
  UPDATE_READY_CHANNEL,
} from "./update.js";
import { MIN_WINDOW_SIZE, openingContentSize, WINDOW_SIZE } from "./window.js";

// The desktop app's main process: one window with the web app, served from app://apc (see protocol.ts), or from the
// Vite dev server when APC_DEV_URL is set. On opening, when the API on this computer doesn't answer, it starts it
// (see server.ts) and shows "Ligando o servidor" until it does. The window can't leave the app: other addresses open
// in the system browser, and the page gets no Node access and no permissions: only the preload's bridge (preload.cts),
// through which it asks for a Windows notification of an error or a warning, shown while the window isn't focused;
// clicking it brings the window up with the bell's menu open. The installed app updates itself from GitHub Releases
// (see update.ts): it checks once its window shows and every 6 hours, downloads a new version in the background, tells
// the page so it shows a notice, and installs it on quit, or at once when the page asks. Without internet it keeps
// working on its version. It also keeps the server on its own version: when /health answers another one, it brings
// the API on this computer to the app's release (update-server.ps1) and shows "Atualizando o servidor" until it
// answers it, or warns about a server on another computer. Only one copy runs at a time, since two would share the
// same localStorage.

/** The app's id on Windows, the same as the installer's, which Windows notifications are shown under. */
const APP_USER_MODEL_ID = "com.apc.universalrepair";
/** The notifications on screen, kept so they still answer a click once their request is gone. */
const shown = new Set<Notification>();

/** The Vite dev server, when running in development; otherwise the window loads app://apc. */
const devUrl = process.env.APC_DEV_URL;
// electron-updater is CommonJS, so its named exports come from the default one.
const { autoUpdater } = electronUpdater;

registerAppScheme();
// A separate userData folder, for the smoke test or a second setup on the same computer.
if (process.env.APC_USER_DATA) {
  app.setPath("userData", process.env.APC_USER_DATA);
}
if (!app.requestSingleInstanceLock()) {
  app.exit(0);
}

/**
 * Finds the apps/api folder to start the API from: APC_API_DIR, then config.json's apiDir, then the one of the clone
 * the app was built from.
 * @param config What config.json sets.
 * @returns The folder, or undefined when none is known.
 */
function apiDirOf(config: DesktopConfig): string | undefined {
  const built = parseConfig(readIfThere(path.join(import.meta.dirname, "build-info.json")));
  return process.env.APC_API_DIR || config.apiDir || built.apiDir;
}

/**
 * Opens the app's window, hidden until its first page is drawn, and keeps it on the app. It opens at WINDOW_SIZE, or
 * smaller on a screen whose work area doesn't hold it (see window.ts).
 * @param appUrl The address the app is served from, app://apc/ or the dev server.
 * @returns The window.
 */
function createWindow(appUrl: string): BrowserWindow {
  const window = new BrowserWindow({
    ...WINDOW_SIZE,
    minWidth: MIN_WINDOW_SIZE.width,
    minHeight: MIN_WINDOW_SIZE.height,
    useContentSize: true,
    show: false,
    title: "APC Universal Repair",
    icon: path.join(app.getAppPath(), "build", "icon.png"),
    backgroundColor: "#0B0C0E",
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, preload: path.join(import.meta.dirname, "preload.cjs") },
  });
  // What the window adds around its content, the title bar and the borders, is only known once it exists.
  const [outerWidth, outerHeight] = window.getSize();
  const [contentWidth, contentHeight] = window.getContentSize();
  const frame = { width: outerWidth - contentWidth, height: outerHeight - contentHeight };
  const { width, height } = openingContentSize(screen.getDisplayMatching(window.getBounds()).workAreaSize, frame);
  window.setContentSize(width, height);
  window.center();
  window.once("ready-to-show", () => window.show());
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(appUrl)) {
      event.preventDefault();
    }
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });
  return window;
}

/**
 * Starts the API on this computer when it doesn't answer, showing "Ligando o servidor" in the window meanwhile.
 * @param window The app's window.
 * @param apiUrl The API address.
 * @param config What config.json sets.
 */
async function ensureApi(window: BrowserWindow, apiUrl: string, config: DesktopConfig): Promise<void> {
  if (!isLocalApi(apiUrl) || (await apiAnswers(apiUrl))) {
    return;
  }
  const apiDir = apiDirOf(config);
  if (!apiDir || !startApi(apiDir)) {
    console.warn(`The API at ${apiUrl} doesn't answer, and there is no API folder to start it from.`);
    return;
  }
  console.log(`Starting the API from ${apiDir}`);
  await window.loadFile(path.join(app.getAppPath(), "static", "starting.html"));
  if (!(await waitForApi(apiUrl))) {
    console.warn(`The API at ${apiUrl} didn't answer in time; opening the app anyway.`);
  }
}

/**
 * Keeps the server on the app's version: when /health answers another one, it brings the API on this computer to the
 * app's release through update-server.ps1, showing "Atualizando o servidor" until it answers it, or warns about a
 * server on another computer. An API that doesn't answer, or a clone with no update script, is left as it is.
 * @param window The app's window.
 * @param apiUrl The API address.
 * @param config What config.json sets.
 */
async function ensureApiVersion(window: BrowserWindow, apiUrl: string, config: DesktopConfig): Promise<void> {
  const health = await readHealth(apiUrl);
  if (!health) {
    return;
  }
  const version = app.getVersion();
  const action = serverActionFor(version, health.version, isLocalApi(apiUrl));
  if (action === "warn") {
    console.warn(`The API at ${apiUrl} is at ${health.version ?? "a version before 0.2.0"}, the app at ${version}.`);
    // Over the window once it shows, since the app opens anyway.
    const warn = () => void dialog.showMessageBox(window, { type: "warning", title: "APC Universal Repair", message: serverVersionWarning(version, health.version) });
    if (window.isVisible()) {
      warn();
    } else {
      window.once("show", warn);
    }
    return;
  }
  if (action === "none") {
    return;
  }
  const apiDir = apiDirOf(config);
  const updating = apiDir ? updateApi(apiDir, apiUrl, version) : undefined;
  if (!updating) {
    console.warn(`The API at ${apiUrl} is at ${health.version ?? "a version before 0.2.0"}, and there is no update script to bring it to ${version}.`);
    return;
  }
  console.log(`Updating the API from ${apiDir} to ${version}`);
  await window.loadFile(path.join(app.getAppPath(), "static", "starting.html"), { hash: "updating" });
  if (!(await updating)) {
    console.warn(`The API at ${apiUrl} isn't at ${version} after updating; opening the app anyway. See apps/api/logs/update.log.`);
  }
}

/**
 * Shows the Windows notification the page asked for, when it comes from the app and the window isn't focused; a click
 * brings the window up and asks the page to open the bell's menu.
 * @param appUrl The address the app is served from, which the request must come from.
 * @param sender The page that asked.
 * @param senderUrl The address of the frame that asked.
 * @param payload What it sent.
 */
function notify(appUrl: string, sender: Electron.WebContents, senderUrl: string, payload: unknown): void {
  const request = parseNotifyRequest(payload);
  const window = BrowserWindow.fromWebContents(sender);
  if (!request || !window || !senderUrl.startsWith(appUrl) || window.isFocused() || !Notification.isSupported()) {
    return;
  }
  const notification = new Notification({ title: request.title, body: request.message, icon: path.join(app.getAppPath(), "build", "icon.png") });
  notification.on("click", () => {
    shown.delete(notification);
    if (window.isMinimized()) {
      window.restore();
    }
    window.show();
    window.focus();
    window.webContents.send(OPEN_NOTIFICATIONS_CHANNEL);
  });
  notification.on("close", () => shown.delete(notification));
  shown.add(notification);
  notification.show();
}

/**
 * Reads a text file, if it is there.
 * @param file The file's full path.
 * @returns Its text, or undefined when it doesn't exist.
 */
function readIfThere(file: string): string | undefined {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
}

/**
 * Keeps the installed app up to date: checks GitHub Releases once the window shows and every 6 hours after, downloads
 * a new version in the background (only what changed, from the blockmap, checked against latest.yml's sha512), and
 * tells the page when it is ready. It installs silently on quit, or at once when the page asks to restart. A failed
 * check, such as one with no internet, is only logged.
 * @param window The app's window.
 * @param appUrl The address the app is served from, which a restart request must come from.
 */
function watchForUpdates(window: BrowserWindow, appUrl: string): void {
  let ready: string | undefined;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("error", (error) => console.warn(`Couldn't update the app: ${error.message}`));
  autoUpdater.on("update-downloaded", ({ version }) => {
    ready = version;
    window.webContents.send(UPDATE_READY_CHANNEL, version);
  });
  // A page that loads after the update is ready, such as the app after "Ligando o servidor", hears it too.
  window.webContents.on("did-finish-load", () => {
    if (ready) {
      window.webContents.send(UPDATE_READY_CHANNEL, ready);
    }
  });
  ipcMain.on(RESTART_TO_UPDATE_CHANNEL, (event) => {
    if (ready && (event.senderFrame?.url ?? "").startsWith(appUrl)) {
      autoUpdater.quitAndInstall(true, true);
    }
  });
  // The error listener has logged what went wrong already.
  const check = () => autoUpdater.checkForUpdates().catch(() => undefined);
  window.once("show", () => {
    void check();
    setInterval(() => void check(), CHECK_INTERVAL_MS);
  });
}

app.on("second-instance", () => {
  const [window] = BrowserWindow.getAllWindows();
  if (window) {
    if (window.isMinimized()) {
      window.restore();
    }
    window.focus();
  }
});

app.on("window-all-closed", () => app.quit());

void app.whenReady().then(async () => {
  const config = parseConfig(readIfThere(path.join(app.getPath("userData"), "config.json")));
  const apiUrl = resolveApiUrl(process.env.APC_API_URL, config);
  console.log(`API: ${apiUrl}`);

  Menu.setApplicationMenu(null);
  app.setAppUserModelId(APP_USER_MODEL_ID);
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);

  const appUrl = devUrl ?? `${APP_ORIGIN}/`;
  ipcMain.on(NOTIFY_CHANNEL, (event, payload) => notify(appUrl, event.sender, event.senderFrame?.url ?? "", payload));
  if (!devUrl) {
    const webRoot = app.isPackaged
      ? path.join(process.resourcesPath, "web")
      : path.resolve(app.getAppPath(), "..", "web", "dist");
    serveApp(webRoot, apiUrl);
  }
  const window = createWindow(appUrl);
  const installed = checksForUpdates({ isPackaged: app.isPackaged, devUrl, portableDir: process.env.PORTABLE_EXECUTABLE_DIR });
  if (installed) {
    watchForUpdates(window, appUrl);
  }
  await ensureApi(window, apiUrl, config);
  // Only the installed app, which follows the releases; a run from the clone would check its own clone out.
  if (installed) {
    await ensureApiVersion(window, apiUrl, config);
  }
  await window.loadURL(appUrl);
});
