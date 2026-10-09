import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens'
import { TABLE_CARD_BREAKPOINT } from '@apc/shared/table'
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'

// Shows one mark only below the card breakpoint and one only from it up, and checks each shows on its side of
// TABLE_CARD_BREAKPOINT: on the smallest phone and one pixel below the breakpoint the narrow one, at the breakpoint
// and on the smallest desktop the wide one.
test('Web: the card breakpoint switches at the shared width', async () => {
  const screen = await render(
    <>
      <span className="card:hidden">narrow</span>
      <span className="max-card:hidden">wide</span>
    </>,
  )
  for (const [width, wide] of [
    [MIN_MOBILE_WIDTH, false],
    [TABLE_CARD_BREAKPOINT - 1, false],
    [TABLE_CARD_BREAKPOINT, true],
    [MIN_DESKTOP_WIDTH, true],
  ] as const) {
    await page.viewport(width, MIN_MOBILE_HEIGHT)
    await expect.element(screen.getByText('wide')).toHaveStyle({ display: wide ? 'inline' : 'none' })
    await expect.element(screen.getByText('narrow')).toHaveStyle({ display: wide ? 'none' : 'inline' })
  }
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})
