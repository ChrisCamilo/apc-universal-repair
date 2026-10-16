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
  const userData = mkdtempSync(path.join(tmpdir(), "apc-desktop-"));
  const port = await freePort();
  const env: Record<string, string> = { ...(process.env as Record<string, string>), APC_USER_DATA: userData, APC_SERVER_PORT: String(port) };
  // With it set, Electron runs as plain Node instead of opening the app.
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.APC_API_URL;
  delete env.APC_API_DIR;
  const app = await electron.launch({ args: [APP_DIR], env });
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
  const health = await (await fetch(`http://127.0.0.1:${port}/health`)).json();
  expect(health.version).toBe(await app.evaluate(({ app: electronApp }) => electronApp.getVersion()));

  await app.close();
  await expect.poll(() => fetch(`http://127.0.0.1:${port}/health`).then(() => "up", () => "down")).toBe("down");
});
