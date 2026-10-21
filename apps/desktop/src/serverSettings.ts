import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { dialog, ipcMain, safeStorage, type BrowserWindow, type IpcMainInvokeEvent } from "electron";
import { startBundledServer } from "./bundledProcess.js";
import { PORT_IN_USE_EXIT_CODE, serverData, serverEnvironment, WRONG_KEY_EXIT_CODE, type ServerSetup } from "./bundledServer.js";
import { readConfig, updateConfig } from "./config.js";
import {
  databaseCheckMessage,
  describePostgresql,
  ensureSqliteKey,
  formatRecoveryKey,
  importProblemMessage,
  isPostgresqlUrl,
  needsDatabaseAddress,
  oldPhotosFolder,
  openDatabaseUrl,
  readRecoveryKey,
  recoveryKeyPending,
  seal,
  type DatabaseCheck,
  type ImportProblem,
} from "./database.js";
import { MAX_PORT, MIN_PORT, portFree, portOwner, validPort, type PortOwner } from "./ports.js";
import { apiAnswers, waitForApi, watchServer } from "./server.js";
import { serverFailure, type FailureKind, type ServerFailure } from "./serverFailure.js";
import { runServerTask, type ServerTask } from "./serverTasks.js";
import { phoneAddress } from "./tray.js";

// The server the app runs (see bundledServer.ts) and its settings, which the page shows in its Servidor dialog
// through the preload's bridge (see preload.cts): the database in use, SQLite with its folder or PostgreSQL with its
// server, the port and the phone's address. From there the page moves the server to PostgreSQL, at an address checked
// and migrated first and kept sealed (see database.ts), or back to SQLite, which restarts the server; and imports an
// old server (see apps/api/src/db/import.ts) into the database in use, with the server off meanwhile. The database
// tasks run beside the server (see serverTasks.ts). With PostgreSQL chosen at install and no address yet, the server
// waits for the page to ask for it. On SQLite the file is encrypted with a key made the first time (see database.ts):
// the dialog shows its recovery copy until the user says it is kept, and an encrypted file of another install imports
// with its recovery copy. When another server already answers on the port, such as an old clone's, the app uses it and
// changes nothing, until it is gone, when the app starts its own. A server that doesn't start, from a key that doesn't
// open, its port held by another program, repeated stops or no answer in time, is told to the page with why (see
// serverFailure.ts), which shows it instead of the login, and can ask to try again. A taken port is found before the
// server starts, naming the program that holds it (see ports.ts), and the page can move the server to another port,
// kept in config.json. A SQLite key missing from config.json, or one that doesn't open the file, is never replaced:
// the page asks for the recovery copy, which the app checks opens the file before keeping it sealed. Only the app's
// own page may ask, as with the notifications.

/** The channels the page asks on (also written in preload.cts, which can't import this file). */
const CHANNELS = {
  chooseFolder: "apc:server-choose-folder",
  chooseSqliteFile: "apc:server-choose-sqlite-file",
  checkImport: "apc:server-check-import",
  failure: "apc:server-failure",
  importServer: "apc:server-import",
  migrateImport: "apc:server-migrate-import",
  recoveryKey: "apc:server-recovery-key",
  recoveryKeySaved: "apc:server-recovery-key-saved",
  retry: "apc:server-retry",
  useRecoveryKey: "apc:server-use-recovery-key",
  settings: "apc:server-settings",
  usePort: "apc:server-use-port",
  usePostgresql: "apc:server-use-postgresql",
  useSqlite: "apc:server-use-sqlite",
} as const;
/** The channel the main process asks the page to open the Servidor dialog on, from the tray. */
export const OPEN_SERVER_SETTINGS_CHANNEL = "apc:open-server-settings";
/** The channel the main process tells the page on that the server isn't on, with why. */
export const SERVER_FAILED_CHANNEL = "apc:server-failed";

/** How a change of database or an import ended: done, or the message saying why not, in Portuguese. */
type Outcome = { ok: true } | { ok: false; message: string };
/** The server the app runs, and where it shows. */
export type ServerHost = {
  /** The app's window, whose page asks. */
  window: BrowserWindow;
  /** The address the app is served from, which the requests must come from. */
  appUrl: string;
  /** The server's address on this computer, e.g. "http://127.0.0.1:3000", which follows a change of port. */
  apiUrl: string;
  /** The "Ligando o servidor" page, static/starting.html. */
  startingPage: string;
  /** How it runs, but for the database; its port follows a change in the Servidor dialog. */
  setup: Omit<ServerSetup, "databaseUrl">;
};
/** An old server to import: a PostgreSQL address, or a SQLite file with the recovery copy of its key when it is encrypted. */
type Source = { kind: "postgresql"; url: string } | { kind: "sqlite"; file: string; key?: string };

/** Why the server the app runs isn't on, while it isn't. */
let failure: ServerFailure | undefined;
/** Whether another server answered on the port when the app opened, so the app runs none. */
let portTaken = false;
/** Stops the server the app runs, while it runs one. */
let stopServer: (() => Promise<void>) | undefined;
/** Stops watching the server on the port the app uses but didn't start, while it does. */
let stopWatching: (() => void) | undefined;

/**
 * Checks an import can start: the old server's database opens, is an APC server's of this version, and the database
 * in use is empty.
 * @param host The server.
 * @param source The old server.
 * @returns Done, or why not, with the problem when the source only lacks migrations.
 */
async function checkImport(host: ServerHost, source: Source): Promise<Outcome | { ok: false; message: string; problem: ImportProblem }> {
  const from = sourceUrl(source);
  const to = databaseUrlInUse(host);
  if (from === to) {
    return { ok: false, message: "Esse é o banco em uso. Escolha o banco do servidor antigo." };
  }
  const keys = sourceKeys(source);
  if (keys === null) {
    return { ok: false, message: "A chave de recuperação tem 64 letras e números, de 0 a 9 e de A a F; os traços não contam." };
  }
  try {
    const problem = await runTask<ImportProblem | null>(host, { task: "importProblem", from, to, keys });
    return problem ? { ok: false, message: importProblemMessage(problem), problem } : { ok: true };
  } catch (error) {
    return { ok: false, message: `Não foi possível abrir o banco antigo: ${openError(error as Error)}` };
  }
}

/**
 * Asks the user for a folder, such as the old server's photos.
 * @param window The app's window, which the dialog belongs to.
 * @param defaultPath Where the dialog opens, if anywhere.
 * @returns The folder, or null when the dialog was closed.
 */
async function chooseFolder(window: BrowserWindow, defaultPath?: string): Promise<string | null> {
  const { canceled, filePaths } = await dialog.showOpenDialog(window, {
    title: "Pasta das fotos do servidor antigo",
    defaultPath,
    properties: ["openDirectory"],
  });
  return canceled ? null : (filePaths[0] ?? null);
}

/**
 * Asks the user for an old server's SQLite file, such as apps\api\data\apc.db of an old clone.
 * @param window The app's window, which the dialog belongs to.
 * @returns The file and its clone's photos folder, or null when the dialog was closed.
 */
async function chooseSqliteFile(window: BrowserWindow): Promise<{ file: string; photos: string } | null> {
  const { canceled, filePaths } = await dialog.showOpenDialog(window, {
    title: "Arquivo do servidor antigo",
    filters: [{ name: "Banco SQLite", extensions: ["db"] }],
    properties: ["openFile"],
  });
  const file = filePaths[0];
  return canceled || !file ? null : { file, photos: oldPhotosFolder(file) };
}

/**
 * Finds the DATABASE_URL of the database in use.
 * @param host The server.
 * @returns PostgreSQL's address, or the SQLite file in userData.
 */
function databaseUrlInUse(host: ServerHost): string {
  return ownSetup(host).databaseUrl ?? `file:${serverData(host.setup.userData).sqliteFile}`;
}

/**
 * Answers the page's requests about the server, only those from the app itself.
 * @param host The server.
 * @param channel The channel.
 * @param answer What answers it, with what the page sent.
 */
function handle(host: ServerHost, channel: string, answer: (...args: never[]) => Promise<unknown>): void {
  ipcMain.handle(channel, (event: IpcMainInvokeEvent, ...args: unknown[]) => {
    if (!(event.senderFrame?.url ?? "").startsWith(host.appUrl)) {
      throw new Error("Only the app's page asks about its server.");
    }
    return answer(...(args as never[]));
  });
}

/**
 * Answers the page's request for the settings when the app runs no server of its own, as with a server on another
 * computer: the page only says where the server is.
 * @param appUrl The address the app is served from, which the request must come from.
 * @param apiUrl The server's address.
 */
export function handleServerElsewhere(appUrl: string, apiUrl: string): void {
  ipcMain.handle(CHANNELS.settings, (event) => {
    if (!(event.senderFrame?.url ?? "").startsWith(appUrl)) {
      throw new Error("Only the app's page asks about its server.");
    }
    return { kind: "elsewhere", address: apiUrl };
  });
}

/**
 * Answers the page's requests about the server: its settings, changing its database, importing an old one, and the
 * SQLite key's recovery copy.
 * @param host The server.
 */
export function handleServerSettings(host: ServerHost): void {
  handle(host, CHANNELS.settings, async () => settings(host));
  handle(host, CHANNELS.usePostgresql, (url: string) => usePostgresql(host, url));
  handle(host, CHANNELS.useSqlite, () => useSqlite(host));
  handle(host, CHANNELS.chooseSqliteFile, () => chooseSqliteFile(host.window));
  handle(host, CHANNELS.chooseFolder, (defaultPath?: string) => chooseFolder(host.window, defaultPath));
  handle(host, CHANNELS.checkImport, (source: Source) => checkImport(host, source));
  handle(host, CHANNELS.migrateImport, (source: Source) => migrateImport(host, source));
  handle(host, CHANNELS.importServer, (source: Source, photosFrom?: string) => importServer(host, source, photosFrom));
  handle(host, CHANNELS.recoveryKey, async () => recoveryKey(host));
  handle(host, CHANNELS.recoveryKeySaved, async () => void updateConfig(host.setup.userData, { sqliteKeySaved: true }));
  handle(host, CHANNELS.failure, async () => failure ?? null);
  handle(host, CHANNELS.retry, () => runServer(host, openDatabaseUrl(readConfig(host.setup.userData), safeStorage)));
  handle(host, CHANNELS.usePort, (port: number) => usePort(host, port));
  handle(host, CHANNELS.useRecoveryKey, (text: string) => useRecoveryKey(host, text));
}

/**
 * Imports an old server's data and photos into the database in use, with the server off meanwhile.
 * @param host The server.
 * @param source The old server.
 * @param photosFrom Its photos folder, if any.
 * @returns What was copied, or why it wasn't.
 */
async function importServer(host: ServerHost, source: Source, photosFrom?: string): Promise<unknown> {
  const checked = await checkImport(host, source);
  if (!checked.ok) {
    return checked;
  }
  const to = databaseUrlInUse(host);
  await stopServer?.();
  try {
    const result = await runTask(host, {
      task: "import",
      setup: { from: sourceUrl(source), to, photosFrom, photosTo: serverData(host.setup.userData).photos },
      keys: sourceKeys(source) ?? undefined,
    });
    return { ok: true, ...(result as object) };
  } catch (error) {
    return { ok: false, message: `A importação falhou, e o banco em uso ficou como estava: ${(error as Error).message}` };
  } finally {
    await runServer(host, to.startsWith("file:") ? undefined : to);
  }
}

/**
 * Applies this version's migrations to an old server's database, which change its structure and keep its data.
 * @param host The server.
 * @param source The old server.
 * @returns Done, or why not.
 */
async function migrateImport(host: ServerHost, source: Source): Promise<Outcome> {
  try {
    await runTask(host, { task: "migrate", url: sourceUrl(source), keys: sourceKeys(source) ?? undefined });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: `Não foi possível atualizar o banco antigo: ${openError(error as Error)}` };
  }
}

/**
 * Words why a database didn't open, saying what an encrypted SQLite file without its key looks like.
 * @param error What the task failed with.
 * @returns The reason.
 */
function openError(error: Error): string {
  return /file is not a database/.test(error.message)
    ? "o arquivo é criptografado, e a chave de recuperação dele não veio ou não é a dele; ou ele não é um banco."
    : error.message;
}

/**
 * Tells whether the server the phone reaches is on: the app's own, or another one it found on its port.
 * @returns False while the app's own server is off, or before it started.
 */
export function ownServerOn(): boolean {
  return portTaken || (stopServer !== undefined && failure === undefined);
}

/**
 * Builds the server's setup on the database in use: PostgreSQL's address, or the SQLite file with its key, made the
 * first time.
 * @param host The server.
 * @returns The setup.
 */
function ownSetup(host: ServerHost): ServerSetup {
  const config = readConfig(host.setup.userData);
  const databaseUrl = config.database === "postgresql" ? openDatabaseUrl(config, safeStorage) : undefined;
  const sqlite = databaseUrl ? undefined : ensureSqliteKey(host.setup.userData, safeStorage);
  return { ...host.setup, databaseUrl, sqliteKey: sqlite && "key" in sqlite ? sqlite.key : undefined };
}

/**
 * Gives the SQLite key's recovery copy while the user hasn't said it is kept.
 * @param host The server.
 * @returns The key in groups of 8, or null once it is kept, or on PostgreSQL.
 */
function recoveryKey(host: ServerHost): string | null {
  // A server that isn't on may hold a key that doesn't open its file: none is shown as the one to keep.
  if (failure) {
    return null;
  }
  const config = readConfig(host.setup.userData);
  const key = config.database !== "postgresql" && recoveryKeyPending(config) ? ownSetup(host).sqliteKey : undefined;
  return key ? formatRecoveryKey(key) : null;
}

/**
 * Tells the page the server isn't on, and why, keeping it for a page that asks later.
 * @param host The server.
 * @param kind What kept it off.
 * @param owner For a taken port, the program holding it, when the system says which.
 */
function reportFailure(host: ServerHost, kind: FailureKind, owner?: PortOwner): void {
  const log = path.join(host.setup.userData, "logs", "api.log");
  let logText = "";
  try {
    logText = readFileSync(log, "utf8").slice(-65_536);
  } catch {
    // No log yet.
  }
  failure = serverFailure(kind, logText, log, { port: host.setup.port, owner });
  console.warn(`The bundled server isn't on: ${failure.reason}`);
  host.window.webContents.send(SERVER_FAILED_CHANNEL, failure);
}

/**
 * Starts the server on a database, stopping the one running first, and waits for it to answer; when it doesn't, the
 * page is told why (see reportFailure).
 * @param host The server.
 * @param databaseUrl PostgreSQL's address, or undefined for the SQLite file in userData.
 * @returns Whether it answers.
 */
async function runServer(host: ServerHost, databaseUrl: string | undefined): Promise<boolean> {
  await stopServer?.();
  failure = undefined;
  if (!(await portFree(host.setup.port))) {
    console.warn(`Port ${host.setup.port} is taken; the server isn't started.`);
    stopServer = undefined;
    reportFailure(host, "portInUse", await portOwner(host.setup.port));
    return false;
  }
  const sqlite = databaseUrl ? undefined : ensureSqliteKey(host.setup.userData, safeStorage);
  if (sqlite && "problem" in sqlite) {
    console.warn(
      sqlite.problem === "missing"
        ? "config.json keeps no key for the encrypted SQLite file; the server stays off until the recovery copy is typed back."
        : "config.json keeps a SQLite key this Windows user can't open; the server stays off.",
    );
    stopServer = undefined;
    reportFailure(host, sqlite.problem === "missing" ? "keyMissing" : "key");
    return false;
  }
  const sqliteKey = sqlite?.key;
  console.log(`Starting the bundled server from ${host.setup.serverDir}`);
  const gaveUp = new AbortController();
  stopServer = startBundledServer({ ...host.setup, databaseUrl, sqliteKey }, (code) => {
    if (code !== PORT_IN_USE_EXIT_CODE) {
      reportFailure(host, code === WRONG_KEY_EXIT_CODE ? "keyWrong" : "stopped");
      gaveUp.abort();
      return;
    }
    // Taken since the check: the program holding it is looked up before the wait ends, so the page hears it.
    void portOwner(host.setup.port).then((owner) => {
      reportFailure(host, "portInUse", owner);
      gaveUp.abort();
    });
  });
  const answers = await waitForApi(host.apiUrl, gaveUp.signal);
  if (!answers && !gaveUp.signal.aborted) {
    console.warn(`The bundled server didn't answer in time. See logs/api.log in ${host.setup.userData}.`);
    reportFailure(host, "timeout");
  }
  return answers;
}

/**
 * Runs a database task beside the server, with the server's environment: its database in use and the SQLite file's
 * key.
 * @param host The server.
 * @param task The task.
 * @returns What it gave.
 */
function runTask<T>(host: ServerHost, task: ServerTask): Promise<T> {
  return runServerTask<T>(host.setup.serverDir, serverEnvironment(ownSetup(host)), task);
}

/**
 * Builds the settings the page shows.
 * @param host The server.
 * @returns The database in use and where, the photos' folder, the port and the phone's address, whether PostgreSQL's
 * address is still missing, and whether the SQLite key's recovery copy is still to be kept; or that another server
 * took the port.
 */
function settings(host: ServerHost): object {
  if (portTaken) {
    return { kind: "portTaken", port: host.setup.port };
  }
  const config = readConfig(host.setup.userData);
  const data = serverData(host.setup.userData);
  const onPostgresql = config.database === "postgresql";
  const postgresql = onPostgresql ? openDatabaseUrl(config, safeStorage) : undefined;
  return {
    kind: "own",
    database: onPostgresql ? "postgresql" : "sqlite",
    location: postgresql ? describePostgresql(postgresql) : onPostgresql ? "" : data.folder,
    photos: data.photos,
    port: host.setup.port,
    phoneAddress: phoneAddress(os.networkInterfaces()),
    needsAddress: needsDatabaseAddress(config, safeStorage),
    recoveryKeyPending: !onPostgresql && recoveryKeyPending(config),
  };
}

/**
 * Gives the keys an import's task needs for the old server: the recovery copy of an encrypted SQLite file's key.
 * @param source The old server.
 * @returns The keys by DATABASE_URL, undefined when it needs none, or null when the copy typed isn't a key.
 */
function sourceKeys(source: Source): Record<string, string> | undefined | null {
  if (source.kind !== "sqlite" || !source.key?.trim()) {
    return undefined;
  }
  const key = readRecoveryKey(source.key);
  return key ? { [sourceUrl(source)]: key } : null;
}

/**
 * Turns an old server into its DATABASE_URL.
 * @param source The old server.
 * @returns PostgreSQL's address, or "file:" and the SQLite file.
 */
function sourceUrl(source: Source): string {
  return source.kind === "postgresql" ? source.url : `file:${path.resolve(source.file)}`;
}

/**
 * Starts the server the app runs when it opens, unless another already answers on its port, or PostgreSQL was chosen
 * with no address yet, when it waits for the page to ask for it. Meanwhile the window shows "Ligando o servidor".
 * @param host The server.
 * @returns "waiting" when the server waits for PostgreSQL's address, otherwise "started".
 */
export async function startOwnServer(host: ServerHost): Promise<"started" | "waiting"> {
  if (await apiAnswers(host.apiUrl)) {
    console.log(`A server already answers at ${host.apiUrl}; using it.`);
    portTaken = true;
    stopWatching = watchServer(() => apiAnswers(host.apiUrl), () => void takeOverPort(host));
    return "started";
  }
  const config = readConfig(host.setup.userData);
  if (needsDatabaseAddress(config, safeStorage)) {
    console.log("PostgreSQL was chosen with no address yet; the page asks for it.");
    return "waiting";
  }
  await host.window.loadFile(host.startingPage);
  await runServer(host, openDatabaseUrl(config, safeStorage));
  return "started";
}

/**
 * Stops the server the app runs, as the app quits or before it installs an update.
 * @returns Once it has exited, or after the stop's timeout.
 */
export async function stopOwnServer(): Promise<void> {
  stopWatching?.();
  await stopServer?.();
  stopServer = undefined;
}

/**
 * Starts the app's own server once the one it used on the port is gone, showing "Ligando o servidor" meanwhile, then
 * the app again.
 * @param host The server.
 */
async function takeOverPort(host: ServerHost): Promise<void> {
  console.log(`The server at ${host.apiUrl} is gone; starting the app's own.`);
  portTaken = false;
  stopWatching = undefined;
  const config = readConfig(host.setup.userData);
  if (!needsDatabaseAddress(config, safeStorage)) {
    await host.window.loadFile(host.startingPage);
    await runServer(host, openDatabaseUrl(config, safeStorage));
  }
  await host.window.loadURL(host.appUrl);
}

/**
 * Moves the server to another port, kept in config.json: checks the port is free, then restarts the server on it,
 * where the window follows it. The phone's address changes with it, which the page warns about first.
 * @param host The server.
 * @param port The new port.
 * @returns Done, or why not; then the server stays where it was.
 */
async function usePort(host: ServerHost, port: number): Promise<Outcome> {
  if (!validPort(port)) {
    return { ok: false, message: `A porta é um número de ${MIN_PORT} a ${MAX_PORT}.` };
  }
  if (port === host.setup.port && ownServerOn() && !portTaken) {
    return { ok: true };
  }
  if (port !== host.setup.port && !(await portFree(port))) {
    return { ok: false, message: serverFailure("portInUse", "", "", { port, owner: await portOwner(port) }).reason };
  }
  console.log(`Moving the bundled server to port ${port}.`);
  stopWatching?.();
  stopWatching = undefined;
  portTaken = false;
  updateConfig(host.setup.userData, { port });
  host.setup.port = port;
  host.apiUrl = `http://127.0.0.1:${port}`;
  return (await runServer(host, openDatabaseUrl(readConfig(host.setup.userData), safeStorage)))
    ? { ok: true }
    : { ok: false, message: failure?.reason ?? `O servidor não ligou na porta ${port}. Veja logs\\api.log em ${host.setup.userData}.` };
}

/**
 * Moves the server to a PostgreSQL database: checks it connects and is empty or an APC server's, migrates it, keeps
 * its address sealed in config.json, and restarts the server on it.
 * @param host The server.
 * @param url PostgreSQL's address, e.g. "postgresql://postgres:secret@localhost:5432/apc".
 * @returns Done, or why not; then the server stays on its database.
 */
async function usePostgresql(host: ServerHost, url: string): Promise<Outcome> {
  if (!isPostgresqlUrl(url)) {
    return { ok: false, message: "O endereço começa com postgresql://, como postgresql://usuário:senha@localhost:5432/apc." };
  }
  if (!safeStorage.isEncryptionAvailable()) {
    return { ok: false, message: "O Windows não deixou guardar o endereço com segurança, então ele não foi salvo." };
  }
  let check: DatabaseCheck;
  try {
    check = await runTask<DatabaseCheck>(host, { task: "check", url });
  } catch (error) {
    return { ok: false, message: `Não foi possível conectar ao PostgreSQL: ${(error as Error).message}` };
  }
  const refused = databaseCheckMessage(check);
  if (refused) {
    return { ok: false, message: refused };
  }
  try {
    await runTask(host, { task: "migrate", url });
  } catch (error) {
    return { ok: false, message: `Não foi possível preparar o banco: ${(error as Error).message}` };
  }
  updateConfig(host.setup.userData, { database: "postgresql", databaseUrl: seal(url, safeStorage) });
  return (await runServer(host, url))
    ? { ok: true }
    : { ok: false, message: `O servidor não ligou com esse banco. Veja logs\\api.log em ${host.setup.userData}.` };
}

/**
 * Brings back the SQLite file's key from its recovery copy, as typed: checks it opens the file, keeps it sealed in
 * config.json in place of a missing or wrong one, and starts the server on it.
 * @param host The server.
 * @param text The recovery copy, as typed.
 * @returns Done, or why not; then config.json is left as it was.
 */
async function useRecoveryKey(host: ServerHost, text: string): Promise<Outcome> {
  const key = readRecoveryKey(text);
  if (!key) {
    return { ok: false, message: "A chave de recuperação tem 64 letras e números, de 0 a 9 e de A a F; os traços não contam." };
  }
  if (!safeStorage.isEncryptionAvailable()) {
    return { ok: false, message: "O Windows não deixou guardar a chave com segurança, então ela não foi salva." };
  }
  const url = `file:${serverData(host.setup.userData).sqliteFile}`;
  await stopServer?.();
  let opens: boolean;
  try {
    opens = await runTask<boolean>(host, { task: "keyOpens", url, keys: { [url]: key } });
  } catch (error) {
    return { ok: false, message: `Não foi possível conferir a chave: ${(error as Error).message}` };
  }
  if (!opens) {
    return { ok: false, message: "Essa chave não abre o banco deste computador. Confira se é a chave de recuperação deste app." };
  }
  console.log("The recovery copy opens the SQLite file; it is kept sealed in config.json.");
  updateConfig(host.setup.userData, { database: "sqlite", sqliteKey: seal(key, safeStorage), sqliteKeySaved: true });
  return (await runServer(host, undefined))
    ? { ok: true }
    : { ok: false, message: failure?.reason ?? `O servidor não ligou. Veja logs\\api.log em ${host.setup.userData}.` };
}

/**
 * Moves the server back to the SQLite file in userData, forgetting PostgreSQL's address, and restarts it there.
 * @param host The server.
 * @returns Done, or why not.
 */
async function useSqlite(host: ServerHost): Promise<Outcome> {
  updateConfig(host.setup.userData, { database: "sqlite", databaseUrl: undefined });
  return (await runServer(host, undefined))
    ? { ok: true }
    : { ok: false, message: `O servidor não ligou. Veja logs\\api.log em ${host.setup.userData}.` };
}
