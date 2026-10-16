import { existsSync, mkdtempSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, expect, test } from "@playwright/test";

// The desktop app with the server it ships (server/, from scripts/bundle-server.mjs), as an installed app runs: no
// APC_API_URL and no clone, its own userData folder, and a free port in place of 3333. Run `pnpm run build` first,
// which bundles the server.

/** The desktop app's folder, which Electron opens as the app. */
const APP_DIR = path.join(import.meta.dirname, "..");

/**
 * Opens the app with its own server, with a new userData folder and a free port.
 * @param args What the app is started with besides its folder, e.g. "--hidden".
 * @returns The running app, its userData folder and its server's address.
 */
async function launch(...args: string[]) {
  const userData = mkdtempSync(path.join(tmpdir(), "apc-desktop-"));
  const port = await freePort();
  const env: Record<string, string> = { ...(process.env as Record<string, string>), APC_USER_DATA: userData, APC_SERVER_PORT: String(port) };
  // With it set, Electron runs as plain Node instead of opening the app.
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.APC_API_URL;
  delete env.APC_API_DIR;
  const app = await electron.launch({ args: [APP_DIR, ...args], env });
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

// Opens the app with no server named, and checks it starts its own: the login shows, a sign-up goes on to the empty
// Inventory, and the database, the photos' folder and the server's log are in userData. Closing the app stops it.
test("Desktop: the app runs the server it ships, with its data in userData", async () => {
  const { app, userData, server } = await launch();
  const page = await app.firstWindow();
  await expect(page).toHaveURL(/^app:\/\/apc\/login/, { timeout: 60_000 });

  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome").fill("Ana Souza");
  await page.getByLabel("Usuário").fill("ana.souza");
  await page.getByLabel("E-mail").fill("ana@oficina.com");
  await page.getByLabel("Senha", { exact: true }).fill("freio1234");
  await page.getByLabel("Confirmar senha").fill("freio1234");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("tab", { name: "Estoque" })).toHaveAttribute("aria-selected", "true");
  // The first login starts the Inventory tutorial; skipping it leaves the empty Inventory.
  await page.getByRole("button", { name: "Pular tutorial" }).click();
  await expect(page.getByText("Nenhum item cadastrado")).toBeVisible();

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

// Starts the app as Windows does at sign-in, with --hidden, and checks the window stays hidden while the server answers.
test("Desktop: started hidden, the app shows no window and its server answers", async () => {
  const { app, server } = await launch("--hidden");
  await expect.poll(() => healthOf(server), { timeout: 60_000 }).toBe("up");
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((window) => window.isVisible()))).toEqual([false]);
  await app.evaluate(({ app: electronApp }) => electronApp.quit());
});
