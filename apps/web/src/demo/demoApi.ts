import { RELEASE_VERSION } from 'virtual:apc-release'
import { credentialsSchema, initials, userCreateSchema } from '@apc/shared/auth'
import { itemMatchesQuery } from '@apc/shared/item-filters'
import {
  capitalizeFirst,
  codeKey,
  itemCreateSchema,
  itemIdParamsSchema,
  itemListQuerySchema,
  itemUpdateSchema,
  NOT_APPLICABLE,
  optionKey,
  sortableOf,
  sortItems,
  type Item,
  type ItemBrandCreate,
  type ItemCreate,
  type ItemPhoto,
  type ItemVehicleCreate,
} from '@apc/shared/items'
import {
  isCatalogBrand,
  ITEM_LIST_PATHS,
  listEntryCreateSchema,
  listEntryIdParamsSchema,
  listEntryMergeSchema,
  listName,
  vehicleModelCreateSchema,
  type ItemListKind,
  type ListEntry,
} from '@apc/shared/lists'
import { DEMO_ITEMS, DEMO_USER } from './demoData.ts'
import { DEMO_HEADER, DEMO_MARKER } from './demoMarker.ts'

// The API of the web app's demo, answered in the browser: the demo has no server (it runs on GitHub Pages), so its
// requests to /api never leave the page (see installDemoApi.ts). It answers every route of apps/api but the photos and
// the CSV import with the API's statuses and bodies, under the API's rules: the shared schemas check what comes in,
// the list chooses its items with the shared matcher (itemMatchesQuery) and sorts them with sortItems, codes are unique
// across the stock, and the lists' names follow the writing rule and stay apart ignoring case and accents. Everything is
// held in memory and starts over from demoData.ts when the page loads again. Each answer carries the demo's marker
// (demoMarker.ts).

/** One day, in milliseconds, between the demo's items' creation. */
const DAY_MS = 86_400_000
/** The items using an entry of each list. */
const ITEMS_USING: Record<ItemListKind, (item: StoredItem, id: string) => boolean> = {
  categories: (item, id) => item.categoryId === id,
  partBrands: (item, id) => item.brands.some((brand) => brand.partBrandId === id),
  vehicleBrands: (item, id) => item.vehicles.some((vehicle) => vehicle.brandId === id),
  vehicleModels: (item, id) => item.vehicles.some((vehicle) => vehicle.modelId === id),
}
/** The lists of plain names, by their path. */
const NAME_LISTS = ['categories', 'partBrands', 'vehicleBrands'] as const

/** The demo's data: users and their sessions, the four lists and the items, which refer to the lists' entries. */
type Db = {
  users: User[]
  /** User ids by session token. */
  sessions: Map<string, string>
  categories: ListEntry[]
  partBrands: ListEntry[]
  vehicleBrands: ListEntry[]
  vehicleModels: (ListEntry & { brandId: string })[]
  items: StoredItem[]
}
/** What a route gets: the request's path parameters, its query, its body, and the caller's token and id, when logged in. */
type Call = { params: Record<string, string>; query: URLSearchParams; body: unknown; token?: string; userId?: string }
/** What a shared schema reports when a value fails it: each issue's path and message. */
type Issues = { issues: readonly { path: readonly PropertyKey[]; message: string }[] }
/** A route of the demo: its method, its path with :params, whether it is open without a session, and its answer. */
type Route = { method: string; path: string; open?: boolean; answer: (call: Call) => Response }
/** A shared schema, as the demo reads with it: a parse that tells the value read or why it failed. */
type Schema<Value> = { safeParse: (value: unknown) => { success: true; data: Value } | { success: false; error: Issues } }
/** An item as the demo keeps it: its list entries by id, so a renamed entry shows its new name on every item. */
type StoredItem = Omit<Item, 'category' | 'vehicles' | 'brands' | 'quantity'> & {
  categoryId: string
  vehicles: { brandId: string; modelId: string | null }[]
  brands: (Omit<Item['brands'][number], 'partBrand'> & { partBrandId: string })[]
}
/** A user of the demo. */
type User = { id: string; username: string; displayName: string; password: string; inventoryTutorialSeen: boolean }

/**
 * Answers 400 for a body, query or path that fails its schema, as the API's error handler does.
 * @param error The schema's error.
 * @returns The answer.
 */
function badRequest(error: Issues): Response {
  return json(400, {
    statusCode: 400,
    error: 'Bad Request',
    message: 'One or more fields failed validation.',
    details: error.issues.map((issue) => ({ field: issue.path.join('/') || 'unknown', message: issue.message })),
  })
}

/**
 * Builds a brand of an item as the demo keeps it: the code uppercase, its part brand referenced, the color N/A when
 * empty.
 * @param db The demo's data.
 * @param input The brand as sent.
 * @param photos The photos it keeps, on an edit.
 * @returns The brand.
 */
function brandOf(db: Db, input: ItemBrandCreate, photos: ItemPhoto[] = []): StoredItem['brands'][number] {
  return {
    id: input.id ?? crypto.randomUUID(),
    partBrandId: listed(db.partBrands, input.partBrand).id,
    code: input.code.trim().toUpperCase(),
    color: textOrNull(input.color) ?? NOT_APPLICABLE,
    location: textOrNull(input.location),
    quantity: input.quantity ?? 0,
    unitPriceCents: input.unitPriceCents,
    photos,
  }
}

/**
 * Answers 409 for a change a list can't take, as the API does.
 * @param message Why.
 * @param reason How many items use the entry, or the entry that has the name.
 * @returns The answer.
 */
function conflict(message: string, reason: { itemCount?: number; entryId?: string } = {}): Response {
  return json(409, { statusCode: 409, error: 'Conflict', message, details: [{ field: 'id', message, ...reason }] })
}

/**
 * Creates the demo's API, with its data fresh from demoData.ts.
 * @returns How the demo answers a request to /api.
 */
export function createDemoApi(): { handle: (request: Request) => Promise<Response> } {
  const db: Db = { users: [], sessions: new Map(), categories: [], partBrands: [], vehicleBrands: [], vehicleModels: [], items: [] }
  db.users.push({ id: crypto.randomUUID(), ...DEMO_USER, inventoryTutorialSeen: true })
  const start = Date.now() - DEMO_ITEMS.length * DAY_MS
  DEMO_ITEMS.forEach((input, index) => createItem(db, input, new Date(start + index * DAY_MS).toISOString()))
  const routes = [...sessionRoutes(db), ...itemRoutes(db), ...listRoutes(db)]

  return {
    async handle(request) {
      const url = new URL(request.url)
      const path = url.pathname.replace(/^\/api/, '')
      for (const route of routes) {
        const params = matchPath(route.path, path)
        if (route.method !== request.method || !params) {
          continue
        }
        const token = request.headers.get('authorization')?.replace(/^Bearer /, '')
        const userId = token ? db.sessions.get(token) : undefined
        if (!route.open && !userId) {
          return json(401, { statusCode: 401, error: 'Unauthorized', message: 'Log in to use the API.' })
        }
        const text = await request.text()
        let body: unknown
        try {
          body = text ? JSON.parse(text) : undefined
        } catch {
          return json(400, { statusCode: 400, error: 'Bad Request', message: 'The body is not valid JSON.' })
        }
        return route.answer({ params, query: url.searchParams, body, token, userId })
      }
      return json(404, { message: `Route ${request.method}:${path} not found`, error: 'Not Found', statusCode: 404 })
    },
  }
}

/**
 * Adds an item, its names joining the lists that don't hold them yet.
 * @param db The demo's data.
 * @param input The item as sent, checked.
 * @param createdAt When it is created.
 * @returns The item.
 */
function createItem(db: Db, input: ItemCreate, createdAt = new Date().toISOString()): StoredItem {
  const stored: StoredItem = {
    id: crypto.randomUUID(),
    name: capitalizeFirst(input.name),
    categoryId: listed(db.categories, input.category).id,
    vehicles: input.vehicles.map((vehicle) => vehicleOf(db, vehicle)),
    position: input.position ?? NOT_APPLICABLE,
    side: input.side ?? NOT_APPLICABLE,
    minQuantity: input.minQuantity ?? 0,
    originalCodes: (input.originalCodes ?? []).map((code) => code.trim().toUpperCase()),
    brands: input.brands.map((brand) => brandOf(db, { ...brand, id: undefined })),
    createdAt,
    updatedAt: createdAt,
  }
  db.items.push(stored)
  return stored
}

/**
 * Takes out the vehicles an item holds twice after a merge, keeping each one's first place.
 * @param item The item.
 */
function dropRepeatedVehicles(item: StoredItem): void {
  const seen = new Set<string>()
  item.vehicles = item.vehicles.filter((vehicle) => {
    const key = `${vehicle.brandId}|${vehicle.modelId ?? ''}`
    const first = !seen.has(key)
    seen.add(key)
    return first
  })
}

/**
 * Finds the first code sent that another item uses, as a brand's code or an original one.
 * @param db The demo's data.
 * @param body The create or edit body.
 * @param itemId The item they belong to, which may keep its own codes.
 * @returns The code, its field and the item that uses it, or undefined when every code is free.
 */
function findTakenCode(db: Db, body: { brands?: readonly { code: string }[]; originalCodes?: readonly string[] }, itemId?: string) {
  const sent = [
    ...(body.brands ?? []).map((brand, index) => ({ code: brand.code.trim().toUpperCase(), field: `brands/${index}/code` })),
    ...(body.originalCodes ?? []).map((code, index) => ({ code: code.trim().toUpperCase(), field: `originalCodes/${index}` })),
  ]
  for (const each of sent) {
    const owner = db.items.find(
      (item) =>
        item.id !== itemId &&
        [...item.brands.map((brand) => brand.code), ...item.originalCodes].some((code) => codeKey(code) === codeKey(each.code)),
    )
    if (owner) {
      return { ...each, owner }
    }
  }
  return undefined
}

/**
 * Lists the routes of the items: the list, creating, editing and deleting.
 * @param db The demo's data.
 * @returns The routes.
 */
function itemRoutes(db: Db): Route[] {
  return [
    {
      method: 'GET',
      path: '/items',
      answer: ({ query }) => {
        const asked = read(itemListQuerySchema, queryObject(query))
        if (!asked.ok) {
          return asked.answer
        }
        const { page = 1, pageSize, sort, order = 'asc' } = asked.value
        const matched = db.items.map((item) => toItem(db, item)).filter((item) => itemMatchesQuery(item, asked.value))
        const ordered = sort
          ? sortItems(
              matched.map((item) => ({ ...sortableOf(item), item })),
              { key: sort, dir: order },
            ).map((row) => row.item)
          : matched.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
        return json(200, { items: pageSize ? ordered.slice((page - 1) * pageSize, page * pageSize) : ordered, total: ordered.length })
      },
    },
    {
      method: 'POST',
      path: '/items',
      answer: ({ body }) => {
        const sent = read(itemCreateSchema, body)
        if (!sent.ok) {
          return sent.answer
        }
        const taken = findTakenCode(db, sent.value)
        return taken ? codeTaken(taken) : json(201, toItem(db, createItem(db, sent.value)))
      },
    },
    {
      method: 'PATCH',
      path: '/items/:id',
      answer: ({ params, body }) => {
        const id = read(itemIdParamsSchema, params)
        const sent = read(itemUpdateSchema, body)
        if (!id.ok) {
          return id.answer
        }
        if (!sent.ok) {
          return sent.answer
        }
        const item = db.items.find((each) => each.id === id.value.id)
        if (!item) {
          return itemNotFound()
        }
        const { brands, originalCodes, vehicles, ...fields } = sent.value
        if (brands?.some((brand) => brand.id && !item.brands.some((held) => held.id === brand.id))) {
          return json(400, { statusCode: 400, error: 'Bad Request', message: "A brand sent with an id must be one of this item's." })
        }
        const codes = [...(brands ?? item.brands).map((brand) => brand.code), ...(originalCodes ?? item.originalCodes)]
        const repeated = codes.find((code, index) => codes.slice(0, index).some((other) => codeKey(other) === codeKey(code)))
        if (repeated) {
          return json(400, { statusCode: 400, error: 'Bad Request', message: `Code "${repeated}" is repeated in the item.` })
        }
        const taken = findTakenCode(db, sent.value, item.id)
        if (taken) {
          return codeTaken(taken)
        }
        updateItem(db, item, fields, { brands, originalCodes, vehicles })
        return json(200, toItem(db, item))
      },
    },
    {
      method: 'DELETE',
      path: '/items/:id',
      answer: ({ params }) => {
        const id = read(itemIdParamsSchema, params)
        if (!id.ok) {
          return id.answer
        }
        const index = db.items.findIndex((each) => each.id === id.value.id)
        if (index < 0) {
          return itemNotFound()
        }
        db.items.splice(index, 1)
        return noContent()
      },
    },
  ]

  /** Answers 409 for a code another item already uses, naming the item. */
  function codeTaken(taken: { code: string; field: string; owner: StoredItem }) {
    const message = `Code "${taken.code}" is already used by "${taken.owner.name}".`
    return json(409, {
      statusCode: 409,
      error: 'Conflict',
      message,
      details: [{ field: taken.field, message, code: taken.code, itemId: taken.owner.id, itemName: taken.owner.name }],
    })
  }

  /** Answers 404 for an item that doesn't exist. */
  function itemNotFound() {
    return json(404, { statusCode: 404, error: 'Not Found', message: 'Item not found.' })
  }
}

/**
 * Answers with a JSON body, marked as the demo's.
 * @param status The status.
 * @param body The body.
 * @returns The answer.
 */
function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', [DEMO_HEADER]: DEMO_MARKER } })
}

/**
 * Finds the entry of a list a name stands for, ignoring case, accents and extra spaces, or adds it with the writing
 * rule.
 * @param list The list.
 * @param text The name as sent.
 * @returns The entry.
 */
function listed(list: ListEntry[], text: string): ListEntry {
  const name = listName(text)
  const held = list.find((entry) => optionKey(entry.name) === optionKey(name))
  if (held) {
    return held
  }
  const entry = { id: crypto.randomUUID(), name }
  list.push(entry)
  return entry
}

/**
 * Lists the routes of the four lists: listing, creating, renaming, merging and deleting entries.
 * @param db The demo's data.
 * @returns The routes.
 */
function listRoutes(db: Db): Route[] {
  const routes: Route[] = []
  for (const kind of NAME_LISTS) {
    const path = ITEM_LIST_PATHS[kind]
    const list = () => db[kind]
    routes.push(
      { method: 'GET', path, answer: () => json(200, byName(list())) },
      {
        method: 'POST',
        path,
        answer: ({ body }) => {
          const sent = read(listEntryCreateSchema, body)
          if (!sent.ok) {
            return sent.answer
          }
          const held = list().find((entry) => optionKey(entry.name) === optionKey(listName(sent.value.name)))
          return held ? json(200, held) : json(201, listed(list(), sent.value.name))
        },
      },
      {
        method: 'PATCH',
        path: `${path}/:id`,
        answer: ({ params, body }) => {
          const id = read(listEntryIdParamsSchema, params)
          const sent = read(listEntryCreateSchema, body)
          if (!id.ok) {
            return id.answer
          }
          if (!sent.ok) {
            return sent.answer
          }
          const held = list().find((entry) => entry.id === id.value.id)
          if (!held) {
            return entryNotFound()
          }
          const name = listName(sent.value.name)
          const other = list().find((entry) => optionKey(entry.name) === optionKey(name))
          if (other && other.id !== held.id) {
            return conflict(`"${other.name}" is already in the list.`, { entryId: other.id })
          }
          held.name = name
          return json(200, held)
        },
      },
      {
        method: 'POST',
        path: `${path}/:id/merge`,
        answer: ({ params, body }) => {
          const id = read(listEntryIdParamsSchema, params)
          const sent = read(listEntryMergeSchema, body)
          if (!id.ok) {
            return id.answer
          }
          if (!sent.ok) {
            return sent.answer
          }
          const held = list().find((entry) => entry.id === id.value.id)
          const kept = list().find((entry) => entry.id === sent.value.into)
          if (!held || !kept) {
            return entryNotFound()
          }
          if (held.id === kept.id) {
            return conflict("An entry can't be merged into itself.")
          }
          if (kind === 'vehicleBrands' && isCatalogBrand(held.name)) {
            return conflict(`"${held.name}" is a catalog brand.`)
          }
          const both = kind === 'partBrands' ? db.items.filter((item) => ITEMS_USING.partBrands(item, held.id) && ITEMS_USING.partBrands(item, kept.id)).length : 0
          if (both > 0) {
            return conflict(`${both} items have both "${held.name}" and "${kept.name}".`, { itemCount: both })
          }
          return json(200, { moved: merge(db, kind, held.id, kept.id) })
        },
      },
      {
        method: 'DELETE',
        path: `${path}/:id`,
        answer: ({ params }) => {
          const id = read(listEntryIdParamsSchema, params)
          if (!id.ok) {
            return id.answer
          }
          const held = list().find((entry) => entry.id === id.value.id)
          if (!held) {
            return entryNotFound()
          }
          if (kind === 'vehicleBrands' && isCatalogBrand(held.name)) {
            return conflict(`"${held.name}" is a catalog brand.`)
          }
          const itemCount = db.items.filter((item) => ITEMS_USING[kind](item, held.id)).length
          if (itemCount > 0) {
            return conflict(`"${held.name}" is used by ${itemCount} items.`, { itemCount })
          }
          list().splice(list().indexOf(held), 1)
          if (kind === 'vehicleBrands') {
            db.vehicleModels = db.vehicleModels.filter((model) => model.brandId !== held.id)
          }
          return noContent()
        },
      },
    )
  }

  const modelsPath = ITEM_LIST_PATHS.vehicleModels
  /** A model as the API sends it, with its vehicle brand's id. */
  const toModel = (model: Db['vehicleModels'][number]) => ({ id: model.id, name: model.name, vehicleBrandId: model.brandId })
  routes.push(
    { method: 'GET', path: modelsPath, answer: () => json(200, byName(db.vehicleModels).map(toModel)) },
    {
      method: 'POST',
      path: modelsPath,
      answer: ({ body }) => {
        const sent = read(vehicleModelCreateSchema, body)
        if (!sent.ok) {
          return sent.answer
        }
        const brandId = sent.value.vehicleBrandId
        if (!db.vehicleBrands.some((entry) => entry.id === brandId)) {
          return json(404, { statusCode: 404, error: 'Not Found', message: 'Vehicle brand not found.' })
        }
        const name = listName(sent.value.name)
        const held = db.vehicleModels.find((model) => model.brandId === brandId && optionKey(model.name) === optionKey(name))
        return held ? json(200, toModel(held)) : json(201, toModel(modelOf(db, brandId, name)))
      },
    },
    {
      method: 'PATCH',
      path: `${modelsPath}/:id`,
      answer: ({ params, body }) => {
        const id = read(listEntryIdParamsSchema, params)
        const sent = read(listEntryCreateSchema, body)
        if (!id.ok) {
          return id.answer
        }
        if (!sent.ok) {
          return sent.answer
        }
        const held = db.vehicleModels.find((model) => model.id === id.value.id)
        if (!held) {
          return entryNotFound()
        }
        const name = listName(sent.value.name)
        const other = db.vehicleModels.find((model) => model.brandId === held.brandId && optionKey(model.name) === optionKey(name))
        if (other && other.id !== held.id) {
          return conflict(`"${other.name}" is already a model of this brand.`, { entryId: other.id })
        }
        held.name = name
        return json(200, toModel(held))
      },
    },
    {
      method: 'POST',
      path: `${modelsPath}/:id/merge`,
      answer: ({ params, body }) => {
        const id = read(listEntryIdParamsSchema, params)
        const sent = read(listEntryMergeSchema, body)
        if (!id.ok) {
          return id.answer
        }
        if (!sent.ok) {
          return sent.answer
        }
        const held = db.vehicleModels.find((model) => model.id === id.value.id)
        const kept = db.vehicleModels.find((model) => model.id === sent.value.into)
        if (!held || !kept) {
          return entryNotFound()
        }
        if (held.id === kept.id) {
          return conflict("An entry can't be merged into itself.")
        }
        if (held.brandId !== kept.brandId) {
          return conflict('A model can only be merged into a model of its brand.')
        }
        return json(200, { moved: merge(db, 'vehicleModels', held.id, kept.id) })
      },
    },
    {
      method: 'DELETE',
      path: `${modelsPath}/:id`,
      answer: ({ params }) => {
        const id = read(listEntryIdParamsSchema, params)
        if (!id.ok) {
          return id.answer
        }
        const held = db.vehicleModels.find((model) => model.id === id.value.id)
        if (!held) {
          return entryNotFound()
        }
        const itemCount = db.items.filter((item) => ITEMS_USING.vehicleModels(item, held.id)).length
        if (itemCount > 0) {
          return conflict(`"${held.name}" is used by ${itemCount} items.`, { itemCount })
        }
        db.vehicleModels = db.vehicleModels.filter((model) => model.id !== held.id)
        return noContent()
      },
    },
  )
  return routes

  /** Sorts entries by name the way the form shows them, accents in their alphabetical place. */
  function byName<Entry extends ListEntry>(entries: Entry[]) {
    return [...entries].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }

  /** Answers 404 for an entry that doesn't exist. */
  function entryNotFound() {
    return json(404, { statusCode: 404, error: 'Not Found', message: 'List entry not found.' })
  }
}

/**
 * Reads a path against a route's path, its :params taking the path's segments.
 * @param pattern The route's path, e.g. "/items/:id".
 * @param path The request's path, without /api.
 * @returns The params, or null when the path isn't the route's.
 */
function matchPath(pattern: string, path: string): Record<string, string> | null {
  const wanted = pattern.split('/')
  const given = path.split('/')
  if (wanted.length !== given.length) {
    return null
  }
  const params: Record<string, string> = {}
  for (const [index, part] of wanted.entries()) {
    if (part.startsWith(':')) {
      params[part.slice(1)] = decodeURIComponent(given[index])
    } else if (part !== given[index]) {
      return null
    }
  }
  return params
}

/**
 * Merges an entry into another of its list: the items using it move there and it is deleted. A vehicle brand's models
 * move to the other brand, and one whose name that brand already has joins its model; an item left with a vehicle twice
 * keeps it once.
 * @param db The demo's data.
 * @param kind The list.
 * @param id The entry merged away.
 * @param into The entry it is merged into.
 * @returns How many items moved; for part brands, how many of the items' brands.
 */
function merge(db: Db, kind: ItemListKind, id: string, into: string): number {
  if (kind === 'categories') {
    const moved = db.items.filter((item) => item.categoryId === id)
    moved.forEach((item) => (item.categoryId = into))
    db.categories = db.categories.filter((entry) => entry.id !== id)
    return moved.length
  }
  if (kind === 'partBrands') {
    const moved = db.items.flatMap((item) => item.brands).filter((brand) => brand.partBrandId === id)
    moved.forEach((brand) => (brand.partBrandId = into))
    db.partBrands = db.partBrands.filter((entry) => entry.id !== id)
    return moved.length
  }
  const moved = db.items.filter((item) => ITEMS_USING[kind](item, id))
  if (kind === 'vehicleModels') {
    moved.forEach((item) => item.vehicles.forEach((vehicle) => vehicle.modelId === id && (vehicle.modelId = into)))
    db.vehicleModels = db.vehicleModels.filter((model) => model.id !== id)
  } else {
    for (const model of db.vehicleModels.filter((each) => each.brandId === id)) {
      const twin = db.vehicleModels.find((each) => each.brandId === into && optionKey(each.name) === optionKey(model.name))
      if (twin) {
        db.items.forEach((item) => item.vehicles.forEach((vehicle) => vehicle.modelId === model.id && (vehicle.modelId = twin.id)))
        db.vehicleModels = db.vehicleModels.filter((each) => each.id !== model.id)
      } else {
        model.brandId = into
      }
    }
    moved.forEach((item) => item.vehicles.forEach((vehicle) => vehicle.brandId === id && (vehicle.brandId = into)))
    db.vehicleBrands = db.vehicleBrands.filter((entry) => entry.id !== id)
  }
  moved.forEach(dropRepeatedVehicles)
  return moved.length
}

/**
 * Adds a vehicle model under its brand.
 * @param db The demo's data.
 * @param brandId Its vehicle brand.
 * @param name Its name, written by the rule.
 * @returns The model.
 */
function modelOf(db: Db, brandId: string, name: string): Db['vehicleModels'][number] {
  const model = { id: crypto.randomUUID(), name, brandId }
  db.vehicleModels.push(model)
  return model
}

/**
 * Answers 204, with no body.
 * @returns The answer.
 */
function noContent(): Response {
  return new Response(null, { status: 204, headers: { [DEMO_HEADER]: DEMO_MARKER } })
}

/**
 * Reads a query as the API's server does: a key given once is a string, given more times a list.
 * @param query The query.
 * @returns The query as an object.
 */
function queryObject(query: URLSearchParams): Record<string, string | string[]> {
  return Object.fromEntries([...new Set(query.keys())].map((key) => [key, query.getAll(key).length > 1 ? query.getAll(key) : query.get(key)!]))
}

/**
 * Reads a query, a body or path parameters with their schema.
 * @param schema The schema.
 * @param value What came in.
 * @returns The value read, or the 400 answer.
 */
function read<Value>(schema: Schema<Value>, value: unknown): { ok: true; value: Value } | { ok: false; answer: Response } {
  const parsed = schema.safeParse(value)
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, answer: badRequest(parsed.error) }
}

/**
 * Lists the routes of signing up, logging in and out, the tutorial and the health check.
 * @param db The demo's data.
 * @returns The routes.
 */
function sessionRoutes(db: Db): Route[] {
  /** Starts a session for a user, answering with them and its token. */
  const loggedIn = (status: number, user: User) => {
    const token = crypto.randomUUID()
    db.sessions.set(token, user.id)
    const { id, username, displayName, inventoryTutorialSeen } = user
    return json(status, { id, username, displayName, initials: initials(displayName), inventoryTutorialSeen, token })
  }
  return [
    {
      method: 'GET',
      path: '/health',
      open: true,
      answer: () => json(200, { status: 'ok', timestamp: new Date().toISOString(), version: RELEASE_VERSION }),
    },
    {
      method: 'POST',
      path: '/users',
      open: true,
      answer: ({ body }) => {
        const sent = read(userCreateSchema, body)
        if (!sent.ok) {
          return sent.answer
        }
        const { username, displayName, password } = sent.value
        if (db.users.some((user) => user.username === username)) {
          const message = `Username "${username}" is already taken.`
          return json(409, { statusCode: 409, error: 'Conflict', message, details: [{ field: 'username', message }] })
        }
        const user = { id: crypto.randomUUID(), username, displayName, password, inventoryTutorialSeen: false }
        db.users.push(user)
        return loggedIn(201, user)
      },
    },
    {
      method: 'POST',
      path: '/sessions',
      open: true,
      answer: ({ body }) => {
        const sent = read(credentialsSchema, body)
        if (!sent.ok) {
          return sent.answer
        }
        const user = db.users.find((each) => each.username === sent.value.username && each.password === sent.value.password)
        return user ? loggedIn(200, user) : json(401, { statusCode: 401, error: 'Unauthorized', message: 'Wrong username or password.' })
      },
    },
    {
      method: 'DELETE',
      path: '/sessions/current',
      answer: ({ token }) => {
        db.sessions.delete(token!)
        return noContent()
      },
    },
    {
      method: 'PUT',
      path: '/users/me/inventory-tutorial',
      answer: ({ userId }) => {
        db.users.find((user) => user.id === userId)!.inventoryTutorialSeen = true
        return noContent()
      },
    },
  ]
}

/**
 * Reduces an optional text to what is kept: the written text, or null when empty.
 * @param value Text as sent.
 * @returns The text with a capital first letter, or null.
 */
function textOrNull(value: string | undefined): string | null {
  return value?.trim() ? capitalizeFirst(value) : null
}

/**
 * Turns an item as the demo keeps it into the item the API sends, with its entries' names and its quantity.
 * @param db The demo's data.
 * @param item The item.
 * @returns The item as itemSchema describes it.
 */
function toItem(db: Db, item: StoredItem): Item {
  const { categoryId, vehicles, brands, ...own } = item
  const name = (list: ListEntry[], id: string) => list.find((entry) => entry.id === id)!.name
  return {
    ...own,
    category: name(db.categories, categoryId),
    vehicles: vehicles.map((vehicle) => ({
      vehicleBrand: name(db.vehicleBrands, vehicle.brandId),
      vehicleModel: vehicle.modelId ? name(db.vehicleModels, vehicle.modelId) : null,
    })),
    quantity: brands.reduce((sum, brand) => sum + brand.quantity, 0),
    brands: brands.map(({ partBrandId, ...brand }) => ({ ...brand, partBrand: name(db.partBrands, partBrandId) })),
  }
}

/**
 * Applies an edit to an item: its own fields, and, when sent, its whole new vehicles, original codes and brands, a
 * brand with its id kept with its photos, one without added, one left out removed.
 * @param db The demo's data.
 * @param item The item.
 * @param fields Its own fields sent.
 * @param lists Its lists sent.
 */
function updateItem(
  db: Db,
  item: StoredItem,
  fields: Partial<Pick<ItemCreate, 'name' | 'category' | 'position' | 'side' | 'minQuantity'>>,
  lists: { brands?: ItemBrandCreate[]; originalCodes?: string[]; vehicles?: ItemVehicleCreate[] },
): void {
  if (fields.name !== undefined) {
    item.name = capitalizeFirst(fields.name)
  }
  if (fields.category !== undefined) {
    item.categoryId = listed(db.categories, fields.category).id
  }
  item.position = fields.position ?? item.position
  item.side = fields.side ?? item.side
  item.minQuantity = fields.minQuantity ?? item.minQuantity
  if (lists.vehicles) {
    item.vehicles = lists.vehicles.map((vehicle) => vehicleOf(db, vehicle))
  }
  if (lists.originalCodes) {
    item.originalCodes = lists.originalCodes.map((code) => code.trim().toUpperCase())
  }
  if (lists.brands) {
    item.brands = lists.brands.map((brand) => brandOf(db, brand, item.brands.find((held) => held.id === brand.id)?.photos))
  }
  item.updatedAt = new Date().toISOString()
}

/**
 * Finds the entries of a vehicle an item fits, adding the brand, or the model under its brand, the lists don't hold.
 * @param db The demo's data.
 * @param vehicle The vehicle as sent.
 * @returns Its brand's and model's ids, the model null for any model of the brand.
 */
function vehicleOf(db: Db, vehicle: ItemVehicleCreate): StoredItem['vehicles'][number] {
  const brandId = listed(db.vehicleBrands, vehicle.vehicleBrand).id
  const model = vehicle.vehicleModel?.trim()
  if (!model) {
    return { brandId, modelId: null }
  }
  const name = listName(model)
  const held = db.vehicleModels.find((each) => each.brandId === brandId && optionKey(each.name) === optionKey(name))
  return { brandId, modelId: (held ?? modelOf(db, brandId, name)).id }
}
