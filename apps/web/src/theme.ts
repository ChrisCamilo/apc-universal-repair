import { MODES, popShadow, STYLES, scales, sheenGradient, THEME_STORAGE_KEYS, themes, type Mode, type Theme } from '@apc/shared/theme'

// Turns the shared tokens into CSS variables: the scales on :root and one block per
// [data-style][data-mode] pair, so switching style or mode is just changing two attributes on <html>.
// The Vite config writes both the variables and the boot script into index.html, so the saved theme
// is in place before the first paint.

/**
 * Writes CSS custom property declarations.
 * @param vars Variable names (without the leading `--`) mapped to their values.
 * @returns Declarations joined on one line, e.g. "--canvas:#0B0C0E;--panel:#15171A;".
 */
function decls(vars: Record<string, string>): string {
  return Object.entries(vars).map(([k, v]) => `--${k}:${v};`).join('')
}

/**
 * Builds a CSS font-family stack with the given family first.
 * @param family Font family, e.g. "Barlow Condensed".
 * @param fallback Fallback families, already formatted for CSS.
 * @returns The quoted family followed by the fallback.
 */
function font(family: string, fallback: string): string {
  return `'${family}', ${fallback}`
}

/**
 * Converts a camelCase token name to the kebab-case used by CSS variables.
 * @param name Token name, e.g. "panelRaised".
 * @returns Kebab-case name, e.g. "panel-raised".
 */
function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
}

/**
 * Formats a number as a CSS pixel length.
 * @param n Length in px.
 * @returns CSS length, e.g. "14px".
 */
function px(n: number): string {
  return `${n}px`
}

/**
 * Lists the CSS variables shared by every style: spacing unit, font sizes, hairline, radii, motion,
 * focus ring and the body and mono faces.
 * @returns Variable names (without `--`) mapped to CSS values.
 */
function scaleVars(): Record<string, string> {
  const vars: Record<string, string> = {
    'space-unit': px(scales.space.s1),
    'hairline-width': px(scales.hairline),
    'hairline-soft': `color-mix(in srgb, var(--hairline) ${scales.hairlineSoft * 100}%, transparent)`,
    'accent-soft': `color-mix(in srgb, var(--accent) ${scales.accentSoft * 100}%, transparent)`,
    'warn-soft': `color-mix(in srgb, var(--warn) ${scales.statusTint.warn * 100}%, transparent)`,
    'warn-soft-hover': `color-mix(in srgb, var(--warn) ${scales.statusTint.warnHover * 100}%, transparent)`,
    'danger-soft': `color-mix(in srgb, var(--danger) ${scales.statusTint.danger * 100}%, transparent)`,
    'danger-soft-hover': `color-mix(in srgb, var(--danger) ${scales.statusTint.dangerHover * 100}%, transparent)`,
    'pop-shadow': popShadow(),
    backdrop: `color-mix(in srgb, var(--canvas) ${scales.backdrop.opacity * 100}%, transparent)`,
    'backdrop-blur': px(scales.backdrop.blur),
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

/**
 * Writes the inline script that stamps `data-style` and `data-mode` on `<html>` before the first paint:
 * the saved choice when there is one, otherwise the first style and the system color scheme.
 * Reading storage can throw (private mode), so it falls back to the defaults.
 * @returns Plain ES5 script text, meant to run in `<head>` before any stylesheet.
 */
export function themeBootScript(): string {
  return `(function () {
  var styles = ${JSON.stringify(STYLES)}, modes = ${JSON.stringify(MODES)}, style = null, mode = null;
  try {
    style = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEYS.style)});
    mode = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEYS.mode)});
  } catch (e) {}
  if (styles.indexOf(style) === -1) { style = styles[0]; }
  if (modes.indexOf(mode) === -1) {
    mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'day' : 'night';
  }
  document.documentElement.setAttribute('data-style', style);
  document.documentElement.setAttribute('data-mode', mode);
})();`
}

/**
 * Writes the stylesheet with every theme variable: the scales on `:root` and one rule per
 * `[data-style][data-mode]` pair, which also sets the color scheme of the mode.
 * @returns CSS text, one rule per line.
 */
export function themeCss(): string {
  const blocks = STYLES.flatMap((style) =>
    // color-scheme lets the browser draw scrollbars and native controls dark at night and light by day.
    MODES.map(
      (mode) =>
        `:root[data-style="${style}"][data-mode="${mode}"]{color-scheme:${mode === 'night' ? 'dark' : 'light'};${decls(themeVars(themes[style][mode], mode))}}`,
    ),
  )
  return [`:root{${decls(scaleVars())}}`, ...blocks].join('\n')
}

/**
 * Lists the CSS variables of one style in one mode: colors, display face, radii, glow and sheen.
 * @param theme Tokens of the style and mode.
 * @param mode Mode the tokens belong to; decides whether the sheen is white (night) or black (day).
 * @returns Variable names (without `--`) mapped to CSS values.
 */
function themeVars(theme: Theme, mode: Mode): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [token, value] of Object.entries(theme.colors)) {
    vars[kebab(token)] = value
  }
  return {
    ...vars,
    'display-face': font(theme.displayFont, `'${scales.bodyFont}', sans-serif`),
    'display-tracking': `${theme.displayTracking}em`,
    'panel-radius': px(theme.radiusPanel),
    'tile-radius': px(theme.radiusTile),
    glow: theme.glow
      ? `0 0 ${px(theme.glow.blur)} color-mix(in srgb, var(--accent) ${theme.glow.opacity * 100}%, transparent)`
      : 'none',
    sheen: sheenGradient(theme.sheen, mode),
  }
}
