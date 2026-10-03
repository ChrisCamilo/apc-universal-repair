import { beforeEach } from 'vitest'
import { commands } from 'vitest/browser'

// The pointer stays where the previous test left it, even across test files that share the browser page,
// so whatever renders under it next starts out hovered. Park it away from the content before each test.

declare module 'vitest/browser' {
  interface BrowserCommands {
    /** Moves the pointer to the page's bottom-right corner, where no test renders anything. */
    parkPointer: () => Promise<void>
  }
}

beforeEach(async () => {
  await commands.parkPointer()
})
