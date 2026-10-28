import { defineConfig } from "@playwright/test";

const isCI = !!process.env.CI;

// The desktop smoke test opens Electron itself, so there is no browser project and no web server to start.
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  timeout: 60_000,
  // A failed test leaves a trace, a screenshot and the HTML report, as in the web's end-to-end tests. The launch
  // fixture (e2e/support/fixtures.ts) records the apps' traces, which Playwright doesn't.
  reporter: [[isCI ? "github" : "list"], ["html", { open: "never" }]],
  use: { trace: isCI ? "on-first-retry" : "retain-on-failure", screenshot: "only-on-failure" },
});
