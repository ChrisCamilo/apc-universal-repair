import { THEME_STORAGE_KEYS, themes } from '@apc/shared/theme'
import { beforeAll, beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { themeBootScript, themeCss } from './theme.ts'
import { ThemeProvider } from './ThemeProvider.tsx'
import { useTheme } from './useTheme.ts'

const root = document.documentElement

/**
 * Runs the index.html boot script, as the browser does on every page load.
 */
function boot(): void {
  const script = document.createElement('script')
  script.textContent = themeBootScript()
  document.head.append(script)
  script.remove()
}

/**
 * Replaces window.matchMedia with a fake system color scheme the test can change.
 * @param light Whether the system starts on light colors.
 * @returns A function that switches the fake scheme and notifies whoever listens to it.
 */
function fakeColorScheme(light: boolean): (light: boolean) => void {
  let isLight = light
  const listeners = new Set<() => void>()
  vi.spyOn(window, 'matchMedia').mockImplementation(
    () =>
      ({
        get matches() {
          return isLight
        },
        addEventListener: (_type: string, fn: () => void) => listeners.add(fn),
        removeEventListener: (_type: string, fn: () => void) => listeners.delete(fn),
      }) as unknown as MediaQueryList,
  )
  return (next) => {
    isLight = next
    listeners.forEach((fn) => fn())
  }
}

/**
 * Reads a theme CSS variable as resolved on `<html>` right now.
 * @param name Variable name without `--`, e.g. "canvas".
 * @returns The variable's value, e.g. "#0B0C0E".
 */
function cssVar(name: string): string {
  return getComputedStyle(root).getPropertyValue(`--${name}`).trim()
}

function Probe() {
  const { style, mode, setStyle, setMode } = useTheme()
  return (
    <div>
      <span data-testid="current">{`${style}/${mode}`}</span>
      <button onClick={() => setStyle('gt4')}>GT4</button>
      <button onClick={() => setMode('day')}>Day</button>
    </div>
  )
}

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
})

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  delete root.dataset.style
  delete root.dataset.mode
})

// Starts on the defaults, switches style and then mode, and checks <html> and the CSS variables
// follow at once, without a reload.
test('Web: switching style and mode restyles the page without a reload', async () => {
  fakeColorScheme(false)
  boot()
  const screen = await render(<ThemeProvider><Probe /></ThemeProvider>)
  await expect.element(screen.getByTestId('current')).toHaveTextContent('eighties/night')
  expect(cssVar('canvas')).toBe(themes.eighties.night.colors.canvas)

  await screen.getByRole('button', { name: 'GT4' }).click()
  await screen.getByRole('button', { name: 'Day' }).click()
  await expect.element(screen.getByTestId('current')).toHaveTextContent('gt4/day')
  expect([root.dataset.style, root.dataset.mode]).toEqual(['gt4', 'day'])
  expect(cssVar('canvas')).toBe(themes.gt4.day.colors.canvas)
})

// Picks GT4 by day, then simulates a reload (fresh <html>, boot script, new provider) and checks
// the page comes back on that choice.
test('Web: the chosen style and mode survive a reload', async () => {
  fakeColorScheme(false)
  boot()
  const first = await render(<ThemeProvider><Probe /></ThemeProvider>)
  await first.getByRole('button', { name: 'GT4' }).click()
  await first.getByRole('button', { name: 'Day' }).click()
  expect(localStorage.getItem(THEME_STORAGE_KEYS.style)).toBe('gt4')
  await first.unmount()

  delete root.dataset.style
  delete root.dataset.mode
  boot()
  expect([root.dataset.style, root.dataset.mode]).toEqual(['gt4', 'day'])
  const second = await render(<ThemeProvider><Probe /></ThemeProvider>)
  await expect.element(second.getByTestId('current')).toHaveTextContent('gt4/day')
})

// With no saved mode the page follows the system scheme, also when it changes; once the user picks
// a mode, system changes no longer override it.
test('Web: mode follows the system color scheme until the user picks one', async () => {
  const setSystemLight = fakeColorScheme(true)
  boot()
  const screen = await render(<ThemeProvider><Probe /></ThemeProvider>)
  await expect.element(screen.getByTestId('current')).toHaveTextContent('eighties/day')

  setSystemLight(false)
  await expect.element(screen.getByTestId('current')).toHaveTextContent('eighties/night')

  await screen.getByRole('button', { name: 'Day' }).click()
  setSystemLight(false)
  await expect.element(screen.getByTestId('current')).toHaveTextContent('eighties/day')
})

// Blocks localStorage as private mode can, and checks the boot script and the switcher still work,
// keeping the choice for the current page.
test('Web: switching works when storage is unavailable', async () => {
  fakeColorScheme(false)
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Storage is blocked', 'SecurityError')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Storage is blocked', 'SecurityError')
  })
  boot()
  expect([root.dataset.style, root.dataset.mode]).toEqual(['eighties', 'night'])

  const screen = await render(<ThemeProvider><Probe /></ThemeProvider>)
  await screen.getByRole('button', { name: 'GT4' }).click()
  await expect.element(screen.getByTestId('current')).toHaveTextContent('gt4/night')
  expect(root.dataset.style).toBe('gt4')
})
