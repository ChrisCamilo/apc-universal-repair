import { MODES, STYLES, scales, themes, type Mode, type Theme } from '@apc/shared/theme'

// Turns the shared tokens into CSS variables: the scales on :root and one block per
// [data-style][data-mode] pair, so switching style or mode is just changing two attributes on <html>.

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
const px = (n: number) => `${n}px`
const decls = (vars: Record<string, string>) =>
  Object.entries(vars).map(([k, v]) => `--${k}:${v};`).join('')

function font(family: string, fallback: string) {
  return `'${family}', ${fallback}`
}

function themeVars(theme: Theme, mode: Mode): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [token, value] of Object.entries(theme.colors)) {
    vars[kebab(token)] = value
  }
  const sheenBase = mode === 'night' ? '255, 255, 255' : '0, 0, 0'
  return {
    ...vars,
    'display-face': font(theme.displayFont, `'${scales.bodyFont}', sans-serif`),
    'display-tracking': `${theme.displayTracking}em`,
    'panel-radius': px(theme.radiusPanel),
    'tile-radius': px(theme.radiusTile),
    glow: theme.glow
      ? `0 0 ${px(theme.glow.blur)} color-mix(in srgb, var(--accent) ${theme.glow.opacity * 100}%, transparent)`
      : 'none',
    sheen: `linear-gradient(180deg, rgba(${sheenBase}, ${theme.sheen}), transparent 45%)`,
  }
}

function scaleVars(): Record<string, string> {
  const vars: Record<string, string> = {
    'space-unit': px(scales.space.s1),
    'hairline-width': px(scales.hairline),
    'pill-radius': px(scales.radiusPill),
    'motion-duration': `${scales.motion.durationMs}ms`,
    'motion-easing': `cubic-bezier(${scales.motion.easing.join(', ')})`,
    ring: `0 0 0 ${px(scales.focusRing.width)} color-mix(in srgb, var(--accent) ${scales.focusRing.opacity * 100}%, transparent)`,
    'body-face': font(scales.bodyFont, 'system-ui, sans-serif'),
    'mono-face': font(scales.monoFont, 'ui-monospace, monospace'),
  }
  for (const [step, size] of Object.entries(scales.fontSize)) {
    vars[`font-size-${step}`] = `${size / 16}rem`
  }
  return vars
}

export function themeCss(): string {
  const blocks = STYLES.flatMap((style) =>
    MODES.map((mode) => `:root[data-style="${style}"][data-mode="${mode}"]{${decls(themeVars(themes[style][mode], mode))}}`),
  )
  return [`:root{${decls(scaleVars())}}`, ...blocks].join('\n')
}

/** Adds the theme variables to the page before the first render. */
export function injectThemeCss() {
  const tag = document.createElement('style')
  tag.id = 'theme-tokens'
  tag.textContent = themeCss()
  document.head.prepend(tag)
}
