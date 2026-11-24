import { brandMark } from "../catalog/catalog.ts";
import {
  capitalizeFirst,
  colorText,
  MAX_QUANTITY,
  NOT_APPLICABLE,
  optionKey,
  type Item,
  type ItemBrandCreate,
  type ItemCreate,
  type ItemVehicleCreate,
} from "../inventory/items.ts";
import { listName, type ItemListKind } from "../inventory/lists.ts";
import type { SyncCopy, SyncRow, SyncRows } from "./copy.ts";
import { editOf } from "./conflicts.ts";
import type { SyncConflict, SyncOperation, SyncOperationResult } from "./sync.ts";

// The changes a phone makes to the inventory, kept in order to send to the server (see sync.ts), apart from the copy of
// the server's rows (see copy.ts), so a sync never wipes one not sent yet. Besides the item operations the server takes
// in a batch, the queue keeps the photos set on a brand, sent as the photo route takes them, and the names added to a
// list, sent to the list's route. The Inventory shows the copy with the queue applied over it (withQueue), the way the
// server would apply each change: names its lists don't hold added, its vehicles linked to the Catalog, adding what the
// Catalog lacks, the texts written by the same rules, the item's quantity its brands' sum and a stock move stopping at
// 0. What the phone makes gets its id there: a new item and its brands the ids they are sent with, a new photo the id it
// is kept by until sent, and a name or a Catalog entry an id drawn from the operation's, the same each time it is
// applied. An operation the server accepted stays in the queue, marked sent, until a sync brings its change into the
// copy. A stock change is sent as a move on a brand (itemOperations), never as its new total, so two phones' moves add up.
// An edit sends only the fields it changes, with what the phone saw of them, and a delete what the phone saw of the item,
// so the server can tell what it changed meanwhile; one in conflict with that stays in the queue, unsent, until each of
// its conflicts is settled on the phone (see conflicts.ts), and over the copy it shows the phone's side meanwhile.

/** A photo of a brand as the queue sets it: a saved photo kept, a copy of another saved photo, or a new file. */
export type QueuedPhoto =
  | { keep: string }
  | { copy: string; id: string }
  | { file: { url: string; name: string; type: string }; id: string };
/** What every queued operation keeps besides its own fields. */
type Queued<Operation> = Operation & {
  /** When it was made, ISO, which a new item takes as its date and an edit as its last change. */
  at: string;
  /** The name of the item or the list entry it changes, as the phone showed it, to say which one the server refused. */
  label: string;
  /** Set once the server accepted it: it stays over the copy until a sync brings its change in. */
  sent?: true;
  /** Why the server answered it in conflict: it waits, unsent, until each is settled (see conflicts.ts). */
  conflicts?: SyncConflict[];
  /** The item as the phone showed it when the conflicts came, to make it again or to name its brands. */
  snapshot?: Item;
};
/** Sets a brand's photos, as PUT /items/:id/brands/:brandId/photos does. */
export type PhotosOperation = { id: string; type: "savePhotos"; itemId: string; brandId: string; photos: QueuedPhoto[] };
/** Adds a name to a list, as its route does; a vehicle model goes under its vehicle brand, by name. */
export type NameOperation = { id: string; type: "addName"; kind: ItemListKind; name: string; vehicleBrand?: string };
/** An operation in the queue. */
export type QueuedOperation = Queued<SyncOperation> | Queued<PhotosOperation> | Queued<NameOperation>;
/** An item operation in the queue, which goes in a batch to POST /sync/operations. */
export type QueuedItemOperation = Queued<SyncOperation>;

/** The operations the server takes in a batch. */
const BATCHED: ReadonlySet<string> = new Set<SyncOperation["type"]>(["createItem", "updateItem", "deleteItem", "moveStock"]);
/** The table of each list's names. */
const LIST_TABLES = { categories: "category", partBrands: "partBrand", vehicleBrands: "vehicleBrand" } as const;

/**
 * Tells whether an operation goes in a batch to POST /sync/operations.
 * @param operation The operation.
 * @returns True for the item operations.
 */
export function isItemOperation(operation: QueuedOperation): operation is QueuedItemOperation {
  return BATCHED.has(operation.type);
}

/**
 * Turns a queued item operation into what the server is sent, without what only the queue keeps.
 * @param operation The operation.
 * @returns The operation as POST /sync/operations takes it.
 */
export function sentOperation(operation: QueuedItemOperation): SyncOperation {
  const sent: Partial<QueuedItemOperation> = { ...operation };
  delete sent.at;
  delete sent.label;
  delete sent.sent;
  delete sent.conflicts;
  delete sent.snapshot;
  return sent as SyncOperation;
}

/**
 * Applies the queue over a copy, as the server would apply each operation, leaving the copy as it was.
 * @param copy The copy of the server's rows.
 * @param queue The operations, in order.
 * @returns A copy with the operations applied; the same copy when the queue is empty.
 */
export function withQueue(copy: SyncCopy, queue: readonly QueuedOperation[]): SyncCopy {
  if (queue.length === 0) {
    return copy;
  }
  const rows = Object.fromEntries(Object.entries(copy.rows).map(([kind, table]) => [kind, { ...table }])) as SyncRows;
  for (const operation of queue) {
    applyOperation(rows, operation);
  }
  return { ...copy, rows };
}

/**
 * Draws the ids of what an operation adds besides its item and brands, the same each time it is applied: its own id
 * with a count in place of its last part.
 * @param id The operation's id.
 * @returns What gives the next id.
 */
function idsOf(id: string): () => string {
  let count = 0;
  return () => `${id.slice(0, 24)}${(count++).toString(16).padStart(12, "0")}`;
}

/**
 * Reduces an optional text to what the server saves.
 * @param value The text as sent.
 * @returns The text with a capital first letter, or null when empty.
 */
function textOrNull(value: string | undefined): string | null {
  return value?.trim() ? capitalizeFirst(value) : null;
}

/**
 * Finds the place after some siblings.
 * @param siblings The siblings.
 * @returns The place after the last, or 0 for the first.
 */
function nextPosition(siblings: readonly { position: number }[]): number {
  return Math.max(-1, ...siblings.map((sibling) => sibling.position)) + 1;
}

/**
 * Finds the entry of a name in a list, ignoring case, accents and extra spaces, or adds it, as the server does.
 * @param rows The rows.
 * @param table The list's table.
 * @param name The name as sent.
 * @param next Gives the id of an entry added.
 * @returns The entry's id.
 */
function entryOf(rows: SyncRows, table: "category" | "partBrand" | "vehicleBrand", name: string, next: () => string): string {
  const written = listName(name);
  const held = Object.values(rows[table]).find((entry) => optionKey(entry.name) === optionKey(written));
  if (held) {
    return held.id;
  }
  const id = next();
  rows[table][id] = { id, name: written };
  return id;
}

/**
 * Finds the entry of a vehicle model under its brand, or adds it.
 * @param rows The rows.
 * @param brandId The vehicle brand's id.
 * @param name The model as sent.
 * @param next Gives the id of an entry added.
 * @returns The model's id.
 */
function modelOf(rows: SyncRows, brandId: string, name: string, next: () => string): string {
  const written = listName(name);
  const held = Object.values(rows.vehicleModel).find((model) => model.brandId === brandId && optionKey(model.name) === optionKey(written));
  if (held) {
    return held.id;
  }
  const id = next();
  rows.vehicleModel[id] = { id, name: written, brandId };
  return id;
}

/**
 * Finds the catalog model of a vehicle model, adding it, and its brand's catalog brand, when the Catalog hasn't them.
 * @param rows The rows.
 * @param brandId The vehicle brand.
 * @param vehicleModelId The vehicle model.
 * @param next Gives the ids of what is added.
 * @returns The catalog model's id.
 */
function catalogModelOf(rows: SyncRows, brandId: string, vehicleModelId: string, next: () => string): string {
  const held = Object.values(rows.catalogModel).find((model) => model.vehicleModelId === vehicleModelId);
  if (held) {
    return held.id;
  }
  if (!Object.values(rows.catalogBrand).some((brand) => brand.brandId === brandId)) {
    const id = next();
    rows.catalogBrand[id] = { id, brandId, mark: brandMark(rows.vehicleBrand[brandId].name), position: nextPosition(Object.values(rows.catalogBrand)) };
  }
  const siblings = Object.values(rows.catalogModel).filter((model) => rows.vehicleModel[model.vehicleModelId]?.brandId === brandId);
  const id = next();
  rows.catalogModel[id] = { id, vehicleModelId, position: nextPosition(siblings) };
  return id;
}

/**
 * Links a vehicle to the Catalog's generation of its years and version of its name, adding what the Catalog lacks: a
 * generation named after its place ("G3"), at the end of the model's.
 * @param rows The rows.
 * @param ids The vehicle's brand and model.
 * @param vehicle The vehicle as sent.
 * @param next Gives the ids of what is added.
 * @returns Its generation's and version's ids, null without a model or a generation.
 */
function catalogLinks(
  rows: SyncRows,
  ids: { vehicleBrandId: string; vehicleModelId: string | null },
  vehicle: ItemVehicleCreate,
  next: () => string,
): { generationId: string | null; versionId: string | null } {
  if (!ids.vehicleModelId || vehicle.firstYear == null) {
    return { generationId: null, versionId: null };
  }
  const modelId = catalogModelOf(rows, ids.vehicleBrandId, ids.vehicleModelId, next);
  const lastYear = vehicle.lastYear ?? null;
  const generations = Object.values(rows.catalogGeneration).filter((generation) => generation.modelId === modelId);
  let generation = generations.find((each) => each.firstYear === vehicle.firstYear && each.lastYear === lastYear);
  if (!generation) {
    const id = next();
    generation = { id, modelId, position: nextPosition(generations), name: `G${generations.length + 1}`, firstYear: vehicle.firstYear, lastYear };
    rows.catalogGeneration[id] = generation;
  }
  const name = vehicle.version?.trim();
  if (!name) {
    return { generationId: generation.id, versionId: null };
  }
  const generationId = generation.id;
  const versions = Object.values(rows.catalogVersion).filter((version) => version.generationId === generationId);
  const held = versions.find((version) => optionKey(version.name) === optionKey(name));
  if (held) {
    return { generationId, versionId: held.id };
  }
  const id = next();
  rows.catalogVersion[id] = { id, generationId, position: nextPosition(versions), name: listName(name) };
  return { generationId, versionId: id };
}

/**
 * Builds an item's vehicles as the copy keeps them, adding the names and the Catalog entries they lack.
 * @param rows The rows.
 * @param vehicles The vehicles as sent.
 * @param next Gives the ids of what is added.
 * @returns The vehicles, in order.
 */
function vehiclesOf(rows: SyncRows, vehicles: readonly ItemVehicleCreate[], next: () => string): SyncRow<"item">["vehicles"] {
  return vehicles.map((vehicle) => {
    const vehicleBrandId = entryOf(rows, "vehicleBrand", vehicle.vehicleBrand, next);
    const model = vehicle.vehicleModel?.trim();
    const vehicleModelId = model ? modelOf(rows, vehicleBrandId, model, next) : null;
    return { vehicleBrandId, vehicleModelId, ...catalogLinks(rows, { vehicleBrandId, vehicleModelId }, vehicle, next) };
  });
}

/**
 * Builds a brand's row as the server saves it: the code uppercase, the color uppercase or N/A, a blank location null.
 * @param rows The rows.
 * @param brand The brand as sent.
 * @param place Its id, its item, its place among the item's brands and when it was saved.
 * @param held The brand's row before, when it is kept: its quantity, when none is sent, and its date.
 * @param next Gives the id of a part brand added.
 * @returns The row.
 */
function brandRow(
  rows: SyncRows,
  brand: ItemBrandCreate,
  place: { id: string; itemId: string; position: number; at: string },
  held: SyncRow<"itemBrand"> | undefined,
  next: () => string,
): SyncRow<"itemBrand"> {
  return {
    id: place.id,
    itemId: place.itemId,
    position: place.position,
    partBrandId: entryOf(rows, "partBrand", brand.partBrand, next),
    code: brand.code.trim().toUpperCase(),
    color: brand.color?.trim() ? colorText(brand.color.trim()) : NOT_APPLICABLE,
    location: textOrNull(brand.location),
    quantity: brand.quantity ?? held?.quantity ?? 0,
    unitPriceCents: brand.unitPriceCents,
    createdAt: held?.createdAt ?? place.at,
    updatedAt: place.at,
  };
}

/**
 * Lists an item's brands in the rows.
 * @param rows The rows.
 * @param itemId The item.
 * @returns Its brands' rows.
 */
function brandsOf(rows: SyncRows, itemId: string): SyncRow<"itemBrand">[] {
  return Object.values(rows.itemBrand).filter((brand) => brand.itemId === itemId);
}

/**
 * Deletes a brand with its photos.
 * @param rows The rows.
 * @param brandId The brand.
 */
function deleteBrand(rows: SyncRows, brandId: string) {
  delete rows.itemBrand[brandId];
  for (const photo of Object.values(rows.itemPhoto)) {
    if (photo.brandId === brandId) {
      delete rows.itemPhoto[photo.id];
    }
  }
}

/**
 * Makes an item's quantity its brands' sum again.
 * @param rows The rows.
 * @param itemId The item.
 * @param at When it changed.
 */
function sumQuantity(rows: SyncRows, itemId: string, at: string) {
  const quantity = brandsOf(rows, itemId).reduce((sum, brand) => sum + brand.quantity, 0);
  rows.item[itemId] = { ...rows.item[itemId], quantity, updatedAt: at };
}

/**
 * Applies an operation to the rows, in place, as the server would; one the server would refuse, its item gone, changes
 * nothing.
 * @param rows The rows, each row replaced, never changed, so the copy's own stay as they were.
 * @param operation The operation.
 */
function applyOperation(rows: SyncRows, operation: QueuedOperation) {
  const next = idsOf(operation.id);
  const { at } = operation;
  switch (operation.type) {
    case "createItem": {
      const { item, itemId } = operation;
      for (const brand of brandsOf(rows, itemId)) {
        deleteBrand(rows, brand.id);
      }
      item.brands.forEach((brand, position) => {
        const id = brand.id ?? next();
        rows.itemBrand[id] = brandRow(rows, brand, { id, itemId, position, at }, undefined, next);
      });
      rows.item[itemId] = {
        id: itemId,
        name: capitalizeFirst(item.name),
        categoryId: entryOf(rows, "category", item.category, next),
        vehicles: vehiclesOf(rows, item.vehicles, next),
        position: item.position ?? NOT_APPLICABLE,
        side: item.side ?? NOT_APPLICABLE,
        quantity: 0,
        minQuantity: item.minQuantity ?? 0,
        originalCodes: (item.originalCodes ?? []).map((code) => code.trim().toUpperCase()),
        material: textOrNull(item.material),
        description: textOrNull(item.description),
        createdAt: at,
        updatedAt: at,
      };
      sumQuantity(rows, itemId, at);
      return;
    }
    case "updateItem": {
      const { changes, itemId } = operation;
      const held = rows.item[itemId];
      if (!held) {
        return;
      }
      const item = { ...held, updatedAt: at };
      if (changes.name !== undefined) {
        item.name = capitalizeFirst(changes.name);
      }
      if (changes.category !== undefined) {
        item.categoryId = entryOf(rows, "category", changes.category, next);
      }
      if (changes.vehicles) {
        item.vehicles = vehiclesOf(rows, changes.vehicles, next);
      }
      item.position = changes.position ?? item.position;
      item.side = changes.side ?? item.side;
      item.minQuantity = changes.minQuantity ?? item.minQuantity;
      if (changes.originalCodes) {
        item.originalCodes = changes.originalCodes.map((code) => code.trim().toUpperCase());
      }
      for (const field of ["material", "description"] as const) {
        if (changes[field] !== undefined) {
          item[field] = textOrNull(changes[field]);
        }
      }
      rows.item[itemId] = item;
      if (changes.brands) {
        const before = new Map(brandsOf(rows, itemId).map((brand) => [brand.id, brand]));
        const kept = new Set(changes.brands.flatMap((brand) => (brand.id ? [brand.id] : [])));
        const seen = operation.seen?.brands;
        // A brand the phone never saw, added on the server since, stays, after the ones sent.
        const unseen = [...before.values()].filter((brand) => !kept.has(brand.id) && seen && !(brand.id in seen));
        for (const id of before.keys()) {
          if (!kept.has(id) && !unseen.some((brand) => brand.id === id)) {
            deleteBrand(rows, id);
          }
        }
        changes.brands.forEach((brand, position) => {
          const id = brand.id ?? next();
          rows.itemBrand[id] = brandRow(rows, brand, { id, itemId, position, at }, before.get(id), next);
        });
        unseen.forEach((brand, index) => {
          rows.itemBrand[brand.id] = { ...brand, position: changes.brands!.length + index };
        });
      }
      sumQuantity(rows, itemId, at);
      return;
    }
    case "deleteItem": {
      for (const brand of brandsOf(rows, operation.itemId)) {
        deleteBrand(rows, brand.id);
      }
      delete rows.item[operation.itemId];
      return;
    }
    case "moveStock": {
      const brand = rows.itemBrand[operation.brandId];
      if (!brand || brand.itemId !== operation.itemId || !rows.item[operation.itemId]) {
        return;
      }
      const quantity = Math.min(MAX_QUANTITY, Math.max(0, brand.quantity + operation.delta));
      rows.itemBrand[brand.id] = { ...brand, quantity, updatedAt: at };
      sumQuantity(rows, operation.itemId, at);
      return;
    }
    case "savePhotos": {
      const { brandId } = operation;
      if (!rows.itemBrand[brandId]) {
        return;
      }
      const held = Object.values(rows.itemPhoto).filter((photo) => photo.brandId === brandId);
      const photos = operation.photos.flatMap((photo): SyncRow<"itemPhoto">[] => {
        if ("keep" in photo) {
          return held.filter((each) => each.id === photo.keep);
        }
        if ("copy" in photo) {
          const source = rows.itemPhoto[photo.copy];
          return source ? [{ ...source, id: photo.id }] : [];
        }
        return [{ id: photo.id, url: photo.file.url, thumbUrl: photo.file.url, brandId, position: 0 }];
      });
      held.forEach((photo) => delete rows.itemPhoto[photo.id]);
      photos.forEach((photo, position) => {
        rows.itemPhoto[photo.id] = { ...photo, brandId, position };
      });
      return;
    }
    case "addName": {
      if (operation.kind === "vehicleModels") {
        modelOf(rows, entryOf(rows, "vehicleBrand", operation.vehicleBrand ?? "", next), operation.name, next);
      } else {
        entryOf(rows, LIST_TABLES[operation.kind], operation.name, next);
      }
      return;
    }
  }
}

/**
 * Turns a saved item form into the operations that make it: a new item, with the ids the phone gives it and its
 * brands; or an edit of the item as shown, sending only the fields it changes, with what the phone saw of each (see
 * conflicts.ts), the brands it keeps without their quantity, a new brand with the id the phone gives it, and each kept
 * brand's change of quantity as a stock move after it; an edit of nothing but quantities is only the moves.
 * @param body The item as the form sends it (itemFormBody).
 * @param shown The item edited, as the Inventory shows it; none for a new item.
 * @param made The id of each new item, brand and operation, and when they were made.
 * @returns The operations, in order, the item's id and each brand's, in the order of the body's, and the item's name
 * as the operations say it.
 */
export function itemOperations(
  body: ItemCreate,
  shown: Item | undefined,
  made: { newId: () => string; at: string },
): { operations: QueuedItemOperation[]; itemId: string; brandIds: string[]; label: string } {
  const { newId, at } = made;
  const label = capitalizeFirst(body.name);
  const held = new Map((shown?.brands ?? []).map((brand) => [brand.id, brand]));
  const brands = body.brands.map((brand) => {
    const keeps = brand.id !== undefined && held.has(brand.id);
    return keeps ? { ...brand, quantity: undefined } : { ...brand, id: newId() };
  });
  const brandIds = brands.map((brand) => brand.id!);
  if (!shown) {
    const itemId = newId();
    return { operations: [{ id: newId(), type: "createItem", itemId, item: { ...body, brands }, at, label }], itemId, brandIds, label };
  }
  const changed = editOf({ ...body, brands }, shown);
  const edits: QueuedItemOperation[] = changed ? [{ id: newId(), type: "updateItem", itemId: shown.id, ...changed, at, label }] : [];
  const moves = body.brands.flatMap((brand): QueuedItemOperation[] => {
    const before = brand.id === undefined ? undefined : held.get(brand.id);
    const delta = (brand.quantity ?? 0) - (before?.quantity ?? 0);
    return before && delta !== 0 ? [{ id: newId(), type: "moveStock", itemId: shown.id, brandId: before.id, delta, at, label }] : [];
  });
  return { operations: [...edits, ...moves], itemId: shown.id, brandIds, label };
}

/**
 * What the Inventory says, while the server can't be reached, of what still needs it: renaming, merging and deleting a
 * list's names (a merge moves items on the server, which the phone can't foresee), the CSV import and export, and the
 * tutorial.
 */
export const INVENTORY_NEEDS_SERVER = {
  lists: "Sem conexão com o servidor. Renomear, juntar e excluir nomes só pode ser feito com ele.",
  import: "Sem conexão com o servidor. A importação só pode ser feita com ele.",
  export: "Sem conexão com o servidor. A exportação só pode ser feita com ele.",
  tutorial: "Sem conexão com o servidor. O tutorial do estoque só pode ser feito com ele.",
} as const;

/**
 * Says how many changes made on the phone wait to be sent.
 * @param count How many.
 * @returns E.g. "1 alteração esperando o servidor." or "3 alterações esperando o servidor."
 */
export function waitingNotice(count: number): string {
  return `${count} ${count === 1 ? "alteração" : "alterações"} esperando o servidor.`;
}

/**
 * Says how many conflicts with the computer wait to be settled.
 * @param count How many.
 * @returns E.g. "1 conflito com o computador para resolver."
 */
export function conflictsNotice(count: number): string {
  return `${count} ${count === 1 ? "conflito" : "conflitos"} com o computador para resolver.`;
}

/** What each kind of operation is, to say which the server refused. */
const REFUSED_WHAT: Record<QueuedOperation["type"], string> = {
  createItem: "o cadastro de",
  updateItem: "a alteração de",
  deleteItem: "a exclusão de",
  moveStock: "a mudança de estoque de",
  savePhotos: "as fotos de",
  addName: "o nome",
};

/**
 * Says the server refused an operation the phone made, and why.
 * @param operation The operation.
 * @param result What the server answered.
 * @returns E.g. "O servidor recusou o cadastro de “Filtro de óleo”: o código W 712 já é usado por “Filtro de ar”."
 */
export function refusedNotice(operation: QueuedOperation, result: Pick<SyncOperationResult, "statusCode" | "details">): string {
  const [detail] = result.details ?? [];
  const reason =
    result.statusCode === 404
      ? "o item não existe mais no servidor"
      : result.statusCode === 409 && typeof detail?.itemName === "string"
        ? `o código ${String(detail.code)} já é usado por “${detail.itemName}”`
        : "ele não aceitou a mudança";
  return `O servidor recusou ${REFUSED_WHAT[operation.type]} “${operation.label}”: ${reason}.`;
}

/**
 * Says an operation the phone made conflicts with what changed on the computer, and where it is settled.
 * @param operation The operation.
 * @returns E.g. "A alteração de “Filtro de óleo” conflita com o que mudou no computador. Escolha o que manter no Estoque."
 */
export function conflictNotice(operation: QueuedOperation): string {
  const what = REFUSED_WHAT[operation.type];
  return `${what.charAt(0).toUpperCase()}${what.slice(1)} “${operation.label}” conflita com o que mudou no computador. Escolha o que manter no Estoque.`;
}
