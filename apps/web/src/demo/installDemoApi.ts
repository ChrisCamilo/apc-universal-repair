import { API_BASE } from '../api.ts'
import { createDemoApi } from './demoApi.ts'

// Puts the demo's API in front of the page's fetch: a request to this page's /api is answered by the demo, in the
// browser, and any other request goes out as it would. Only the demo's build calls it (see main.tsx).

/**
 * Answers the page's requests to /api with the demo's API from now on.
 * @param api The demo's API; a fresh one by default.
 */
export function installDemoApi(api = createDemoApi()): void {
  const send = window.fetch.bind(window)
  window.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href)
    const demo = url.origin === window.location.origin && url.pathname.startsWith(`${API_BASE}/`)
    return demo ? api.handle(input instanceof Request ? input : new Request(url, init)) : send(input, init)
  }
}
