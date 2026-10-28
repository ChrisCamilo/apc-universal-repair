import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron, expect, test as base, type ElectronApplication, type Page } from "@playwright/test";
import type { Item } from "@apc/shared/items";
import type { TEST_USERS } from "@apc/shared/test-users";
import { reduceMotion } from "../reducedMotion.ts";
import { startStubApi } from "../stubApi.ts";

// The desktop E2E's own test: every spec imports test and expect from here. launchApp opens the compiled app
// (dist/main.js) with the web build, on the stand-in API or on the server it ships, in a userData folder of its own
// under the system's temporary folder. Every app a test opened is closed once the test ends, passed or failed, and
// the userData folders it made are removed after, so the next test on the one worker starts with no app, server, port
// or file left over. Run `pnpm --filter @apc/web build` and `pnpm run build` first, which `pnpm test:e2e` from the root
// does through Turbo.
//
// Playwright names a fixture's second argument `use`; it is `provide` here, as in the web E2E's fixtures.

/** The desktop app's folder, which Electron opens as the app. */
export const APP_DIR = path.join(import.meta.dirname, "..", "..");

/** What a test opens the app with, besides its folder. */
type LaunchOptions = {
  /** Arguments after the app's folder, e.g. "--hidden". */
  args?: string[];
  /** Files to leave in the userData folder first, such as the installer's answers, by their path in it. */
  files?: Record<string, string>;
  /** A userData folder of an earlier launch of the test, to open again. */
  userData?: string;
  /** The port the shipped server should take, a free one unless the test holds it. */
  port?: number;
};

/** A running app, its userData folder and the address of the server it uses. */
type LaunchedApp = { app: ElectronApplication; userData: string; server: string };

type Options = {
  /** The stand-in API (the default), or the server the app ships, on a free port, as an installed app runs. */
  server: "stub" | "bundled";
};

type Fixtures = {
  /** Opens the app; each call gets a new userData folder unless it names one the test made before. */
  launchApp: (options?: LaunchOptions) => Promise<LaunchedApp>;
};

type WorkerOptions = {
  /**
   * The items the stand-in API's GET /items answers with, none by default. They are in an object, as Playwright
   * reads an array given to test.use() as a fixture's value and its options.
   */
  stubStock: { items: Item[] };
};

type WorkerFixtures = {
  /** The stand-in API, started once for the worker's tests. */
  stubApi: { url: string };
};

export const test = base.extend<Options & Fixtures, WorkerOptions & WorkerFixtures>({
  server: ["stub", { option: true }],
  stubStock: [{ items: [] }, { option: true, scope: "worker" }],
  stubApi: [
    async ({ stubStock }, provide) => {
      const { server, url } = await startStubApi(stubStock.items);
      await provide({ url });
      await new Promise((resolve) => server.close(resolve));
    },
    { scope: "worker" },
  ],
  launchApp: async ({ server, stubApi }, provide) => {
    const open = new Set<ElectronApplication>();
    const made: string[] = [];
    await provide(async (options = {}) => {
      const userData = options.userData ?? mkdtempSync(path.join(tmpdir(), "apc-desktop-"));
      if (!options.userData) {
        made.push(userData);
      }
      for (const [name, text] of Object.entries(options.files ?? {})) {
        mkdirSync(path.dirname(path.join(userData, name)), { recursive: true });
        writeFileSync(path.join(userData, name), text);
      }
      const env: Record<string, string> = { ...(process.env as Record<string, string>), APC_USER_DATA: userData };
      // With it set, Electron runs as plain Node instead of opening the app.
      delete env.ELECTRON_RUN_AS_NODE;
      let address = stubApi.url;
      if (server === "bundled") {
        const port = options.port ?? (await freePort());
        delete env.APC_API_URL;
        env.APC_SERVER_PORT = String(port);
        address = `http://127.0.0.1:${port}`;
      } else {
        env.APC_API_URL = stubApi.url;
      }
      const app = reduceMotion(await electron.launch({ args: [APP_DIR, ...(options.args ?? [])], env }));
      open.add(app);
      app.once("close", () => open.delete(app));
      return { app, userData, server: address };
    });
    for (const app of open) {
      await app.close();
    }
    // The shipped server may still be letting go of its files for a moment after the app quits.
    for (const folder of made) {
      rmSync(folder, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
    }
  },
});

export { expect };

/**
 * Finds a port no one listens on.
 * @returns The port.
 */
export async function freePort(): Promise<number> {
  const server: Server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  await new Promise((resolve) => server.close(resolve));
  return port;
}

/**
 * Logs a user in from the login screen and waits for the Inventory.
 * @param page The app's window.
 * @param user The username and password to type, e.g. a test user.
 */
export async function logIn(page: Page, user: Pick<(typeof TEST_USERS)[number], "username" | "password">) {
  await page.getByLabel("Usuário", { exact: true }).fill(user.username);
  await page.getByLabel("Senha", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("tab", { name: "Estoque" })).toHaveAttribute("aria-selected", "true");
}
