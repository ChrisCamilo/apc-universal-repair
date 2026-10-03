import { playwright } from '@vitest/browser-playwright'
import { defineConfig, mergeConfig } from 'vitest/config'
import type { BrowserCommand } from 'vitest/node'
import viteConfig from './vite.config.ts'

// Component tests run in a real Chromium through Playwright, so CSS and tokens apply as in the app.

/** Moves the pointer to the page's bottom-right corner, where no test renders anything. */
const parkPointer: BrowserCommand<[]> = async ({ page }) => {
  const [width, height] = await page.evaluate<[number, number]>('[innerWidth, innerHeight]')
  await page.mouse.move(width - 1, height - 1)
}

/** Turns the system's "reduce motion" setting on or off for the page, as prefers-reduced-motion reads it. */
const reduceMotion: BrowserCommand<[boolean]> = async ({ page }, on) => {
  await page.emulateMedia({ reducedMotion: on ? 'reduce' : 'no-preference' })
}

export default mergeConfig(
  viteConfig,
  defineConfig({
    // Pre-bundle every dependency before the run, so Vite doesn't discover one mid-run, re-optimize and reload
    // the page under a test file that is still loading: scan all of src (the app's own imports, such as
    // react-router or zod, not only the tests'), plus react-dom/client, which the test renderer imports.
    optimizeDeps: { entries: ['src/**/*.{ts,tsx}'], include: ['react-dom/client'] },
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['./src/test-setup.ts'],
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: 'chromium' }],
        commands: { parkPointer, reduceMotion },
      },
    },
  }),
)
