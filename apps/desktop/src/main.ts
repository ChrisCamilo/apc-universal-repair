import { readFileSync } from "node:fs";
import path from "node:path";
import { app, BrowserWindow, Menu, session, shell } from "electron";
import { isLocalApi, parseConfig, resolveApiUrl, type DesktopConfig } from "./config.js";
import { APP_ORIGIN, registerAppScheme, serveApp } from "./protocol.js";
import { apiAnswers, startApi, waitForApi } from "./server.js";

// The desktop app's main process: one window with the web app, served from app://apc (see protocol.ts), or from the
// Vite dev server when APC_DEV_URL is set. On opening, when the API on this computer doesn't answer, it starts it
// (see server.ts) and shows "Ligando o servidor" until it does. The window can't leave the app: other addresses open
// in the system browser, and the page gets no Node access and no permissions. Only one copy runs at a time, since two
// would share the same localStorage.

/** The window's size at opening and its minimum, the minimum desktop screen from AGENTS.md (1280×720). */
const WINDOW_SIZE = { width: 1280, height: 720 };

/** The Vite dev server, when running in development; otherwise the window loads app://apc. */
const devUrl = process.env.APC_DEV_URL;

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
 * Opens the app's window, hidden until its first page is drawn, and keeps it on the app.
 * @param appUrl The address the app is served from, app://apc/ or the dev server.
 * @returns The window.
 */
function createWindow(appUrl: string): BrowserWindow {
  const window = new BrowserWindow({
    ...WINDOW_SIZE,
    minWidth: WINDOW_SIZE.width,
    minHeight: WINDOW_SIZE.height,
    useContentSize: true,
    show: false,
    title: "APC Universal Repair",
    icon: path.join(app.getAppPath(), "build", "icon.png"),
    backgroundColor: "#0B0C0E",
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
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
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);

  const appUrl = devUrl ?? `${APP_ORIGIN}/`;
  if (!devUrl) {
    const webRoot = app.isPackaged
      ? path.join(process.resourcesPath, "web")
      : path.resolve(app.getAppPath(), "..", "web", "dist");
    serveApp(webRoot, apiUrl);
  }
  const window = createWindow(appUrl);
  await ensureApi(window, apiUrl, config);
  await window.loadURL(appUrl);
});
