import { SESSION_STORAGE_KEY } from '@apc/shared/auth'
import { afterEach, expect, test } from 'vitest'
import { readStored, removeStored } from '../storage.ts'
import { DEMO_USER } from './demoData.ts'
import { DemoNotice } from './DemoNotice.tsx'
import { ROUTE_PARAM, startDemo } from './startDemo.ts'

// startDemo puts the demo's API in front of the page's fetch and logs its user in; each test gives the page back its
// fetch, its address and no session.
const fetch = window.fetch
const address = window.location.href

afterEach(() => {
  window.fetch = fetch
  window.history.replaceState(null, '', address)
  removeStored(SESSION_STORAGE_KEY)
})

// Starts the demo and checks its user is logged in by the demo's own API, the session saved, and the app gets the
// user's login, for the login screen, and the notice; the address stays as it was.
test('Web: the demo starts logged in as its user', async () => {
  const demo = await startDemo()
  expect(demo.login).toEqual({ username: DEMO_USER.username, password: DEMO_USER.password })
  expect(demo.Notice).toBe(DemoNotice)
  expect(readStored(SESSION_STORAGE_KEY)).toContain(`"username":"${DEMO_USER.username}"`)
  expect(window.location.href).toBe(address)
})

// Opens the demo as the site's 404.html sends a route back, with "?route=" holding the route and its own query, and
// checks the route is put back in the address under the demo's base, without the parameter, keeping the hash.
test('Web: the demo puts back a route sent as ?route=', async () => {
  window.history.replaceState(null, '', `?${ROUTE_PARAM}=${encodeURIComponent('catalog?brand=fiat')}#tree`)
  await startDemo()
  expect(window.location.pathname).toBe(`${import.meta.env.BASE_URL}catalog`)
  expect(window.location.search).toBe('?brand=fiat')
  expect(window.location.hash).toBe('#tree')
})
