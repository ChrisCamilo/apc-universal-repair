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

export default mergeConfig(
  viteConfig,
  defineConfig({
    // Pre-bundle the dependencies Vite would otherwise discover only mid-run (react-dom/client from the test
    // renderer, react-router from the app's routes), so it doesn't re-optimize and reload the page under a test
    // file that is still loading.
    optimizeDeps: { include: ['react-dom/client', 'react-router'] },
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['./src/test-setup.ts'],
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: 'chromium' }],
        commands: { parkPointer },
      },
    },
  }),
)
