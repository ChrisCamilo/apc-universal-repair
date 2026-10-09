import { defineConfig, devices } from "@playwright/test";
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from "@apc/shared/screens";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:5173",
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
  webServer: [
    {
      command: "pnpm --filter @apc/api run dev",
      url: "http://localhost:3333/health",
      reuseExistingServer: !isCI,
    },
    {
      command: "pnpm dev",
      url: "http://localhost:5173",
      reuseExistingServer: !isCI,
    },
  ],
});
