import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, expect, test, type ElectronApplication, type Page } from "@playwright/test";
import { readConfig } from "../src/config.ts";

// The desktop app with the server it ships (server/, from scripts/bundle-server.mjs), as an installed app runs: no
// APC_API_URL and no clone, its own userData folder, and a free port in place of 3333. Run `pnpm run build` first,
// which bundles the server.

/** The desktop app's folder, which Electron opens as the app. */
const APP_DIR = path.join(import.meta.dirname, "..");

/**
 * Opens the app with its own server, with a new userData folder and a free port.
 * @param options What the app is started with besides its folder, e.g. "--hidden", and what to leave in its userData
 * folder first, such as the installer's answers.
 * @returns The running app, its userData folder and its server's address.
 */
async function launch(options: { args?: string[]; files?: Record<string, string> } = {}) {
  const userData = mkdtempSync(path.join(tmpdir(), "apc-desktop-"));
  for (const [name, text] of Object.entries(options.files ?? {})) {
    writeFileSync(path.join(userData, name), text);
  }
  const port = await freePort();
  const env: Record<string, string> = { ...(process.env as Record<string, string>), APC_USER_DATA: userData, APC_SERVER_PORT: String(port) };
  // With it set, Electron runs as plain Node instead of opening the app.
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.APC_API_URL;
  const app = await electron.launch({ args: [APP_DIR, ...(options.args ?? [])], env });
  return { app, userData, server: `http://127.0.0.1:${port}` };
}

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
 * Finds a port no one listens on.
 * @returns The port.
 */
async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  await new Promise((resolve) => server.close(resolve));
  return port;
}

/**
 * Opens the Servidor dialog as the tray's "Servidor e banco de dados…" does.
 * @param app The running app.
 */
async function openServerSettings(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send("apc:open-server-settings"));
}

/**
 * Signs Ana up from the login, and skips the Inventory tutorial her first login starts, leaving the empty Inventory.
 * @param page The app's window.
 */
async function signUp(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome").fill("Ana Souza");
  await page.getByLabel("Usuário").fill("ana.souza");
  await page.getByLabel("E-mail").fill("ana@oficina.com");
  await page.getByLabel("Senha", { exact: true }).fill("freio1234");
  await page.getByLabel("Confirmar senha").fill("freio1234");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("tab", { name: "Estoque" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Pular tutorial" }).click();
  await expect(page.getByText("Nenhum item cadastrado")).toBeVisible();
}

// Opens the app with no server named, and checks it starts its own: the login shows, a sign-up goes on to the empty
// Inventory, and the database, the photos' folder and the server's log are in userData. Closing the app stops it.
test("Desktop: the app runs the server it ships, with its data in userData", async () => {
  const { app, userData, server } = await launch();
  const page = await app.firstWindow();
  await expect(page).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });

  await signUp(page);

  expect(existsSync(path.join(userData, "data", "apc.db"))).toBe(true);
  expect(existsSync(path.join(userData, "logs", "api.log"))).toBe(true);
  const health = await (await fetch(`${server}/health`)).json();
  expect(health.version).toBe(await app.evaluate(({ app: electronApp }) => electronApp.getVersion()));

  await app.close();
  await expect.poll(() => healthOf(server)).toBe("down");
});

// Closes the window, and checks it is hidden, not closed, with the server still answering; opening the app again
// shows the same window, and quitting, as "Sair" in the tray does, turns the server off.
test("Desktop: closing the window keeps the server on in the tray, until the app quits", async () => {
  const { app, server } = await launch();
  const page = await app.firstWindow();
  await expect(page).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });
  const visible = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((window) => window.isVisible()));

  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await expect.poll(visible).toEqual([false]);
  expect(await healthOf(server)).toBe("up");

  await app.evaluate(({ app: electronApp }) => electronApp.emit("second-instance"));
  await expect.poll(visible).toEqual([true]);

  await app.evaluate(({ app: electronApp }) => electronApp.quit());
  await expect.poll(() => healthOf(server)).toBe("down");
});

// Opens the Servidor dialog as the tray does, picks PostgreSQL with an address no server listens on, and checks the
// dialog says it didn't connect, SQLite stays in use, config.json keeps no address, and the server still answers.
test("Desktop: a PostgreSQL address that doesn't connect says so and keeps SQLite", async () => {
  const { app, userData, server } = await launch();
  const page = await app.firstWindow();
  await expect(page).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });
  await openServerSettings(app);
  const dialog = page.getByRole("dialog", { name: "Servidor e banco de dados" });
  await expect(dialog.getByText(`SQLite, em ${path.join(userData, "data")}`)).toBeVisible();

  await dialog.getByRole("radio", { name: "PostgreSQL" }).first().click();
  await dialog.getByLabel("Endereço do PostgreSQL").fill("postgresql://apc:segredo@127.0.0.1:1/apc");
  await dialog.getByRole("button", { name: "Usar PostgreSQL" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Não foi possível conectar ao PostgreSQL", { timeout: 30_000 });
  await expect(dialog.getByText(/^SQLite, em /)).toBeVisible();
  expect(readConfig(userData)).not.toHaveProperty("databaseUrl");
  expect(await healthOf(server)).toBe("up");
  await app.close();
});

// Signs up on one install, then imports its SQLite file into a fresh one through the Servidor dialog, with the file
// dialog answered as the user would, and checks every table's rows show and the account logs in on the new install.
test("Desktop: an old server's SQLite file imports into a fresh install", async () => {
  const old = await launch();
  const oldPage = await old.app.firstWindow();
  await expect(oldPage).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });
  await signUp(oldPage);
  await old.app.close();

  const { app } = await launch();
  const page = await app.firstWindow();
  await expect(page).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });
  const file = path.join(old.userData, "data", "apc.db");
  await app.evaluate(({ dialog }, chosen) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [chosen] })) as typeof dialog.showOpenDialog;
  }, file);
  await openServerSettings(app);
  const dialog = page.getByRole("dialog", { name: "Servidor e banco de dados" });
  await dialog.getByRole("button", { name: "Escolher o arquivo" }).click();
  await expect(dialog.getByText(file)).toBeVisible();
  await dialog.getByRole("button", { name: "Importar", exact: true }).click();
  await expect(dialog.getByRole("status")).toHaveText("Pronto: os dados do servidor antigo estão neste servidor.", { timeout: 60_000 });
  await expect(dialog.getByRole("list", { name: "Linhas copiadas" }).getByText("Usuários: 1 de 1")).toBeVisible();

  await dialog.getByRole("button", { name: "Fechar" }).first().click();
  await expect(page).toHaveURL(/^app:\/\/apc\/login/);
  await page.getByLabel("Usuário").fill("ana.souza");
  await page.getByLabel("Senha", { exact: true }).fill("freio1234");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("tab", { name: "Estoque" })).toHaveAttribute("aria-selected", "true");
  await app.close();
});

// Starts the app after the installer's PostgreSQL choice, and checks the server waits while the dialog asks for the
// address, and "Usar SQLite" starts it on SQLite, saved in config.json, and goes on to the login.
test("Desktop: with PostgreSQL chosen at install, the app asks for its address before starting the server", async () => {
  const { app, userData, server } = await launch({ files: { "installer-database.txt": "postgresql" } });
  const page = await app.firstWindow();
  const dialog = page.getByRole("dialog", { name: "Banco de dados do servidor" });
  await expect(dialog).toBeVisible({ timeout: 60_000 });
  expect(await healthOf(server)).toBe("down");
  await dialog.getByRole("button", { name: "Usar SQLite" }).click();
  await expect.poll(() => healthOf(server), { timeout: 60_000 }).toBe("up");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  expect(readConfig(userData).database).toBe("sqlite");
  await app.close();
});

// Starts the app as Windows does at sign-in, with --hidden, and checks the window stays hidden while the server answers.
test("Desktop: started hidden, the app shows no window and its server answers", async () => {
  const { app, server } = await launch({ args: ["--hidden"] });
  await expect.poll(() => healthOf(server), { timeout: 60_000 }).toBe("up");
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((window) => window.isVisible()))).toEqual([false]);
  await app.evaluate(({ app: electronApp }) => electronApp.quit());
});
