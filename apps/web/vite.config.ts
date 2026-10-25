import { existsSync, readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { DEV_SERVER_PORT } from '@apc/shared/server'
import { themeBootScript, themeCss } from './src/theme.ts'

// The module that gives the app the release it is built for (see releasePlugin and src/release.d.ts).
const RELEASE_MODULE = 'virtual:apc-release'

/**
 * Gives the app the release it is built for, as the module "virtual:apc-release": its version, from the desktop app's
 * package.json, which the release check keeps equal to the API's, and its notes, docs/releases/v<version>.md, or
 * undefined while that version has none. Both are read at build time, so the app shows them offline.
 * @returns Vite plugin that serves the module.
 */
function releasePlugin(): Plugin {
  const resolved = `\0${RELEASE_MODULE}`
  return {
    name: 'apc-release',
    resolveId: (source) => (source === RELEASE_MODULE ? resolved : undefined),
    load(id) {
      if (id !== resolved) {
        return undefined
      }
      const { version } = JSON.parse(readFileSync(new URL('../desktop/package.json', import.meta.url), 'utf8')) as { version: string }
      const notesFile = new URL(`../../docs/releases/v${version}.md`, import.meta.url)
      const notes = existsSync(notesFile) ? readFileSync(notesFile, 'utf8') : undefined
      return `export const RELEASE_VERSION = ${JSON.stringify(version)}\nexport const RELEASE_NOTES = ${JSON.stringify(notes)}\n`
    },
  }
}

/**
 * Writes the theme variables and the boot script into index.html, so the saved style and mode
 * apply before the first paint instead of after the JavaScript bundle loads.
 * @returns Vite plugin that prepends a `<script>` and a `<style id="theme-tokens">` to `<head>`.
 */
function themePlugin(): Plugin {
  return {
    name: 'apc-theme',
    transformIndexHtml() {
      return [
        { tag: 'script', children: themeBootScript(), injectTo: 'head-prepend' },
        { tag: 'style', attrs: { id: 'theme-tokens' }, children: themeCss(), injectTo: 'head-prepend' },
      ]
    },
  }
}

// https://vite.dev/config/
// Calls to /api go to the API `pnpm dev` runs, on the development port, never to the desktop app's server.
export default defineConfig({
  plugins: [react(), tailwindcss(), themePlugin(), releasePlugin()],
  server: {
    proxy: {
      "/api": {
        target: `http://localhost:${DEV_SERVER_PORT}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
})
