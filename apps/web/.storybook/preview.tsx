import type { Decorator, Preview } from '@storybook/react-vite'
import {
  MIN_DESKTOP_HEIGHT,
  MIN_DESKTOP_WIDTH,
  MIN_MOBILE_HEIGHT,
  MIN_MOBILE_WIDTH,
  MOBILE_DESIGN_HEIGHT,
  MOBILE_DESIGN_WIDTH,
} from '@apc/shared/screens'
import { MODES, STYLES } from '@apc/shared/theme'
import '../src/fonts.ts'
import '../src/index.css'
import { themeCss } from '../src/theme.ts'
import { ThemeProvider } from '../src/ThemeProvider.tsx'

/** Minimum supported sizes from AGENTS.md, plus the mobile design reference. */
const VIEWPORTS = {
  desktop: viewport('Desktop', MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT, 'desktop'),
  phone: viewport('Mobile design', MOBILE_DESIGN_WIDTH, MOBILE_DESIGN_HEIGHT, 'mobile'),
  phoneMin: viewport('Mobile minimum', MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT, 'mobile'),
}
const preview: Preview = {
  globalTypes: {
    style: {
      description: 'Visual style',
      toolbar: { title: 'Style', icon: 'paintbrush', items: [...STYLES], dynamicTitle: true },
    },
    mode: {
      description: 'Light or dark mode',
      toolbar: {
        title: 'Mode',
        icon: 'mirror',
        items: MODES.map((mode) => ({ value: mode, title: mode, icon: mode === 'night' ? 'moon' : 'sun' })),
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { style: STYLES[0], mode: MODES[0] },
  decorators: [withTheme],
  parameters: { viewport: { options: VIEWPORTS } },
}

ensureThemeCss()

export default preview

/**
 * Adds the theme CSS variables to the preview frame once, as the app's index.html does.
 */
function ensureThemeCss(): void {
  if (document.getElementById('theme-tokens')) {
    return
  }
  const tag = document.createElement('style')
  tag.id = 'theme-tokens'
  tag.textContent = themeCss()
  document.head.prepend(tag)
}

/**
 * Describes a viewport of the toolbar from a size the project supports.
 * @param name What the size is, e.g. "Desktop".
 * @param width Width in px, from @apc/shared/screens.
 * @param height Height in px, from @apc/shared/screens.
 * @param type Whether Storybook frames it as a desktop or a phone.
 * @returns The viewport, named with its size, e.g. "Desktop · 1280×720".
 */
function viewport(name: string, width: number, height: number, type: 'desktop' | 'mobile') {
  return { name: `${name} · ${width}×${height}`, styles: { width: `${width}px`, height: `${height}px` }, type }
}

/**
 * Applies the toolbar's style and mode to the preview: stamps them on `<html>` and remounts the
 * ThemeProvider, so stories and components that call useTheme() see the same choice.
 * @param Story The story being rendered.
 * @param context Story context; its globals hold the toolbar's style and mode.
 * @returns The story wrapped in a ThemeProvider.
 */
function withTheme(Story: Parameters<Decorator>[0], context: Parameters<Decorator>[1]): ReturnType<Decorator> {
  const { style, mode } = context.globals
  document.documentElement.dataset.style = style
  document.documentElement.dataset.mode = mode
  return (
    <ThemeProvider key={`${style}/${mode}`}>
      <Story />
    </ThemeProvider>
  )
}
