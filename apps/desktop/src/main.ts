import os from "node:os";
import path from "node:path";
import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, Notification, screen, session, shell, Tray } from "electron";
import electronUpdater from "electron-updater";
import { usesBundledServer } from "./bundledServer.js";
import { resolveApiUrl, updateConfig, type DesktopConfig } from "./config.js";
import { adoptInstallerChoice } from "./database.js";
import { windowsIdentity } from "./identity.js";
import { keepAppLog } from "./logs.js";
import { NOTIFY_CHANNEL, OPEN_NOTIFICATIONS_CHANNEL, parseNotifyRequest } from "./notify.js";
import { configuredPort } from "./ports.js";
import { APP_ORIGIN, registerAppScheme, serveApp } from "./protocol.js";
import { readHealth } from "./server.js";
import {
  handleServerElsewhere,
  handleServerSettings,
  OPEN_SERVER_SETTINGS_CHANNEL,
  ownServerOn,
  startOwnServer,
  stopOwnServer,
  type ServerHost,
} from "./serverSettings.js";
import { HIDDEN_ARG, takeInstallerStartup } from "./startup.js";
import { phoneAddress, trayMenu, type TrayItem } from "./tray.js";
import {
  CHECK_INTERVAL_MS,
  checksForUpdates,
  clearInstallMarker,
  installInProgress,
  readInstallMarker,
  RESTART_TO_UPDATE_CHANNEL,
  serverVersionWarning,
  UPDATE_READY_CHANNEL,
  writeInstallMarker,
  type InstallMarker,
} from "./update.js";
import { MIN_WINDOW_SIZE, openingContentSize, WINDOW_SIZE } from "./window.js";

// The desktop app's main process: one window with the web app, served from app://apc (see protocol.ts), or from the
// Vite dev server when APC_DEV_URL is set. On opening, it starts the server it ships (see bundledServer.ts) and shows
// "Ligando o servidor" until it answers, unless a server already answers on its port, or waits for PostgreSQL's
// address when it was chosen at install, which the page asks for (see serverSettings.ts); closing the window then
// hides it in the tray, so the server stays on for the phone, until "Sair" in the tray's menu (see tray.ts), which
// also opens the server's settings. The installed app can start with Windows, hidden in the tray (see startup.ts).
// With a server on another computer (APC_API_URL or config.json's apiUrl) it uses that one instead, and starts none.
// The window can't leave the app: other addresses open in the system browser, and the page gets no Node access and
// no permissions: only the preload's bridge (preload.cts), through which it asks for a Windows notification of an
// error or a warning, shown while the window isn't focused; clicking it brings the window up with the bell's menu
// open. The installed app updates itself from GitHub Releases (see update.ts): it checks once its window shows (or a
// minute after a hidden start) and every 6 hours, downloads a new version in the background, tells the page so it
// shows a notice, and installs it on quit, or at once when the page asks: then the window says "Atualizando o APC", the
// server stops and the installer takes over, and an app opened while it installs leaves it alone. Without internet it
// keeps working on its version. The server it ships is always on its version; a server on another computer that answers another one on
// /health gets a warning. Only one copy runs at a time, since two would share the same localStorage, and opening it
// again shows its window. What the main process and the updater say goes to logs/app.log in userData (see logs.ts).

/** The notifications on screen, kept so they still answer a click once their request is gone. */
const shown = new Set<Notification>();

/** The Vite dev server, when running in development; otherwise the window loads app://apc. */
const devUrl = process.env.APC_DEV_URL;
/** Whether the app is quitting, when closing the window ends it instead of hiding it in the tray. */
let quitting = false;
/** Whether the server the app runs has stopped, so quitting can go on. */
let serverStopped = false;
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
} else {
  keepAppLog(app.getPath("userData"));
  console.log(`APC Universal Repair ${app.getVersion()} started with ${JSON.stringify(process.argv.slice(1))}.`);
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
 * Keeps the app in the tray while it runs its own server: closing the window hides it, the first time saying so in a
 * Windows notification, and the tray's menu opens it, copies the phone's address or says the server is off, opens the
 * server's settings in it, turns starting with Windows on and off (the installed app only) and quits.
 * @param window The app's window.
 * @param port Gives the server's port, which the Servidor dialog can change.
 * @param installed Whether this is the installed app, the only one that can start with Windows.
 * @param config What config.json sets, to show the notice once.
 */
function keepInTray(window: BrowserWindow, port: () => number, installed: boolean, config: DesktopConfig): void {
  let noticeShown = config.trayNoticeShown === true;
  window.on("close", (event) => {
    if (quitting) {
      return;
    }
    event.preventDefault();
    window.hide();
    if (!noticeShown && Notification.isSupported()) {
      noticeShown = true;
      updateConfig(app.getPath("userData"), { trayNoticeShown: true });
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
    address: () => clipboard.writeText(`http://${address()}:${port()}`),
    settings: () => {
      showWindow(window);
      window.webContents.send(OPEN_SERVER_SETTINGS_CHANNEL);
    },
    startup: (item) => app.setLoginItemSettings({ openAtLogin: item.checked, args: [HIDDEN_ARG] }),
    quit: () => app.quit(),
  };
  const menu = () =>
    Menu.buildFromTemplate(
      trayMenu({
        address: address(),
        port: port(),
        serverOn: ownServerOn(),
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
 * Leaves the install folder to an update being installed, as an app opened meanwhile must: says so in a Windows
 * notification and exits, starting no server and locking no file the installer still writes.
 * @param marker What the update's marker says.
 */
function leaveToInstaller(marker: InstallMarker): void {
  console.log(`Version ${marker.version} is being installed; this start leaves the folder to the installer.`);
  app.setAppUserModelId(windowsIdentity({ isPackaged: app.isPackaged, execPath: process.execPath, appPath: app.getAppPath() }).appId);
  if (Notification.isSupported()) {
    new Notification({
      title: "O APC está sendo atualizado",
      body: marker.reopens ? "Ele abre sozinho em instantes, já na versão nova." : "Abra de novo em instantes, quando a versão nova estiver instalada.",
      icon: path.join(app.getAppPath(), "build", "icon.png"),
    }).show();
  }
  setTimeout(() => app.exit(0), 1_000);
}

/**
 * Closes the app to install the version downloaded: the window says "Atualizando o APC", the marker says which version
 * goes in, the server stops, and the installer takes over and opens the new version once it is in.
 * @param window The app's window.
 * @param userData The app's userData folder.
 * @param version The version going in.
 */
async function restartToUpdate(window: BrowserWindow, userData: string, version: string): Promise<void> {
  console.log(`Restarting to install ${version}.`);
  await window.loadFile(path.join(app.getAppPath(), "static", "updating.html")).catch(() => undefined);
  writeInstallMarker(userData, { version, startedAt: Date.now(), reopens: true });
  await stopOwnServer();
  serverStopped = true;
  autoUpdater.quitAndInstall(true, true);
}

/**
 * Warns over the window, once it shows, when a server on another computer answers another version than the app's: the
 * web build the app carries expects the API of its own version. A server that doesn't answer is left to the screens,
 * which say the connection failed.
 * @param window The app's window.
 * @param apiUrl The server's address.
 */
async function warnAboutServerVersion(window: BrowserWindow, apiUrl: string): Promise<void> {
  const health = await readHealth(apiUrl);
  const version = app.getVersion();
  if (!health || health.version === version) {
    return;
  }
  console.warn(`The API at ${apiUrl} is at ${health.version ?? "a version before 0.2.0"}, the app at ${version}.`);
  const warn = () => void dialog.showMessageBox(window, { type: "warning", title: "APC Universal Repair", message: serverVersionWarning(version, health.version) });
  if (window.isVisible()) {
    warn();
  } else {
    window.once("show", warn);
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
 * @param userData The app's userData folder, where the marker of an update being installed goes.
 */
function watchForUpdates(window: BrowserWindow, appUrl: string, hidden: boolean, userData: string): void {
  let ready: string | undefined;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  // What it checks, downloads and installs goes to app.log, with the rest of the main process.
  autoUpdater.logger = console;
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
      void restartToUpdate(window, userData, ready);
    }
  });
  // Quitting with a version ready installs it, without opening it after.
  app.on("will-quit", () => {
    if (ready && !readInstallMarker(userData)) {
      writeInstallMarker(userData, { version: ready, startedAt: Date.now(), reopens: false });
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
  const marker = readInstallMarker(userData);
  if (marker && installInProgress(marker, app.getVersion(), Date.now())) {
    leaveToInstaller(marker);
    return;
  }
  if (marker) {
    console.log(`The update to ${marker.version} is done, or was left unfinished; its marker is cleared.`);
    clearInstallMarker(userData);
  }
  const config = adoptInstallerChoice(userData);
  const bundled = usesBundledServer({ envApiUrl: process.env.APC_API_URL, devUrl }, config);
  // APC_SERVER_PORT moves the bundled server off its port, for the smoke test; otherwise config.json's port, or 3000.
  const port = Number(process.env.APC_SERVER_PORT) || configuredPort(config);
  // 127.0.0.1, not localhost, which Node may resolve to ::1 while the server listens on IPv4.
  const apiUrl = bundled ? `http://127.0.0.1:${port}` : resolveApiUrl(process.env.APC_API_URL, config);
  console.log(`API: ${apiUrl}`);

  Menu.setApplicationMenu(null);
  app.setAppUserModelId(windowsIdentity({ isPackaged: app.isPackaged, execPath: process.execPath, appPath: app.getAppPath() }).appId);
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);

  const appUrl = devUrl ?? `${APP_ORIGIN}/`;
  // The server the app runs, once it has one: its address follows a change of port in the Servidor dialog.
  let host: ServerHost | undefined;
  ipcMain.on(NOTIFY_CHANNEL, (event, payload) => notify(appUrl, event.sender, event.senderFrame?.url ?? "", payload));
  if (!devUrl) {
    const webRoot = app.isPackaged
      ? path.join(process.resourcesPath, "web")
      : path.resolve(app.getAppPath(), "..", "web", "dist");
    serveApp(webRoot, () => host?.apiUrl ?? apiUrl);
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
    watchForUpdates(window, appUrl, hidden, userData);
  }
  if (bundled) {
    const serverDir = app.isPackaged ? path.join(process.resourcesPath, "server") : path.join(app.getAppPath(), "server");
    const own: ServerHost = {
      window,
      appUrl,
      apiUrl,
      startingPage: path.join(app.getAppPath(), "static", "starting.html"),
      setup: { serverDir, userData, port, version: app.getVersion() },
    };
    host = own;
    handleServerSettings(own);
    keepInTray(window, () => own.setup.port, installed, config);
    // Quitting waits for the server to exit, so its database and files are let go before the app, or an installer
    // replacing it, goes on.
    app.on("will-quit", (event) => {
      if (serverStopped) {
        return;
      }
      event.preventDefault();
      void stopOwnServer().then(() => {
        serverStopped = true;
        console.log("The bundled server stopped; quitting.");
        // A server already off stops at once, while this quit is still being turned down: quit on the next turn.
        setImmediate(() => app.quit());
      });
    });
    // A start hidden at sign-in shows the window when the page has to ask for PostgreSQL's address.
    if ((await startOwnServer(own)) === "waiting" && hidden) {
      window.once("ready-to-show", () => window.show());
    }
  } else {
    handleServerElsewhere(appUrl, apiUrl);
    // Only the installed app, which follows the releases; a run from the repo talks to the API of its own checkout.
    if (installed) {
      void warnAboutServerVersion(window, apiUrl);
    }
  }
  await window.loadURL(appUrl);
});
