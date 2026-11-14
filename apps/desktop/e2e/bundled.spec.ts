import { existsSync, readdirSync, readFileSync } from "node:fs";
import { request } from "node:https";
import { createServer } from "node:net";
import { networkInterfaces } from "node:os";
import path from "node:path";
import type { ElectronApplication, Page } from "@playwright/test";
import { APP_DIR, expect, freePort, logIn, test } from "./support/fixtures.ts";
import { fingerprintGroups } from "@apc/domain/pairing";
import { TEST_TAGS } from "@apc/domain/test-tags";
import { readConfig, writeConfig } from "../src/config.ts";
import { certificateFingerprint } from "../src/server/certificate.ts";
import { phoneAddress } from "../src/system/tray.ts";
import { loginForm, registerForm } from "../../web/e2e/locators/auth.ts";
import { tour } from "../../web/e2e/locators/common.ts";
import { aboutDialog, dashboard, userMenu } from "../../web/e2e/locators/dashboard.ts";
import { inventory } from "../../web/e2e/locators/inventory.ts";
import { databaseChoice, firstStart, recoveryKey, serverFailure, serverSettings } from "../../web/e2e/locators/setup.ts";

// The desktop app with the server it ships (server/, from scripts/bundle-server.mjs), as an installed app runs: no
// APC_API_URL and no clone, its own userData folder, and a free port in place of 3000 (support/fixtures.ts). Run
// `pnpm run build` first, which bundles the server. A fresh install shows its SQLite key's recovery copy on opening,
// which each test keeps before going on.

test.use({ server: "bundled" });


/**
 * Tells whether a server answers.
 * @param server Its address.
 * @returns "up" or "down".
 */
function healthOf(server: string): Promise<"up" | "down"> {
  return fetch(`${server}/health`).then(
    (response) => (response.ok ? "up" : "down"),
    () => "down",
  );
}

/**
 * Asks a server's /health over HTTPS, trusting one certificate alone, whatever address it names, as the phone does.
 * @param server The server's address, e.g. "https://192.168.0.10:3000".
 * @param cert The certificate to trust, PEM.
 * @returns "up" when it answers with a success, "down" otherwise.
 */
function pinnedHealthOf(server: string, cert: string): Promise<"up" | "down"> {
  return new Promise((resolve) => {
    const asked = request(`${server}/health`, { ca: cert, checkServerIdentity: () => undefined }, (response) => {
      response.resume();
      resolve(response.statusCode === 200 ? "up" : "down");
    });
    asked.on("error", () => resolve("down"));
    asked.end();
  });
}


/**
 * Keeps the SQLite key's recovery copy that a fresh install shows on opening: reads it and says it is kept.
 * @param page The app's window.
 * @returns The recovery copy, e.g. "1F2E3D4C-…".
 */
async function keepRecoveryKey(page: Page): Promise<string> {
  const copy = recoveryKey(page);
  const key = (await copy.key.textContent({ timeout: 60_000 })) ?? "";
  await copy.kept.click();
  await expect(copy.root).toBeHidden();
  return key;
}

/**
 * Opens the Servidor dialog as the tray's "Servidor e banco de dados…" does.
 * @param app The running app.
 */
async function openServerSettings(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send("apc:open-server-settings"));
}

/**
 * Answers the first start's offer to import an old server, which an empty database shows once the recovery copy is
 * kept, with "Começar do zero".
 * @param page The app's window.
 */
async function startFromScratch(page: Page): Promise<void> {
  const choice = firstStart(page);
  await choice.scratch.click();
  await expect(choice.root).toBeHidden();
}

/**
 * Signs Ana up from the login, and skips the Inventory tutorial her first login starts, leaving the empty Inventory.
 * @param page The app's window.
 */
async function signUp(page: Page): Promise<void> {
  await loginForm(page).signUp.click();
  const form = registerForm(page);
  await form.displayName.fill("Ana Souza");
  await form.username.fill("ana.souza");
  await form.email.fill("ana@oficina.com");
  await form.password.fill("freio1234");
  await form.confirm.fill("freio1234");
  await form.submit.click();
  await expect(dashboard(page).tab("inventory")).toHaveAttribute("aria-selected", "true");
  await tour(page).skip.click();
  await expect(inventory(page).empty).toBeVisible();
}

// Opens the app with no server named, and checks it starts its own: the login shows, a sign-up goes on to the empty
// Inventory, and the database, the photos' folder and the server's log are in userData. Closing the app waits for the
// server to stop, which its log and the app's log record.
test("Desktop: the app runs the server it ships, with its data in userData", { tag: [TEST_TAGS.setup, TEST_TAGS.bundled] }, async ({ launchApp }) => {
  const { app, userData, server } = await launchApp();
  const page = await app.firstWindow();
  await expect(page).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });
  await keepRecoveryKey(page);
  await startFromScratch(page);

  await signUp(page);

  expect(existsSync(path.join(userData, "data", "apc.db"))).toBe(true);
  expect(existsSync(path.join(userData, "logs", "api.log"))).toBe(true);
  const health = await (await fetch(`${server}/health`)).json();
  expect(health.version).toBe(await app.evaluate(({ app: electronApp }) => electronApp.getVersion()));

  await app.close();
  await expect.poll(() => healthOf(server)).toBe("down");
  const apiLog = readFileSync(path.join(userData, "logs", "api.log"), "utf8");
  expect(apiLog.slice(apiLog.lastIndexOf("Starting the server."))).toMatch(/The server stopped \(exit code -?\d+\)\./);
  expect(readFileSync(path.join(userData, "logs", "app.log"), "utf8")).toContain("Storage written and the server stopped; quitting.");
});

// Signs up on a fresh install and opens "Sobre esta versão" from the user menu, and checks it shows the app's own
// version and the first heading of that version's notes in Portuguese, which came with the web build. The window
// reports reduced motion, as every smoke test starts the app, so the menu and the dialog open at once.
test("Desktop: Sobre esta versão shows the app's version and its notes", { tag: [TEST_TAGS.dashboard, TEST_TAGS.bundled] }, async ({ launchApp }) => {
  const { app } = await launchApp();
  const page = await app.firstWindow();
  await expect(page).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await keepRecoveryKey(page);
  await startFromScratch(page);
  await signUp(page);
  const version = await app.evaluate(({ app: electronApp }) => electronApp.getVersion());
  const notes = readFileSync(path.join(APP_DIR, "..", "..", "docs", "releases", `v${version}.md`), "utf8");
  const heading = /^### (.+)$/m.exec(notes.slice(notes.search(/^---\s*$/m)))![1].trim();

  const menu = userMenu(page);
  await menu.trigger.click();
  await menu.item("Sobre esta versão").click();
  const about = aboutDialog(page);
  await expect(about.version(version)).toBeVisible();
  await expect(about.heading(heading).first()).toBeVisible();
});

// Opens a fresh install and checks it offers to import an old server once the recovery copy is kept, and "Importar de
// um servidor antigo" opens the Servidor dialog on its import. The offer shows again on the next start, while the
// database is empty; once someone signs up, the start after offers nothing, and config.json keeps it over.
test("Desktop: a fresh install offers to import an old server until someone signs up", { tag: [TEST_TAGS.setup, TEST_TAGS.bundled] }, async ({ launchApp }) => {
  const first = await launchApp();
  let page = await first.app.firstWindow();
  await keepRecoveryKey(page);
  await firstStart(page).importOld.click();
  await expect(serverSettings(page).heading("Importar dados de outro servidor")).toBeInViewport();
  await first.app.close();

  const second = await launchApp({ userData: first.userData });
  page = await second.app.firstWindow();
  const choice = firstStart(page);
  await expect(choice.root).toBeVisible({ timeout: 60_000 });
  await page.keyboard.press("Escape");
  await expect(choice.root).toBeHidden();
  await signUp(page);
  expect(readConfig(first.userData).firstStartDone).toBeUndefined();
  await second.app.close();

  const third = await launchApp({ userData: first.userData });
  page = await third.app.firstWindow();
  await expect(dashboard(page).tab("inventory")).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => readConfig(first.userData).firstStartDone, { timeout: 30_000 }).toBe(true);
  await expect(firstStart(page).root).toHaveCount(0);
});

// Closes the window, and checks it is hidden, not closed, with the server still answering; opening the app again
// shows the same window, and quitting, as "Sair" in the tray does, turns the server off and closes the app.
test("Desktop: closing the window keeps the server on in the tray, until the app quits", { tag: [TEST_TAGS.setup, TEST_TAGS.bundled] }, async ({ launchApp }) => {
  const { app, server } = await launchApp();
  const page = await app.firstWindow();
  await expect(page).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });
  const visible = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((window) => window.isVisible()));

  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await expect.poll(visible).toEqual([false]);
  expect(await healthOf(server)).toBe("up");

  await app.evaluate(({ app: electronApp }) => electronApp.emit("second-instance"));
  await expect.poll(visible).toEqual([true]);

  const closed = app.waitForEvent("close");
  await app.evaluate(({ app: electronApp }) => electronApp.quit());
  await expect.poll(() => healthOf(server)).toBe("down");
  await closed;
});

// Opens the Servidor dialog as the tray does, picks PostgreSQL with an address no server listens on, and checks the
// dialog says it didn't connect, SQLite stays in use, config.json keeps no address, and the server still answers.
test("Desktop: a PostgreSQL address that doesn't connect says so and keeps SQLite", { tag: [TEST_TAGS.setup, TEST_TAGS.bundled] }, async ({ launchApp }) => {
  const { app, userData, server } = await launchApp();
  const page = await app.firstWindow();
  await expect(page).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });
  await keepRecoveryKey(page);
  await openServerSettings(app);
  const settings = serverSettings(page);
  await expect(settings.inUse(`SQLite criptografado, em ${path.join(userData, "data")}`)).toBeVisible();

  await settings.database("PostgreSQL").click();
  await settings.field("Endereço do PostgreSQL").fill("postgresql://apc:segredo@127.0.0.1:1/apc");
  await settings.button("Usar PostgreSQL").click();
  await expect(settings.failed).toContainText("Não foi possível conectar ao PostgreSQL", { timeout: 30_000 });
  await expect(settings.inUse(/^SQLite criptografado, em /)).toBeVisible();
  expect(readConfig(userData)).not.toHaveProperty("databaseUrl");
  expect(await healthOf(server)).toBe("up");
});

// Signs up on one install, then imports its encrypted SQLite file into a fresh one through the Servidor dialog, opened
// from the login screen, with the file dialog answered as the user would and the old install's recovery copy typed,
// and checks every table's rows show and the account logs in on the new install.
test("Desktop: an old server's SQLite file imports into a fresh install", { tag: [TEST_TAGS.setup, TEST_TAGS.bundled] }, async ({ launchApp }) => {
  const old = await launchApp();
  const oldPage = await old.app.firstWindow();
  await expect(oldPage).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });
  const oldKey = await keepRecoveryKey(oldPage);
  await startFromScratch(oldPage);
  await signUp(oldPage);
  await old.app.close();

  const { app } = await launchApp();
  const page = await app.firstWindow();
  await expect(page).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });
  await keepRecoveryKey(page);
  // The empty database's offer to import comes over the login once its check answers; Escape puts it off for now.
  const offer = firstStart(page);
  await expect(offer.root).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(offer.root).toBeHidden();
  const file = path.join(old.userData, "data", "apc.db");
  await app.evaluate(({ dialog }, chosen) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [chosen] })) as typeof dialog.showOpenDialog;
  }, file);
  await loginForm(page).server.click();
  const settings = serverSettings(page);
  await settings.button("Escolher o arquivo").click();
  await expect(settings.file(file)).toBeVisible();
  await settings.field("Chave de recuperação do arquivo").fill(oldKey);
  await settings.button("Importar").click();
  await expect(settings.done).toHaveText("Pronto: os dados do servidor antigo estão neste servidor.", { timeout: 60_000 });
  await expect(settings.copied("Usuários: 1 de 1")).toBeVisible();

  await settings.close.click();
  await expect(page).toHaveURL(/^app:\/\/apc\/login/);
  await logIn(page, { username: "ana.souza", password: "freio1234" });
});

// Starts the app after the installer's PostgreSQL choice, and checks the server waits while the dialog asks for the
// address, and "Usar SQLite" starts it on SQLite, saved in config.json, and goes on to the login.
test("Desktop: with PostgreSQL chosen at install, the app asks for its address before starting the server", { tag: [TEST_TAGS.setup, TEST_TAGS.bundled] }, async ({ launchApp }) => {
  const { app, userData, server } = await launchApp({ files: { "installer-database.txt": "postgresql" } });
  const page = await app.firstWindow();
  const choice = databaseChoice(page);
  await expect(choice.root).toBeVisible({ timeout: 60_000 });
  expect(await healthOf(server)).toBe("down");
  await choice.useSqlite.click();
  await expect.poll(() => healthOf(server), { timeout: 60_000 }).toBe("up");
  await expect(choice.root).toBeHidden();
  await keepRecoveryKey(page);
  await expect(loginForm(page).submit).toBeVisible();
  expect(readConfig(userData).database).toBe("sqlite");
});

// Signs up on a fresh install and quits, and checks the SQLite file isn't plain SQLite and holds no text of the account,
// config.json holds the key only sealed, and on the next start the same key opens the file: the account logs in, and
// the recovery copy, already kept, doesn't show again.
test("Desktop: the SQLite file is encrypted with a key kept for the next start", { tag: [TEST_TAGS.setup, TEST_TAGS.bundled] }, async ({ launchApp }) => {
  const first = await launchApp();
  const firstPage = await first.app.firstWindow();
  await expect(firstPage).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });
  const key = (await keepRecoveryKey(firstPage)).replaceAll("-", "").toLowerCase();
  await startFromScratch(firstPage);
  await signUp(firstPage);
  await first.app.close();

  const data = path.join(first.userData, "data", "apc.db");
  expect(readFileSync(data).subarray(0, 15).toString("latin1")).not.toBe("SQLite format 3");
  for (const file of [data, `${data}-wal`].filter((each) => existsSync(each))) {
    expect(readFileSync(file).includes("ana.souza")).toBe(false);
  }
  expect(readFileSync(path.join(first.userData, "config.json"), "utf8").includes(key)).toBe(false);
  expect(readConfig(first.userData).sqliteKeySaved).toBe(true);

  const { app } = await launchApp({ userData: first.userData });
  const page = await app.firstWindow();
  await expect(page).toHaveURL(/^app:\/\/apc\//, { timeout: 60_000 });
  await expect(dashboard(page).tab("inventory")).toHaveAttribute("aria-selected", "true");
  await expect(recoveryKey(page).root).toHaveCount(0);
});

// Starts the app on a database from before its migrations, as an update that brings new ones finds it, and checks the
// server copies it to data/backups first, named after the app's version, then migrates it and answers.
test("Desktop: the database is copied before the server applies new migrations", { tag: [TEST_TAGS.setup, TEST_TAGS.bundled] }, async ({ launchApp }) => {
  const { app, userData } = await launchApp({ files: { [path.join("data", "apc.db")]: "" } });
  const page = await app.firstWindow();
  await expect(page).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });
  const version = await app.evaluate(({ app: electronApp }) => electronApp.getVersion());
  expect(readdirSync(path.join(userData, "data", "backups"))).toEqual([expect.stringMatching(new RegExp(`^apc-before-${version.replaceAll(".", "\\.")}-.+\\.db$`))]);
  await keepRecoveryKey(page);
  await startFromScratch(page);
  await signUp(page);
});

// Starts the app on PostgreSQL at an address no server answers, as when its server is off, which the server fails to
// migrate each time it starts, and checks that once the server gave up starting, the window says it didn't start, with
// the last error of its log and where that log is, instead of the login, and the app's log says so too.
test("Desktop: a server that can't start is said so, with why", { tag: [TEST_TAGS.setup, TEST_TAGS.bundled] }, async ({ launchApp }) => {
  test.setTimeout(150_000);
  const first = await launchApp();
  const address = await first.app.evaluate(({ safeStorage }) =>
    safeStorage.encryptString("postgresql://apc:segredo@127.0.0.1:1/apc").toString("base64"),
  );
  await first.app.close();
  writeConfig(first.userData, { ...readConfig(first.userData), database: "postgresql", databaseUrl: address });
  const { app, userData } = await launchApp({ userData: first.userData });
  const page = await app.firstWindow();
  const failure = serverFailure(page).root;
  await expect(failure).toBeVisible({ timeout: 90_000 });
  await expect(failure).toContainText("O servidor parou ao ligar, várias vezes seguidas. Último erro:");
  await expect(failure).toContainText(path.join(userData, "logs", "api.log"));
  expect(readFileSync(path.join(userData, "logs", "app.log"), "utf8")).toContain("The bundled server isn't on");
});

// Closes the window of a fresh install to the tray, in the same session that made the SQLite key, and checks
// config.json still holds the key next to the tray's notice, and the next start opens the data with it: the account
// signed up logs in.
test("Desktop: closing the window to the tray keeps the SQLite key", { tag: [TEST_TAGS.setup, TEST_TAGS.bundled] }, async ({ launchApp }) => {
  const first = await launchApp();
  const page = await first.app.firstWindow();
  await expect(page).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });
  await keepRecoveryKey(page);
  await startFromScratch(page);
  await signUp(page);
  await first.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await expect.poll(() => readConfig(first.userData).trayNoticeShown).toBe(true);
  expect(readConfig(first.userData)).toMatchObject({ sqliteKey: expect.any(String), sqliteKeySaved: true });
  await first.app.evaluate(({ app: electronApp }) => electronApp.quit());
  await first.app.waitForEvent("close");

  const { app } = await launchApp({ userData: first.userData });
  const next = await app.firstWindow();
  await expect(dashboard(next).tab("inventory")).toHaveAttribute("aria-selected", "true", { timeout: 60_000 });
  await expect(serverFailure(next).root).toHaveCount(0);
});

// Signs up on a fresh install, keeping the recovery copy, then opens it again with no key in config.json, and then
// with another key sealed there, as a config.json written from a stale copy left it: each start says the key doesn't
// open the data, makes no key of its own and shows no recovery copy to keep. A copy that isn't the file's is refused;
// the one kept opens the data again, where the account's session still is.
test("Desktop: a missing or wrong SQLite key is asked for, never replaced", { tag: [TEST_TAGS.setup, TEST_TAGS.bundled] }, async ({ launchApp }) => {
  test.setTimeout(150_000);
  const first = await launchApp();
  const firstPage = await first.app.firstWindow();
  await expect(firstPage).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });
  const copy = await keepRecoveryKey(firstPage);
  await startFromScratch(firstPage);
  await signUp(firstPage);
  const wrongKey = await first.app.evaluate(({ safeStorage }) => safeStorage.encryptString("ab".repeat(32)).toString("base64"));
  await first.app.close();
  const { userData } = first;
  const kept = readConfig(userData);

  writeConfig(userData, { ...kept, sqliteKey: undefined, sqliteKeySaved: undefined });
  const missing = await launchApp({ userData });
  const missingPage = await missing.app.firstWindow();
  await expect(serverFailure(missingPage).root).toContainText("A chave do banco SQLite não está mais neste computador.", { timeout: 60_000 });
  expect(readConfig(userData).sqliteKey).toBeUndefined();
  await expect(recoveryKey(missingPage).root).toHaveCount(0);
  await missing.app.close();

  writeConfig(userData, { ...kept, sqliteKey: wrongKey, sqliteKeySaved: false });
  const { app } = await launchApp({ userData });
  const page = await app.firstWindow();
  const failure = serverFailure(page);
  await expect(failure.root).toContainText("A chave do banco SQLite guardada neste computador não abre o arquivo dele.", { timeout: 60_000 });
  expect(readConfig(userData).sqliteKey).toBe(wrongKey);
  await expect(recoveryKey(page).root).toHaveCount(0);

  await failure.key.fill("cd".repeat(32));
  await failure.useKey.click();
  await expect(failure.refused).toBeVisible({ timeout: 30_000 });
  await failure.key.fill(copy);
  await failure.useKey.click();
  // The copy is checked and kept, and the server started on it, while the screen shows its spinner.
  await expect.poll(() => readConfig(userData).sqliteKeySaved, { timeout: 60_000 }).toBe(true);
  expect(readConfig(userData).sqliteKey).not.toBe(wrongKey);
  // Ana's session, from before the key was lost, is still in the data the key opens again.
  await expect(dashboard(page).tab("inventory")).toHaveAttribute("aria-selected", "true", { timeout: 60_000 });
  await expect(failure.root).toHaveCount(0);
  await expect(inventory(page).empty).toBeVisible();
});

/**
 * Changes the SQLite key from the Servidor dialog, as the tray opens it, and keeps the new key's recovery copy.
 * @param app The running app.
 * @param page Its window.
 * @returns The new recovery copy.
 */
async function changeKey(app: ElectronApplication, page: Page): Promise<string> {
  await openServerSettings(app);
  const settings = serverSettings(page);
  await settings.button("Trocar a chave").click();
  await settings.button("Trocar a chave mesmo assim").click();
  await expect(settings.done).toHaveText("Pronto: o banco tem uma chave nova. Guarde a cópia de recuperação dela.", { timeout: 60_000 });
  return keepRecoveryKey(page);
}

// Signs up, then changes the SQLite key from the Servidor dialog, and checks the new recovery copy shows, config.json
// keeps no key apart, and the next start opens the data with the new key. Then, with the key taken out of
// config.json, the old recovery copy no longer opens the data, and the new one does.
test("Desktop: the SQLite key changes, and the old recovery copy no longer opens the data", { tag: [TEST_TAGS.setup, TEST_TAGS.bundled] }, async ({ launchApp }) => {
  test.setTimeout(180_000);
  const first = await launchApp();
  const firstPage = await first.app.firstWindow();
  await expect(firstPage).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });
  const oldCopy = await keepRecoveryKey(firstPage);
  await startFromScratch(firstPage);
  await signUp(firstPage);
  const before = readConfig(first.userData).sqliteKey;
  const newCopy = await changeKey(first.app, firstPage);
  expect(newCopy).not.toBe(oldCopy);
  const changed = readConfig(first.userData);
  expect(changed.sqliteKey).not.toBe(before);
  expect(changed).toMatchObject({ sqliteKeySaved: true });
  expect(changed).not.toHaveProperty("sqliteKeyNext");
  await first.app.close();
  const { userData } = first;

  const again = await launchApp({ userData });
  const againPage = await again.app.firstWindow();
  await expect(dashboard(againPage).tab("inventory")).toHaveAttribute("aria-selected", "true", { timeout: 60_000 });
  await expect(inventory(againPage).empty).toBeVisible();
  await again.app.close();

  writeConfig(userData, { ...readConfig(userData), sqliteKey: undefined, sqliteKeySaved: undefined });
  const { app } = await launchApp({ userData });
  const page = await app.firstWindow();
  const failure = serverFailure(page);
  await expect(failure.root).toBeVisible({ timeout: 60_000 });
  await failure.key.fill(oldCopy);
  await failure.useKey.click();
  await expect(failure.refused).toBeVisible({ timeout: 30_000 });
  await failure.key.fill(newCopy);
  await failure.useKey.click();
  await expect.poll(() => readConfig(userData).sqliteKeySaved, { timeout: 60_000 }).toBe(true);
  await expect(inventory(page).empty).toBeVisible({ timeout: 60_000 });
});

// Leaves config.json as a change of the SQLite key cut short leaves it, and checks the next start ends it with the key
// that opens the file: cut short after the file changed, the new key, apart as sqliteKeyNext, becomes the key in use;
// cut short before, a new key that opens nothing is dropped and the key in use stays. Each start opens the data.
test("Desktop: a change of the SQLite key cut short is ended on the next start", { tag: [TEST_TAGS.setup, TEST_TAGS.bundled] }, async ({ launchApp }) => {
  test.setTimeout(180_000);
  const first = await launchApp();
  const firstPage = await first.app.firstWindow();
  await expect(firstPage).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });
  await keepRecoveryKey(firstPage);
  await startFromScratch(firstPage);
  await signUp(firstPage);
  const before = readConfig(first.userData).sqliteKey;
  await changeKey(first.app, firstPage);
  const inUse = readConfig(first.userData).sqliteKey;
  const strayKey = await first.app.evaluate(({ safeStorage }) => safeStorage.encryptString("cd".repeat(32)).toString("base64"));
  await first.app.close();
  const { userData } = first;
  const opensTheData = async () => {
    const { app } = await launchApp({ userData });
    const page = await app.firstWindow();
    await expect(dashboard(page).tab("inventory")).toHaveAttribute("aria-selected", "true", { timeout: 60_000 });
    await expect(inventory(page).empty).toBeVisible();
    await app.close();
  };

  writeConfig(userData, { ...readConfig(userData), sqliteKey: before, sqliteKeyNext: inUse });
  await opensTheData();
  expect(readConfig(userData).sqliteKey).toBe(inUse);
  expect(readConfig(userData)).not.toHaveProperty("sqliteKeyNext");

  writeConfig(userData, { ...readConfig(userData), sqliteKeyNext: strayKey });
  await opensTheData();
  expect(readConfig(userData).sqliteKey).toBe(inUse);
  expect(readConfig(userData)).not.toHaveProperty("sqliteKeyNext");
});

// Holds the app's port on 127.0.0.1 with this test's own Node before the app opens, and checks the window says the port is in use
// by that program, naming its process, and the server was never started; then "Usar outra porta" moves the server to a
// free port, kept in config.json, where it answers and the login shows, with the SQLite key's recovery copy the first
// start makes.
test("Desktop: a taken port is said so, and the server moves to another port", { tag: [TEST_TAGS.setup, TEST_TAGS.bundled] }, async ({ launchApp }) => {
  const holder = createServer();
  const port = await freePort();
  await new Promise<void>((resolve) => holder.listen(port, "127.0.0.1", resolve));
  try {
    const { app, userData } = await launchApp({ port });
    const page = await app.firstWindow();
    const failure = serverFailure(page);
    await expect(failure.root).toContainText(`A porta ${port} já está em uso pelo programa node.exe (processo ${process.pid}).`);
    const apiLog = path.join(userData, "logs", "api.log");
    expect(existsSync(apiLog) && readFileSync(apiLog, "utf8").includes("Starting the server.")).toBe(false);

    await failure.otherPort.click();
    const settings = serverSettings(page);
    const other = await freePort();
    await settings.field("Porta").fill(String(other));
    await settings.button("Trocar a porta").click();
    await settings.button("Trocar mesmo assim").click();
    await expect(settings.done).toHaveText(`Pronto: o servidor ligou na porta ${other}.`, { timeout: 60_000 });
    expect(readConfig(userData).port).toBe(other);
    expect(await healthOf(`http://127.0.0.1:${other}`)).toBe("up");

    await settings.close.click();
    await keepRecoveryKey(page);
    await expect(loginForm(page).submit).toBeVisible();
    await expect(failure.root).toHaveCount(0);
  } finally {
    holder.close();
  }
});

// Opens the app and checks its server answers on 127.0.0.1 but not on the computer's network address, as the phone's
// access is off on a fresh install; turning it on in the Servidor dialog restarts the server over HTTPS, with a
// certificate the app made, kept in config.json with the access: it then answers on both addresses to a client that
// trusts that certificate, and no longer over plain HTTP, and the dialog shows the QR code, the code of that
// certificate and an entry code for the account logged in. Turning it off takes it off the network and back to plain
// HTTP.
test("Desktop: the server reaches the network only with the phone's access on", { tag: [TEST_TAGS.setup, TEST_TAGS.bundled] }, async ({ launchApp }) => {
  const address = phoneAddress(networkInterfaces());
  test.skip(!address, "This computer has no network address to try.");
  const { app, userData, server } = await launchApp();
  const page = await app.firstWindow();
  await keepRecoveryKey(page);
  await startFromScratch(page);
  await signUp(page);
  const onNetwork = `http://${address}:${new URL(server).port}`;
  expect(await healthOf(server)).toBe("up");
  expect(await healthOf(onNetwork)).toBe("down");

  await openServerSettings(app);
  const settings = serverSettings(page);
  const access = settings.phoneAccess;
  await expect(access).toHaveAttribute("aria-checked", "false");
  await access.click();
  await expect(settings.done).toHaveText("Pronto: o celular já pode acessar o servidor.", { timeout: 60_000 });
  const config = readConfig(userData);
  expect(config.phoneAccess).toBe(true);
  const cert = config.httpsCertificate!;
  const port = new URL(server).port;
  expect(await pinnedHealthOf(`https://${address}:${port}`, cert)).toBe("up");
  expect(await pinnedHealthOf(`https://127.0.0.1:${port}`, cert)).toBe("up");
  expect(await healthOf(onNetwork)).toBe("down");
  expect(await healthOf(server)).toBe("down");
  await expect(settings.qrCode).toBeVisible();
  await expect(settings.fingerprint(fingerprintGroups(certificateFingerprint(cert)))).toBeVisible();
  await expect(settings.entryCode).toBeVisible();

  await access.click();
  await expect(settings.done).toHaveText("Pronto: o servidor responde só a este computador.", { timeout: 60_000 });
  expect(readConfig(userData).phoneAccess).toBe(false);
  expect(await healthOf(onNetwork)).toBe("down");
  expect(await healthOf(server)).toBe("up");
});

// Starts the app as Windows does at sign-in, with --hidden, and checks the window stays hidden while the server answers.
test("Desktop: started hidden, the app shows no window and its server answers", { tag: [TEST_TAGS.setup, TEST_TAGS.bundled] }, async ({ launchApp }) => {
  const { app, server } = await launchApp({ args: ["--hidden"] });
  await expect.poll(() => healthOf(server), { timeout: 60_000 }).toBe("up");
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((window) => window.isVisible()))).toEqual([false]);
});
