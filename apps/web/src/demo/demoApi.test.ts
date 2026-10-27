import { afterEach, expect, test, vi } from 'vitest'
import { loggedInSchema } from '@apc/shared/auth'
import { IMPORT_CONFLICTS } from '@apc/shared/item-csv'
import { itemMatchesQuery } from '@apc/shared/item-filters'
import { itemListQuerySchema, itemListResponseSchema, itemSchema, type Item } from '@apc/shared/items'
import { listEntriesSchema, listEntrySchema, vehicleModelsSchema, type ListEntry } from '@apc/shared/lists'
import { ITEM_PHOTO_LIMIT, PHOTO_PARTS } from '@apc/shared/photos'
import { createDemoApi } from './demoApi.ts'
import { DEMO_ITEMS, DEMO_PHOTOS, DEMO_USER } from './demoData.ts'
import { DEMO_HEADER, DEMO_MARKER } from './demoMarker.ts'
import { installDemoApi } from './installDemoApi.ts'

/** A brand of an item to send, valid unless the test changes it. */
const BRAND = { partBrand: 'cobreq', code: 'nv-1', quantity: 3, unitPriceCents: 4990 }
/** The page's own fetch, put back after a test replaces it. */
const FETCH = window.fetch

/** An item to send, valid unless the test changes it. */
const ITEM = { name: 'tensor da correia', category: 'motor', vehicles: [{ vehicleBrand: 'volkswagen', vehicleModel: 'gol' }], brands: [BRAND] }

afterEach(() => {
  window.fetch = FETCH
})

/**
 * Starts a fresh demo and logs in as its user.
 * @returns How to call it, with the session's token unless told otherwise.
 */
async function demo() {
  const api = createDemoApi()
  const call = (method: string, path: string, body?: unknown, token?: string | null) =>
    api.handle(
      new Request(`http://demo.test/api${path}`, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
        headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) },
      }),
    )
  const token = (await (await call('POST', '/sessions', { username: DEMO_USER.username, password: DEMO_USER.password })).json()).token as string
  /** Calls the demo with the session. */
  const as = (method: string, path: string, body?: unknown) => call(method, path, body, token)
  /** Reads the whole stock. */
  const items = async () => (await (await as('GET', '/items')).json()).items as Item[]
  /** Reads one of the lists. */
  const list = async (path: string) => (await (await as('GET', path)).json()) as ListEntry[]
  /** Sets a brand's photos, sending the parts as the app does, in order. */
  const sendPhotos = (itemId: string, brandId: string, parts: [string, string | Blob][]) => {
    const form = new FormData()
    parts.forEach(([name, value]) => form.append(name, value))
    return api.handle(
      new Request(`http://demo.test/api/items/${itemId}/brands/${brandId}/photos`, {
        method: 'PUT',
        body: form,
        headers: { authorization: `Bearer ${token}` },
      }),
    )
  }
  return { call, as, token, items, list, sendPhotos }
}

/**
 * Draws a small PNG, as a photo the app sends once reduced.
 * @param name The file's name.
 * @returns The file.
 */
async function png(name = 'foto.png'): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 3
  const blob = await new Promise<Blob>((done) => canvas.toBlob((made) => done(made!), 'image/png'))
  return new File([blob], name, { type: 'image/png' })
}

// Logs in as the demo's user and with a wrong password, signs up a new user and the same username again, and checks
// the answers are the API's, every other route asks for a session, the tutorial is marked and logging out ends the
// session; the health check is open, and every answer is marked as the demo's.
test('Web: the demo signs up, logs in and out as the API does', async () => {
  const { call, as, token } = await demo()
  const health = await call('GET', '/health')
  expect([health.status, (await health.json()).status, health.headers.get(DEMO_HEADER)]).toEqual([200, 'ok', DEMO_MARKER])
  const wrong = await call('POST', '/sessions', { username: DEMO_USER.username, password: 'errada123' })
  expect([wrong.status, (await wrong.json()).message]).toEqual([401, 'Wrong username or password.'])
  expect((await call('GET', '/items')).status).toBe(401)
  expect((await call('GET', '/items', undefined, 'not-a-session')).status).toBe(401)

  const signUp = { displayName: 'Ana Souza', username: 'Ana.Souza', email: 'ana@oficina.com', password: 'freio1234' }
  const created = await call('POST', '/users', signUp)
  expect(created.status).toBe(201)
  expect(loggedInSchema.parse(await created.json())).toMatchObject({ username: 'ana.souza', initials: 'AS', inventoryTutorialSeen: false })
  const again = await call('POST', '/users', signUp)
  expect([again.status, (await again.json()).details[0].field]).toEqual([409, 'username'])
  const invalid = await call('POST', '/users', { ...signUp, username: 'a', password: '1' })
  expect(invalid.status).toBe(400)
  expect((await invalid.json()).details.map((detail: { field: string }) => detail.field)).toEqual(['username', 'password'])

  const ana = (await (await call('POST', '/sessions', { username: 'ana.souza', password: 'freio1234' })).json()).token
  expect((await call('PUT', '/users/me/inventory-tutorial', undefined, ana)).status).toBe(204)
  expect((await (await call('POST', '/sessions', { username: 'ana.souza', password: 'freio1234' })).json()).inventoryTutorialSeen).toBe(true)
  expect((await call('DELETE', '/sessions/current', undefined, ana)).status).toBe(204)
  expect((await call('GET', '/items', undefined, ana)).status).toBe(401)
  expect((await as('GET', '/items')).status).toBe(200)
  expect((await as('GET', '/nada')).status).toBe(404)
  expect(token).not.toBe(ana)
})

// Reads the demo's stock newest first, then searches, filters by stock status, sorts by price one page at a time and
// asks for a page size the API refuses, and checks each answer fits the API's schema and chooses the items the shared
// matcher does.
test('Web: the demo lists its items as the API does', async () => {
  const { as, items } = await demo()
  const all = await items()
  expect(itemListResponseSchema.parse(await (await as('GET', '/items')).json()).total).toBe(DEMO_ITEMS.length)
  expect(all[0].name).toBe(DEMO_ITEMS.at(-1)!.name)
  expect(all.map((item) => item.createdAt)).toEqual(all.map((item) => item.createdAt).sort().reverse())
  for (const query of ['q=freio', 'q=pd1210', 'status=low', 'status=out', 'category=Motor&category=Freios', 'position=T', 'vehicleBrand=Fiat']) {
    const answer = await (await as('GET', `/items?${query}`)).json()
    const asked = itemListQuerySchema.parse(Object.fromEntries(new URLSearchParams(query)))
    const expected = all.filter((item) => itemMatchesQuery(item, { ...asked, category: new URLSearchParams(query).getAll('category') }))
    expect(answer.items.map((item: Item) => item.id).sort(), query).toEqual(expected.map((item) => item.id).sort())
    expect(answer.total, query).toBe(expected.length)
  }
  const cheap = await (await as('GET', '/items?sort=price&order=asc&page=1&pageSize=25')).json()
  expect(cheap.items).toHaveLength(25)
  expect(cheap.total).toBe(DEMO_ITEMS.length)
  expect(cheap.items[0].name).toBe('Vela de ignição')
  const second = await (await as('GET', '/items?sort=price&order=asc&page=2&pageSize=25')).json()
  expect(second.items).toHaveLength(DEMO_ITEMS.length - 25)
  expect((await as('GET', '/items?pageSize=7')).status).toBe(400)
})

// Creates an item with names written loosely, and one with a code another item uses and one with a field missing, and
// checks the first comes back as the API saves it, its new names joining the lists ignoring case and accents, the
// second is refused naming the item, and the third names the field.
test('Web: the demo creates items under the API rules', async () => {
  const { as, list } = await demo()
  const created = await as('POST', '/items', { ...ITEM, brands: [{ ...BRAND, color: '' }], originalCodes: [' oem-9 '] })
  expect(created.status).toBe(201)
  expect(itemSchema.parse(await created.json())).toMatchObject({
    name: 'Tensor da correia',
    category: 'Motor',
    vehicles: [{ vehicleBrand: 'Volkswagen', vehicleModel: 'Gol' }],
    position: 'N/A',
    quantity: 3,
    originalCodes: ['OEM-9'],
    brands: [{ partBrand: 'Cobreq', code: 'NV-1', color: 'N/A', location: null, photos: [] }],
  })
  expect((await list('/categories')).filter((entry) => entry.name === 'Motor')).toHaveLength(1)
  expect(listEntriesSchema.parse(await list('/part-brands')).map((entry) => entry.name)).toContain('Cobreq')

  const taken = await as('POST', '/items', { ...ITEM, brands: [{ ...BRAND, code: 'nv 1x' }, { ...BRAND, partBrand: 'Bosch', code: 'W712-95' }] })
  expect(taken.status).toBe(409)
  expect((await taken.json()).details[0]).toMatchObject({ field: 'brands/1/code', code: 'W712-95', itemName: 'Filtro de óleo' })
  const missing = await as('POST', '/items', { ...ITEM, vehicles: [] })
  expect([missing.status, (await missing.json()).details[0].field]).toEqual([400, 'vehicles'])
})

// Edits an item's name and brands, keeping one by its id, adding one and leaving one out, then sends a brand of
// another item, a code twice and a code in use, and deletes it, and checks each answer is the API's.
test('Web: the demo edits and deletes items under the API rules', async () => {
  const { as, items } = await demo()
  const pads = (await items()).find((item) => item.name === 'Pastilha de freio dianteira')!
  const [kept] = pads.brands
  const edited = await as('PATCH', `/items/${pads.id}`, {
    name: 'pastilha dianteira',
    brands: [
      { id: kept.id, partBrand: kept.partBrand, code: kept.code, quantity: 1, unitPriceCents: kept.unitPriceCents },
      { partBrand: 'Jurid', code: 'JU-77', quantity: 2, unitPriceCents: 7990 },
    ],
  })
  expect(edited.status).toBe(200)
  const after = itemSchema.parse(await edited.json())
  expect([after.name, after.quantity, after.brands.map((brand) => brand.partBrand), after.brands[0].id]).toEqual([
    'Pastilha dianteira',
    3,
    ['Cobreq', 'Jurid'],
    kept.id,
  ])
  expect(after.vehicles).toEqual(pads.vehicles)

  const other = (await items()).find((item) => item.id !== pads.id)!
  const foreign = await as('PATCH', `/items/${pads.id}`, { brands: [{ ...BRAND, id: other.brands[0].id }] })
  expect(foreign.status).toBe(400)
  const twice = await as('PATCH', `/items/${pads.id}`, { originalCodes: ['ju 77'] })
  expect([twice.status, (await twice.json()).message]).toEqual([400, 'Code "ju 77" is repeated in the item.'])
  const taken = await as('PATCH', `/items/${pads.id}`, { originalCodes: [other.brands[0].code] })
  expect([taken.status, (await taken.json()).details[0].itemId]).toEqual([409, other.id])

  expect((await as('DELETE', `/items/${pads.id}`)).status).toBe(204)
  expect((await as('DELETE', `/items/${pads.id}`)).status).toBe(404)
  expect((await as('PATCH', `/items/${pads.id}`, { name: 'X' })).status).toBe(404)
})

// Adds a category that is already listed and one that isn't, renames one onto another's name and then freely, merges
// one into another and into itself, deletes a used one and an unused one, and tries a catalog brand, and checks every
// answer is the API's and the items show the new names.
test('Web: the demo keeps the lists as the API does', async () => {
  const { as, items, list } = await demo()
  const held = await as('POST', '/categories', { name: ' freios ' })
  expect([held.status, listEntrySchema.parse(await held.json()).name]).toEqual([200, 'Freios'])
  const added = await as('POST', '/categories', { name: 'carroceria' })
  expect(added.status).toBe(201)
  const body = (await added.json()) as ListEntry
  expect(body.name).toBe('Carroceria')
  const categories = await list('/categories')
  expect(categories.map((entry) => entry.name)).toEqual([...categories.map((entry) => entry.name)].sort((a, b) => a.localeCompare(b, 'pt-BR')))

  const brakes = categories.find((entry) => entry.name === 'Freios')!
  const clash = await as('PATCH', `/categories/${body.id}`, { name: 'FREIOS' })
  expect([clash.status, (await clash.json()).details[0].entryId]).toEqual([409, brakes.id])
  expect((await (await as('PATCH', `/categories/${brakes.id}`, { name: 'freios e embreagem' })).json()).name).toBe('Freios e embreagem')
  expect((await items()).filter((item) => item.category === 'Freios e embreagem')).toHaveLength(5)

  const used = await as('DELETE', `/categories/${brakes.id}`)
  expect([used.status, (await used.json()).details[0].itemCount]).toEqual([409, 5])
  expect((await as('POST', `/categories/${brakes.id}/merge`, { into: brakes.id })).status).toBe(409)
  const merged = await as('POST', `/categories/${brakes.id}/merge`, { into: body.id })
  expect(await merged.json()).toEqual({ moved: 5 })
  expect((await items()).filter((item) => item.category === 'Carroceria')).toHaveLength(5)
  expect((await as('DELETE', `/categories/${brakes.id}`)).status).toBe(404)

  const extra = (await (await as('POST', '/part-brands', { name: 'Sem uso' })).json()) as ListEntry
  expect((await as('DELETE', `/part-brands/${extra.id}`)).status).toBe(204)
  const fiat = (await list('/vehicle-brands')).find((entry) => entry.name === 'Fiat')!
  expect((await (await as('DELETE', `/vehicle-brands/${fiat.id}`)).json()).message).toBe('"Fiat" is a catalog brand.')
})

// Adds vehicle models under a brand and an unknown brand, merges a model into one of another brand and into one of
// its own, and merges a vehicle brand into another, and checks the items keep each vehicle once, as the API leaves
// them.
test('Web: the demo merges vehicle models and brands as the API does', async () => {
  const { as, items, list } = await demo()
  const brands = await list('/vehicle-brands')
  const vw = brands.find((entry) => entry.name === 'Volkswagen')!
  const models = vehicleModelsSchema.parse(await list('/vehicle-models'))
  const gol = models.find((model) => model.name === 'Gol')!
  const parati = models.find((model) => model.name === 'Parati')!
  const uno = models.find((model) => model.name === 'Uno')!
  expect((await as('POST', '/vehicle-models', { name: 'gol', vehicleBrandId: vw.id })).status).toBe(200)
  expect((await as('POST', '/vehicle-models', { name: 'Kombi', vehicleBrandId: vw.id })).status).toBe(201)
  expect((await as('POST', '/vehicle-models', { name: 'Kombi', vehicleBrandId: crypto.randomUUID() })).status).toBe(404)
  expect((await as('POST', `/vehicle-models/${gol.id}/merge`, { into: uno.id })).status).toBe(409)

  const merged = await as('POST', `/vehicle-models/${parati.id}/merge`, { into: gol.id })
  expect(await merged.json()).toEqual({ moved: 1 })
  const pads = (await items()).find((item) => item.name === 'Pastilha de freio dianteira')!
  expect(pads.vehicles).toEqual([{ vehicleBrand: 'Volkswagen', vehicleModel: 'Gol' }])

  const extra = (await (await as('POST', '/vehicle-brands', { name: 'VW' })).json()) as ListEntry
  await as('POST', '/items', { ...ITEM, vehicles: [{ vehicleBrand: 'VW', vehicleModel: 'Gol' }, { vehicleBrand: 'Volkswagen', vehicleModel: 'Gol' }] })
  expect(await (await as('POST', `/vehicle-brands/${extra.id}/merge`, { into: vw.id })).json()).toEqual({ moved: 1 })
  const tensioner = (await items()).find((item) => item.name === 'Tensor da correia')!
  expect(tensioner.vehicles).toEqual([{ vehicleBrand: 'Volkswagen', vehicleModel: 'Gol' }])
  expect((await list('/vehicle-models')).filter((model) => model.name === 'Gol')).toHaveLength(1)
})

// Puts the demo in front of the page's fetch, and checks a request to /api is answered by the demo while any other goes
// out as before.
test("Web: the demo answers the page's requests to /api, and lets the others through", async () => {
  const outside = vi.fn(async () => new Response('fora'))
  window.fetch = outside as typeof fetch
  installDemoApi()
  const health = await fetch('/api/health')
  expect(health.headers.get(DEMO_HEADER)).toBe(DEMO_MARKER)
  expect(outside).not.toHaveBeenCalled()
  expect(await (await fetch('/assets/app.js')).text()).toBe('fora')
  expect(outside).toHaveBeenCalledOnce()
})

// Opens the sample items' drawings, then sends a part's photos: one new, then it kept with a new one and a copy of a
// sample, then too many, a file that isn't a photo and another brand's photo, then none, and deletes the item. Checks
// each answer is the API's, a photo sent is reached at its own address in the browser, and one removed stops being.
test('Web: the demo keeps photos in the browser under the API rules', async () => {
  const { as, call, items, sendPhotos } = await demo()
  const drawn = (await items()).filter((item) => item.brands[0].photos.length > 0)
  expect(drawn.map((item) => item.name).sort()).toEqual(Object.keys(DEMO_PHOTOS).sort())
  expect((await fetch(drawn[0].brands[0].photos[0].url)).ok).toBe(true)

  const cable = (await items()).find((item) => item.name === 'Cabo de vela')!
  const [brand] = cable.brands
  const first = await sendPhotos(cable.id, brand.id, [[PHOTO_PARTS.file, await png()]])
  expect(first.status).toBe(200)
  const [sent] = itemSchema.parse(await first.json()).brands[0].photos
  expect(sent.url).toMatch(/^blob:/)
  expect((await (await fetch(sent.url)).blob()).type).toBe('image/png')
  expect((await call('GET', `/photos/${sent.id}.webp`)).status).toBe(200)
  expect((await call('GET', `/photos/${crypto.randomUUID()}.webp`)).status).toBe(404)

  const sample = drawn[0].brands[0].photos[0]
  const second = await sendPhotos(cable.id, brand.id, [
    [PHOTO_PARTS.keep, sent.id],
    [PHOTO_PARTS.file, await png('outra.png')],
    [PHOTO_PARTS.copy, sample.id],
  ])
  const three = itemSchema.parse(await second.json()).brands[0].photos
  expect([three.length, three[0], three[2].url]).toEqual([ITEM_PHOTO_LIMIT, sent, sample.url])
  expect(three[2].id).not.toBe(sample.id)

  const tooMany = await sendPhotos(cable.id, brand.id, three.map((photo): [string, string] => [PHOTO_PARTS.keep, photo.id]).concat([[PHOTO_PARTS.copy, sample.id]]))
  expect([tooMany.status, (await tooMany.json()).details.at(-1).message]).toEqual([400, `A brand of an item holds at most ${ITEM_PHOTO_LIMIT} photos.`])
  const text = await sendPhotos(cable.id, brand.id, [[PHOTO_PARTS.file, new File(['oi'], 'nota.png', { type: 'image/png' })]])
  expect((await text.json()).details[0].message).toBe('Photo 1 is not a JPG, PNG or WebP image.')
  const foreign = await sendPhotos(cable.id, brand.id, [[PHOTO_PARTS.keep, sample.id]])
  expect((await foreign.json()).details[0].message).toBe("Kept photos must be this brand's photos, each kept once.")
  expect((await sendPhotos(cable.id, crypto.randomUUID(), [])).status).toBe(404)

  const none = await sendPhotos(cable.id, brand.id, [[PHOTO_PARTS.keep, three[1].id]])
  expect(itemSchema.parse(await none.json()).brands[0].photos).toEqual([three[1]])
  await expect(fetch(sent.url)).rejects.toThrow()
  expect((await as('DELETE', `/items/${cable.id}`)).status).toBe(204)
  await expect(fetch(three[1].url)).rejects.toThrow()
  expect((await fetch(sample.url)).ok).toBe(true)
})

// Imports a new item and one whose code is in use, then files with the codes of two items in one, a code held the
// other way and a new code for a part brand the item has, each after a valid item, and checks the first file goes in
// as the API saves it and each of the others is refused whole, with the API's reason.
test('Web: the demo imports a file whole or not at all, as the API does', async () => {
  const { as, items } = await demo()
  const created = { ...ITEM, name: 'Coxim do motor', brands: [{ ...BRAND, code: 'CX-9' }] }
  const pads = {
    name: 'Pastilha de freio dianteira',
    category: 'Freios',
    vehicles: [{ vehicleBrand: 'Fiat', vehicleModel: 'Uno' }],
    originalCodes: ['5U0 698 151', 'GM-0042'],
    brands: [
      { partBrand: 'Cobreq', code: 'n-1210', quantity: 20, unitPriceCents: 7990 },
      { partBrand: 'Jurid', code: 'JU-1210', quantity: 2, unitPriceCents: 8490 },
    ],
  }
  const imported = await as('POST', '/items/import', { items: [created, pads] })
  expect([imported.status, await imported.json()]).toEqual([200, { created: 1, updated: 1 }])
  const after = (await items()).find((item) => item.name === 'Pastilha de freio dianteira')!
  expect(after.vehicles).toEqual([{ vehicleBrand: 'Fiat', vehicleModel: 'Uno' }])
  expect(after.originalCodes).toEqual(['5U0 698 151', 'GM-0042'])
  expect(after.brands.map((brand) => [brand.partBrand, brand.code, brand.quantity])).toEqual([
    ['Cobreq', 'N-1210', 20],
    ['Fras-le', 'PD/1210', 4],
    ['Jurid', 'JU-1210', 2],
  ])
  expect((await items()).some((item) => item.name === 'Coxim do motor')).toBe(true)

  const count = (await items()).length
  const valid = { ...ITEM, name: 'Suporte do câmbio', brands: [{ ...BRAND, code: 'SC-1' }] }
  const refusals: [object, string][] = [
    [{ ...pads, originalCodes: [], brands: [{ ...pads.brands[0] }, { partBrand: 'Mann', code: 'W 712/95', quantity: 1, unitPriceCents: 3990 }] }, IMPORT_CONFLICTS.owners(pads.name, 2)],
    [{ ...pads, originalCodes: ['PD/1210'], brands: [{ ...pads.brands[0] }] }, IMPORT_CONFLICTS.crossed(pads.name, 'PD/1210')],
    [{ ...pads, originalCodes: [], brands: [{ ...pads.brands[0] }, { partBrand: 'Fras-le', code: 'FR-9', quantity: 1, unitPriceCents: 9990 }] }, IMPORT_CONFLICTS.partBrand(pads.name, 'Fras-le', 'FR-9')],
  ]
  for (const [item, message] of refusals) {
    const refused = await as('POST', '/items/import', { items: [valid, item] })
    expect([refused.status, (await refused.json()).message]).toEqual([409, message])
    expect((await items()).length).toBe(count)
  }
  expect((await items()).find((item) => item.name === 'Pastilha de freio dianteira')).toEqual(after)
  expect((await as('POST', '/items/import', { items: [] })).status).toBe(400)
})
