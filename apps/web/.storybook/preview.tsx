import type { Decorator, Preview } from '@storybook/react-vite'
import { MODES, STYLES } from '@apc/shared/theme'
import '../src/fonts.ts'
import '../src/index.css'
import { themeCss } from '../src/theme.ts'
import { ThemeProvider } from '../src/ThemeProvider.tsx'

/** Minimum supported sizes from AGENTS.md, plus the mobile design reference. */
const VIEWPORTS = {
  desktop: { name: 'Desktop · 1280×720', styles: { width: '1280px', height: '720px' }, type: 'desktop' },
  phone: { name: 'Mobile design · 390×844', styles: { width: '390px', height: '844px' }, type: 'mobile' },
  phoneMin: { name: 'Mobile minimum · 360×780', styles: { width: '360px', height: '780px' }, type: 'mobile' },
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
