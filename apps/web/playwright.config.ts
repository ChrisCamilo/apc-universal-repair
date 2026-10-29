import { defineConfig, devices } from "@playwright/test";
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from "@apc/shared/screens";
import { DEV_SERVER_PORT } from "@apc/shared/server";
import { TEST_TAGS } from "@apc/shared/test-tags";

const isCI = !!process.env.CI;
// The run starts the API and the web app itself, and fails if something already answers on their ports: on 3333 that
// may be the installed desktop app with its real data. E2E_REUSE=1 reuses servers you started yourself.
const reuse = !isCI && process.env.E2E_REUSE === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // A failed test leaves a trace, a screenshot and the HTML report, which never opens by itself: on CI the trace of its
  // first retry, locally of its one run.
  reporter: [[isCI ? "github" : "list"], ["html", { open: "never" }]],
  // Reduced motion, as in the component tests: dialogs, menus and lists open and close at once, so a test never reads
  // one halfway through a transition.
  use: {
    baseURL: "http://localhost:5173",
    reducedMotion: "reduce",
    trace: isCI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Minimum supported screen sizes from AGENTS.md. Each leaves out the tests of the other's screen.
  projects: [
    {
      name: "desktop",
      grepInvert: new RegExp(TEST_TAGS.mobileOnly),
      use: { ...devices["Desktop Chrome"], viewport: { width: MIN_DESKTOP_WIDTH, height: MIN_DESKTOP_HEIGHT } },
    },
    {
      name: "mobile",
      grepInvert: new RegExp(TEST_TAGS.desktopOnly),
      use: { ...devices["Desktop Chrome"], viewport: { width: MIN_MOBILE_WIDTH, height: MIN_MOBILE_HEIGHT }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @apc/api run dev",
      url: `http://localhost:${DEV_SERVER_PORT}/health`,
      reuseExistingServer: reuse,
    },
    {
      command: "pnpm dev",
      url: "http://localhost:5173",
      reuseExistingServer: reuse,
    },
  ],
});
