import { defineConfig } from "@playwright/test";

const isCI = !!process.env.CI;

// The desktop smoke test opens Electron itself, so there is no browser project and no web server to start.
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  timeout: 60_000,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { trace: "on-first-retry" },
});
