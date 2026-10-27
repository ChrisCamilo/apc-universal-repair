import type { Credentials } from '@apc/shared/auth'
import { auth } from '../auth/auth.ts'
import { DEMO_USER } from './demoData.ts'
import { DemoNotice } from './DemoNotice.tsx'
import { installDemoApi } from './installDemoApi.ts'

// Starts the web app's demo before the app renders (see main.tsx): its API answers /api in the browser, a route that
// GitHub Pages sent back through its 404.html (docs/site/404.html, as "?route=") is put back in the address, and the
// demo's user is logged in, as on every load the demo's data starts over. The app gets the user's login, to fill in
// the login screen after "Sair", and the demo's notice, to show above it.

/** The query parameter docs/site/404.html sends a route the site couldn't serve back in. */
export const ROUTE_PARAM = 'route'

/**
 * Starts the demo.
 * @returns The demo user's login and the notice to show above the app.
 */
export async function startDemo(): Promise<{ login: Credentials; Notice: typeof DemoNotice }> {
  installDemoApi()
  const route = new URLSearchParams(window.location.search).get(ROUTE_PARAM)
  if (route !== null) {
    window.history.replaceState(null, '', `${import.meta.env.BASE_URL}${route.replace(/^\//, '')}${window.location.hash}`)
  }
  const login = { username: DEMO_USER.username, password: DEMO_USER.password }
  await auth.login(login)
  return { login, Notice: DemoNotice }
}
