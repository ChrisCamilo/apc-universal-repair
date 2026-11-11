import { expect, test } from 'vitest'
import { API_ROUTES } from '@apc/domain/api-routes'
import { catalogSchema, type CatalogData } from '@apc/domain/catalog'
import type { Item } from '@apc/domain/items'
import { ITEM_LIST_PATHS, type ListEntry } from '@apc/domain/lists'
import { PHOTO_PARTS } from '@apc/domain/photos'
import { createDemoApi, DEMO_UNAVAILABLE, DEMO_UNAVAILABLE_ROUTES } from './demoApi.ts'
import { DEMO_USER } from './demoData.ts'
import { DEMO_DEVICE_STAND_IN } from './demoDevice.ts'

// The demo's routes against @apc/domain/api-routes, the list the API's server is checked against too (see
// apps/api/src/apiRoutes.test.ts): a route the API has and the demo doesn't, or the other way around, fails,
// and so does an answer of the demo that the API's schema for it doesn't read, as when the API gains a field. Each
// route of the list has a call here that it answers with success, so a new route needs one too; the device routes
// the demo doesn't do answer 501 saying so (DEMO_UNAVAILABLE_ROUTES).

/** What the demo's logins send in place of a device's proof (see demoDevice.ts). */
const DEVICE = { publicKey: DEMO_DEVICE_STAND_IN, nonce: DEMO_DEVICE_STAND_IN, signature: DEMO_DEVICE_STAND_IN }
/** A call that each route answers with success, on a fresh demo, logged in, by "METHOD path". */
const CALLS: Record<string, (demo: Demo) => Promise<Response>> = {
  'GET /health': ({ call }) => call('GET', '/health'),
  'POST /users': ({ call }) =>
    call('POST', '/users', { displayName: 'Nova Oficina', username: 'nova', email: 'nova@oficina.test', password: 'senha-da-nova', device: DEVICE }),
  'POST /sessions': ({ call }) => call('POST', '/sessions', { username: DEMO_USER.username, password: DEMO_USER.password, device: DEVICE }),
  'POST /sessions/pairing': ({ call }) => call('POST', '/sessions/pairing', { code: 'K7Q2ZD9M', device: DEVICE }),
  'DELETE /sessions/current': ({ call }) => call('DELETE', '/sessions/current'),
  'POST /pairings': ({ call }) => call('POST', '/pairings'),
  'PUT /users/me/inventory-tutorial': ({ call }) => call('PUT', '/users/me/inventory-tutorial'),
  'GET /devices/challenge': ({ call }) => call('GET', '/devices/challenge'),
  'POST /devices/status': ({ call }) => call('POST', '/devices/status', DEVICE),
  'GET /devices': ({ call }) => call('GET', '/devices'),
  'POST /devices/:id/authorize': ({ call }) => call('POST', '/devices/d1/authorize', {}),
  'PATCH /devices/:id': ({ call }) => call('PATCH', '/devices/d1', { name: 'Celular' }),
  'DELETE /devices/:id': ({ call }) => call('DELETE', '/devices/d1'),
  'GET /items': ({ call }) => call('GET', '/items'),
  'POST /items': ({ call }) => call('POST', '/items', ITEM),
  'POST /items/import': ({ call }) => call('POST', '/items/import', { items: [ITEM] }),
  'PATCH /items/:id': async ({ call, item }) => call('PATCH', `/items/${(await item()).id}`, { name: 'Tensor renomeado' }),
  'DELETE /items/:id': async ({ call, item }) => call('DELETE', `/items/${(await item()).id}`),
  'PUT /items/:id/brands/:brandId/photos': async ({ sendPhoto }) => sendPhoto(),
  'GET /photos/:file': async ({ call, sendPhoto }) => {
    const item = (await (await sendPhoto()).json()) as Item
    return call('GET', `/photos/${item.brands[0].photos[0].id}.png`)
  },
  'GET /catalog': ({ call }) => call('GET', '/catalog'),
  'POST /catalog/brands': ({ call }) => call('POST', '/catalog/brands', { name: 'Renault' }),
  'POST /catalog/brands/:id/models': async (demo) => demo.call('POST', `/catalog/brands/${(await opala(demo)).brand}/models`, { name: 'Kadett' }),
  'POST /catalog/models/:id/generations': async (demo) =>
    demo.call('POST', `/catalog/models/${(await opala(demo)).model}/generations`, { name: 'Quarta geração', firstYear: 1993, lastYear: null }),
  'POST /catalog/generations/:id/versions': async (demo) =>
    demo.call('POST', `/catalog/generations/${(await opala(demo)).generation}/versions`, { name: 'Caravan' }),
  'POST /catalog/versions/:id/years': async (demo) => demo.call('POST', `/catalog/versions/${(await opala(demo)).version}/years`, { year: 1987 }),
  'PATCH /catalog/models/:id': async (demo) => demo.call('PATCH', `/catalog/models/${(await opala(demo)).model}`, { name: 'Opala SS' }),
  'PATCH /catalog/generations/:id': async (demo) =>
    demo.call('PATCH', `/catalog/generations/${(await opala(demo)).generation}`, { name: 'Terceira geração', firstYear: 1980, lastYear: 1992 }),
  'PATCH /catalog/versions/:id': async (demo) => demo.call('PATCH', `/catalog/versions/${(await opala(demo)).version}`, { name: 'Diplomata SE' }),
  'PATCH /catalog/years/:id': async (demo) => demo.call('PATCH', `/catalog/years/${(await opala(demo)).year}`, { year: 1988 }),
  ...Object.fromEntries(
    (['model', 'generation', 'version', 'year'] as const).flatMap((level) => {
      const path = `/catalog/${level === 'year' ? 'years' : `${level}s`}`
      return [
        [`POST ${path}/:id/move`, async (demo: Demo) => demo.call('POST', `${path}/${(await opala(demo))[level]}/move`, { direction: 'up' })],
        [`DELETE ${path}/:id`, async (demo: Demo) => demo.call('DELETE', `${path}/${(await opala(demo))[level]}`)],
      ]
    }),
  ),
  ...Object.fromEntries(Object.values(ITEM_LIST_PATHS).flatMap((path) => Object.entries(listCalls(path)))),
}
/** An item to send. */
const ITEM = { name: 'tensor da correia', category: 'motor', vehicles: [{ vehicleBrand: 'volkswagen', vehicleModel: 'gol' }], brands: [{ partBrand: 'cobreq', code: 'nv-1', quantity: 3, unitPriceCents: 4990 }] }

/** A fresh demo, logged in as its user. */
type Demo = Awaited<ReturnType<typeof startDemo>>

/**
 * Finds the Opala's nodes in a fresh demo's catalog, down to its Diplomata's 1985.
 * @param demo The demo.
 * @returns The ids of Chevrolet, the Opala, its third generation, the Diplomata and its 1985.
 */
async function opala({ call }: Demo) {
  const catalog: CatalogData = catalogSchema.parse(await (await call('GET', '/catalog')).json())
  const brand = catalog.brands[0]
  const model = brand.models[1]
  const generation = model.generations[2]
  const version = generation.versions[1]
  return { brand: brand.id, model: model.id, generation: generation.id, version: version.id, year: version.years[0].id }
}

/**
 * Lists the calls of one of the item lists' routes: a new entry, and an unused one to rename, merge and delete.
 * @param path The list's path, e.g. "/categories".
 * @returns The calls, by "METHOD path".
 */
function listCalls(path: string): Record<string, (demo: Demo) => Promise<Response>> {
  /** Creates an entry no item uses, a vehicle model under the first vehicle brand. */
  const create = async ({ call }: Demo, name: string) => {
    const brand = ((await (await call('GET', ITEM_LIST_PATHS.vehicleBrands)).json()) as ListEntry[])[0]
    const body = path === ITEM_LIST_PATHS.vehicleModels ? { name, vehicleBrandId: brand.id } : { name }
    return call('POST', path, body)
  }
  /** Creates an entry no item uses and reads its id. */
  const created = async (demo: Demo, name: string) => ((await (await create(demo, name)).json()) as ListEntry).id
  return {
    [`GET ${path}`]: ({ call }) => call('GET', path),
    [`POST ${path}`]: (demo) => create(demo, 'Entrada nova'),
    [`PATCH ${path}/:id`]: async (demo) => demo.call('PATCH', `${path}/${await created(demo, 'Entrada nova')}`, { name: 'Entrada renomeada' }),
    [`POST ${path}/:id/merge`]: async (demo) =>
      demo.call('POST', `${path}/${await created(demo, 'Entrada nova')}/merge`, { into: await created(demo, 'Outra entrada') }),
    [`DELETE ${path}/:id`]: async (demo) => demo.call('DELETE', `${path}/${await created(demo, 'Entrada nova')}`),
  }
}

/**
 * Names a route the way the failures list it.
 * @param route The route's method and path.
 * @returns E.g. "PATCH /items/:id".
 */
function named(route: { method: string; path: string }): string {
  return `${route.method} ${route.path}`
}

/**
 * Starts a fresh demo and logs in as its user.
 * @returns How to call it with the session, read its first item and send a photo to that item's first brand.
 */
async function startDemo() {
  const api = createDemoApi()
  const send = (method: string, path: string, body?: BodyInit, headers: Record<string, string> = {}) =>
    api.handle(new Request(`http://demo.test/api${path}`, { method, body, headers }))
  const login = { username: DEMO_USER.username, password: DEMO_USER.password, device: DEVICE }
  const { token } = (await (await send('POST', '/sessions', JSON.stringify(login), { 'content-type': 'application/json' })).json()) as { token: string }
  const authorization = `Bearer ${token}`
  /** Calls the demo with the session, sending a body as JSON. */
  const call = (method: string, path: string, body?: unknown) =>
    send(method, path, body === undefined ? undefined : JSON.stringify(body), { 'content-type': 'application/json', authorization })
  /** Reads the first item of the stock. */
  const item = async () => ((await (await call('GET', '/items')).json()) as { items: Item[] }).items[0]
  /** Sends a small PNG as the only photo of the first item's first brand. */
  const sendPhoto = async () => {
    const { id, brands } = await item()
    const canvas = document.createElement('canvas')
    const blob = await new Promise<Blob>((done) => canvas.toBlob((made) => done(made!), 'image/png'))
    const form = new FormData()
    form.append(PHOTO_PARTS.file, new File([blob], 'foto.png', { type: 'image/png' }))
    return send('PUT', `/items/${id}/brands/${brands[0].id}/photos`, form, { authorization })
  }
  return { call, item, sendPhoto }
}

// Lists the routes the demo answers and checks they are the routes of the shared list, naming any route only one side
// has, and that each has its call here.
test('Web: the demo answers the routes of the shared list, as the API does', () => {
  const ours = createDemoApi().routes.map(named)
  const listed = API_ROUTES.map(named)
  expect({ missingFromDemo: listed.filter((route) => !ours.includes(route)), notInApi: ours.filter((route) => !listed.includes(route)) }).toEqual({
    missingFromDemo: [],
    notInApi: [],
  })
  expect(listed.filter((route) => !CALLS[route])).toEqual([])
})

// Makes each route's call on a fresh demo and checks it succeeds, and that the body, for a status the shared list
// gives a schema to, is read by the API's own schema; the device routes the demo doesn't do answer 501, saying so.
test("Web: the demo answers each route with the API's bodies", async () => {
  for (const route of API_ROUTES) {
    const answer = await CALLS[named(route)](await startDemo())
    if (DEMO_UNAVAILABLE_ROUTES.includes(named(route))) {
      expect([answer.status, ((await answer.json()) as { message: string }).message], named(route)).toEqual([501, DEMO_UNAVAILABLE])
      continue
    }
    expect(answer.ok, `${named(route)} answered ${answer.status}`).toBe(true)
    const schema = route.responses[answer.status]
    if (schema) {
      const parsed = schema.safeParse(await answer.json())
      expect(parsed.error?.issues ?? [], `${named(route)}: the body of ${answer.status}`).toEqual([])
    }
  }
})
