import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, Notification, screen, session, shell, Tray } from "electron";
import electronUpdater from "electron-updater";
import { startBundledServer } from "./bundledProcess.js";
import { SERVER_PORT, usesBundledServer } from "./bundledServer.js";
import { isLocalApi, parseConfig, resolveApiUrl, writeConfig, type DesktopConfig } from "./config.js";
import { adoptInstallerChoice, POSTGRESQL_GUIDE_URL, serverCanStart } from "./database.js";
import { windowsIdentity } from "./identity.js";
import { NOTIFY_CHANNEL, OPEN_NOTIFICATIONS_CHANNEL, parseNotifyRequest } from "./notify.js";
import { APP_ORIGIN, registerAppScheme, serveApp } from "./protocol.js";
import { apiAnswers, readHealth, startApi, updateApi, waitForApi } from "./server.js";
import { HIDDEN_ARG, takeInstallerStartup } from "./startup.js";
import { phoneAddress, trayMenu, type TrayItem } from "./tray.js";
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
// Vite dev server when APC_DEV_URL is set. On opening, it starts the server it ships (see bundledServer.ts) and shows
// "Ligando o servidor" until it answers, unless a server already answers on its port; closing the window then hides it
// in the tray, so the server stays on for the phone, until "Sair" in the tray's menu (see tray.ts). The installed app
// can start with Windows, hidden in the tray (see startup.ts). With a server elsewhere (APC_API_URL or config.json's
// apiUrl), or a clone's folder to start one from (APC_API_DIR or config.json's apiDir), it uses that one instead: it
// starts a clone's server when it doesn't answer (see server.ts), unless PostgreSQL was chosen at install and the
// clone's .env doesn't name it yet, when it opens the guide instead (see database.ts). The window can't leave the app:
// other addresses open in the system browser, and the page gets no Node access and no permissions: only the preload's
// bridge (preload.cts), through which it asks for a Windows notification of an error or a warning, shown while the
// window isn't focused; clicking it brings the window up with the bell's menu open. The installed app updates itself
// from GitHub Releases (see update.ts): it checks once its window shows (or a minute after a hidden start) and every 6
// hours, downloads a new version in the background, tells the page so it shows a notice, and installs it on quit, or
// at once when the page asks. Without internet it keeps working on its version. The server it ships is always on its
// version; a clone's server is kept on it too: when /health answers another one, it brings the clone to the app's
// release (update-server.ps1) and shows "Atualizando o servidor" until it answers it, or warns about a server on
// another computer. Only one copy runs at a time, since two would share the same localStorage, and opening it again
// shows its window.

/** The notifications on screen, kept so they still answer a click once their request is gone. */
const shown = new Set<Notification>();

/** The Vite dev server, when running in development; otherwise the window loads app://apc. */
const devUrl = process.env.APC_DEV_URL;
/** Whether the app is quitting, when closing the window ends it instead of hiding it in the tray. */
let quitting = false;
/** The tray's icon, kept so it isn't garbage collected. */
let tray: Tray | undefined;
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
 * Finds the apps/api folder of a clone to start the API from: APC_API_DIR, then config.json's apiDir.
 * @param config What config.json sets.
 * @returns The folder, or undefined when none is set.
 */
function apiDirOf(config: DesktopConfig): string | undefined {
  return process.env.APC_API_DIR || config.apiDir;
}

/**
 * Opens the app's window, hidden until its first page is drawn, and keeps it on the app. It opens at WINDOW_SIZE, or
 * smaller on a screen whose work area doesn't hold it (see window.ts).
 * @param appUrl The address the app is served from, app://apc/ or the dev server.
 * @param hidden Whether it stays hidden, as when Windows starts the app at sign-in.
 * @returns The window.
 */
function createWindow(appUrl: string, hidden: boolean): BrowserWindow {
  const window = new BrowserWindow({
    ...WINDOW_SIZE,
    minWidth: MIN_WINDOW_SIZE.width,
    minHeight: MIN_WINDOW_SIZE.height,
    useContentSize: true,
    show: false,
    title: "APC Universal Repair",
    icon: path.join(app.getAppPath(), "build", process.platform === "win32" ? "icon.ico" : "icon.png"),
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
  if (process.platform === "win32") {
    // The taskbar's icon and id for this window, so it shows the APC gauge however the app was started (see identity.ts).
    const { appId, iconPath, iconIndex } = windowsIdentity({ isPackaged: app.isPackaged, execPath: process.execPath, appPath: app.getAppPath() });
    window.setAppDetails({ appId, appIconPath: iconPath, appIconIndex: iconIndex, relaunchDisplayName: "APC Universal Repair" });
  }
  if (!hidden) {
    window.once("ready-to-show", () => window.show());
  }
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
  if (apiDir && !serverCanStart(config, readIfThere(path.join(apiDir, ".env")))) {
    console.warn(`PostgreSQL was chosen, and ${path.join(apiDir, ".env")} doesn't name it yet; opening the guide.`);
    void shell.openExternal(POSTGRESQL_GUIDE_URL);
    return;
  }
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
 * Starts the server the app ships, unless one already answers on its port, showing "Ligando o servidor" in the window
 * until it answers; it stops when the app quits.
 * @param window The app's window.
 * @param apiUrl The bundled server's address on this computer.
 * @param port Its port.
 */
async function ensureBundledServer(window: BrowserWindow, apiUrl: string, port: number): Promise<void> {
  if (await apiAnswers(apiUrl)) {
    console.log(`A server already answers at ${apiUrl}; using it.`);
    return;
  }
  const serverDir = app.isPackaged ? path.join(process.resourcesPath, "server") : path.join(app.getAppPath(), "server");
  console.log(`Starting the bundled server from ${serverDir}`);
  const stop = startBundledServer({ serverDir, userData: app.getPath("userData"), port, version: app.getVersion() });
  app.on("will-quit", stop);
  await window.loadFile(path.join(app.getAppPath(), "static", "starting.html"));
  if (!(await waitForApi(apiUrl))) {
    console.warn(`The bundled server didn't answer in time; opening the app anyway. See logs/api.log in ${app.getPath("userData")}.`);
  }
}

/**
 * Keeps the app in the tray while it runs its own server: closing the window hides it, the first time saying so in a
 * Windows notification, and the tray's menu opens it, copies the phone's address, turns starting with Windows on and
 * off (the installed app only) and quits.
 * @param window The app's window.
 * @param port The server's port.
 * @param installed Whether this is the installed app, the only one that can start with Windows.
 * @param config What config.json sets, to show the notice once.
 */
function keepInTray(window: BrowserWindow, port: number, installed: boolean, config: DesktopConfig): void {
  let noticeShown = config.trayNoticeShown === true;
  window.on("close", (event) => {
    if (quitting) {
      return;
    }
    event.preventDefault();
    window.hide();
    if (!noticeShown && Notification.isSupported()) {
      noticeShown = true;
      writeConfig(app.getPath("userData"), { ...config, trayNoticeShown: true });
      new Notification({
        title: "O APC continua ligado",
        body: "O servidor segue ligado para o celular. Para sair, use Sair no ícone do APC perto do relógio.",
        icon: path.join(app.getAppPath(), "build", "icon.png"),
      }).show();
    }
  });
  const address = () => phoneAddress(os.networkInterfaces());
  const actions: Record<Exclude<TrayItem["id"], "separator">, (item: Electron.MenuItem) => void> = {
    open: () => showWindow(window),
    address: () => clipboard.writeText(`http://${address()}:${port}`),
    startup: (item) => app.setLoginItemSettings({ openAtLogin: item.checked, args: [HIDDEN_ARG] }),
    quit: () => app.quit(),
  };
  const menu = () =>
    Menu.buildFromTemplate(
      trayMenu({
        address: address(),
        port,
        startsWithWindows: installed && app.getLoginItemSettings({ args: [HIDDEN_ARG] }).openAtLogin,
        canStartWithWindows: installed,
      }).map((item): Electron.MenuItemConstructorOptions =>
        item.id === "separator"
          ? { type: "separator" }
          : { ...item, type: item.id === "startup" ? "checkbox" : "normal", click: (menuItem) => actions[item.id](menuItem) },
      ),
    );
  tray = new Tray(path.join(app.getAppPath(), "build", process.platform === "win32" ? "icon.ico" : "icon.png"));
  tray.setToolTip("APC Universal Repair");
  tray.on("click", () => showWindow(window));
  // Built when it opens, so the phone's address is the current one.
  tray.on("right-click", () => tray?.popUpContextMenu(menu()));
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
 * Brings the window up: shown, restored and focused.
 * @param window The app's window.
 */
function showWindow(window: BrowserWindow): void {
  if (window.isMinimized()) {
    window.restore();
  }
  window.show();
  window.focus();
}

/**
 * Keeps the installed app up to date: checks GitHub Releases once the window shows and every 6 hours after, downloads
 * a new version in the background (only what changed, from the blockmap, checked against latest.yml's sha512), and
 * tells the page when it is ready. It installs silently on quit, or at once when the page asks to restart. A failed
 * check, such as one with no internet, is only logged.
 * @param window The app's window.
 * @param appUrl The address the app is served from, which a restart request must come from.
 * @param hidden Whether the window starts hidden, as at sign-in, when the first check waits a minute instead.
 */
function watchForUpdates(window: BrowserWindow, appUrl: string, hidden: boolean): void {
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
  const start = () => {
    void check();
    setInterval(() => void check(), CHECK_INTERVAL_MS);
  };
  if (hidden) {
    setTimeout(start, 60_000);
  } else {
    window.once("show", start);
  }
}

app.on("second-instance", () => {
  const [window] = BrowserWindow.getAllWindows();
  if (window) {
    showWindow(window);
  }
});

app.on("before-quit", () => {
  quitting = true;
});

app.on("window-all-closed", () => app.quit());

void app.whenReady().then(async () => {
  const userData = app.getPath("userData");
  const config = adoptInstallerChoice(userData, parseConfig(readIfThere(path.join(userData, "config.json"))));
  const bundled = usesBundledServer({ envApiUrl: process.env.APC_API_URL, envApiDir: process.env.APC_API_DIR, devUrl }, config);
  // APC_SERVER_PORT moves the bundled server off 3333, for the smoke test.
  const port = Number(process.env.APC_SERVER_PORT) || SERVER_PORT;
  // 127.0.0.1, not localhost, which Node may resolve to ::1 while the server listens on IPv4.
  const apiUrl = bundled ? `http://127.0.0.1:${port}` : resolveApiUrl(process.env.APC_API_URL, config);
  console.log(`API: ${apiUrl}`);

  Menu.setApplicationMenu(null);
  app.setAppUserModelId(windowsIdentity({ isPackaged: app.isPackaged, execPath: process.execPath, appPath: app.getAppPath() }).appId);
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
  const installed = checksForUpdates({ isPackaged: app.isPackaged, devUrl, portableDir: process.env.PORTABLE_EXECUTABLE_DIR });
  // Only the installed app starts with Windows: a run from the clone or the portable exe would register a path that moves.
  const startup = takeInstallerStartup(userData);
  if (installed && startup !== undefined) {
    app.setLoginItemSettings({ openAtLogin: startup, args: [HIDDEN_ARG] });
  }
  // Hidden only with a tray to bring it back from.
  const hidden = bundled && process.argv.includes(HIDDEN_ARG);
  const window = createWindow(appUrl, hidden);
  if (installed) {
    watchForUpdates(window, appUrl, hidden);
  }
  if (bundled) {
    keepInTray(window, port, installed, config);
    await ensureBundledServer(window, apiUrl, port);
  } else {
    await ensureApi(window, apiUrl, config);
    // Only the installed app, which follows the releases; a run from the clone would check its own clone out.
    if (installed) {
      await ensureApiVersion(window, apiUrl, config);
    }
  }
  await window.loadURL(appUrl);
});
