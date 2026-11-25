import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { AUTO_RELOAD_MS, useAutoReload } from './useAutoReload.ts'

// The Inventory loading again by itself: when the window comes back to the foreground and every AUTO_RELOAD_MS while
// it is on screen, never while something is open over the list or the window is hidden, and once for a focus and a
// visibility change that come together.

/**
 * Uses the hook, as the Inventory does.
 * @param props What it is given: the reload, and whether something is open over the list.
 * @returns Nothing on screen.
 */
function Probe({ reload, paused }: { reload: () => void; paused: boolean }) {
  useAutoReload(reload, paused)
  return null
}

/** Brings the window back to the foreground, as the browser and the desktop app tell it. */
function comeBack() {
  window.dispatchEvent(new Event('focus'))
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// Brings the window back twice, a second apart, and checks the list loads once each time, though focus and
// visibilitychange both fire.
test('Web: the Inventory loads again when the window comes back to the foreground', async () => {
  const reload = vi.fn()
  await render(<Probe reload={reload} paused={false} />)
  comeBack()
  expect(reload).toHaveBeenCalledTimes(1)
  vi.advanceTimersByTime(1_000)
  comeBack()
  expect(reload).toHaveBeenCalledTimes(2)
})

// Leaves the list on screen for a minute, then hides the window for another, and checks it loads every 30 seconds
// while on screen and not while hidden.
test('Web: the Inventory loads again every 30 seconds while it is on screen', async () => {
  const reload = vi.fn()
  await render(<Probe reload={reload} paused={false} />)
  vi.advanceTimersByTime(AUTO_RELOAD_MS - 1)
  expect(reload).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)
  expect(reload).toHaveBeenCalledTimes(1)
  vi.advanceTimersByTime(AUTO_RELOAD_MS)
  expect(reload).toHaveBeenCalledTimes(2)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  vi.advanceTimersByTime(AUTO_RELOAD_MS * 2)
  expect(reload).toHaveBeenCalledTimes(2)
})

// Opens something over the list, brings the window back and waits a minute, and checks nothing loads; then closes it
// and checks the reloads start again.
test('Web: the Inventory waits while a form, dialog or sheet is open over it', async () => {
  const reload = vi.fn()
  const screen = await render(<Probe reload={reload} paused />)
  comeBack()
  vi.advanceTimersByTime(AUTO_RELOAD_MS * 2)
  expect(reload).not.toHaveBeenCalled()
  await screen.rerender(<Probe reload={reload} paused={false} />)
  vi.advanceTimersByTime(AUTO_RELOAD_MS)
  expect(reload).toHaveBeenCalledTimes(1)
})
