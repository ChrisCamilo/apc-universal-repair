import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { themeBootScript, themeCss } from './src/theme.ts'

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
export default defineConfig({
  plugins: [react(), tailwindcss(), themePlugin()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3333",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
})
