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
