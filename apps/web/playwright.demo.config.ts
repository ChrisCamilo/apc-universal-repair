import { defineConfig, devices } from "@playwright/test";
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from "@apc/shared/screens";

// The end-to-end tests of the web app's demo as GitHub Pages serves it: the site the Pages workflow puts together in
// site/ at the repository's root (pnpm run build:demo, copied to site/demo with docs/site/404.html beside it), served
// by scripts/serve-pages.mjs as Pages does, without the API.

const isCI = !!process.env.CI;
const PORT = 4174;

export default defineConfig({
  testDir: "./e2e-demo",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  // Reduced motion, as in the app's end-to-end tests (playwright.config.ts).
  use: {
    baseURL: `http://localhost:${PORT}/apc-universal-repair/demo/`,
    reducedMotion: "reduce",
    trace: "on-first-retry",
  },
  // Minimum supported screen sizes from AGENTS.md.
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: MIN_DESKTOP_WIDTH, height: MIN_DESKTOP_HEIGHT } },
    },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: MIN_MOBILE_WIDTH, height: MIN_MOBILE_HEIGHT }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command: `node scripts/serve-pages.mjs ../../site ${PORT}`,
    url: `http://localhost:${PORT}/apc-universal-repair/demo/`,
    reuseExistingServer: !isCI,
  },
});
