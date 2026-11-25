import {
  capitalizeFirst,
  colorText,
  formatPrice,
  generationLabel,
  NOT_APPLICABLE,
  optionKey,
  POSITION_NAMES,
  SIDE_NAMES,
  vehicleKey,
  type POSITIONS,
  type SIDES,
  vehicleLabel,
  type Item,
  type ItemBrand,
  type ItemBrandCreate,
  type ItemCreate,
  type ItemUpdate,
  type ItemVehicleCreate,
} from "../inventory/items.ts";
import { catalog, type Locale } from "../platform/locale/locale.ts";
import type { QueuedItemOperation, QueuedOperation } from "./queue.ts";
import {
  SYNC_BRAND_FIELDS,
  SYNC_ITEM_FIELDS,
  type ItemSeen,
  type SyncBrandField,
  type SyncConflict,
  type SyncItemField,
} from "./sync.ts";

// The changes made on both sides to the same item, the computer's and a phone's made away from it (see sync.ts). The
// phone sends, with an edit, what it saw of each field it changes (editOf), and with a delete, what it saw of the whole
// item (seenOf). The server compares each field as it is now with what the phone saw (mergeEdit, deleteConflicts),
// field by field, written as the server saves it, so "farol" and "Farol" are the same name: a field the phone left
// alone keeps the server's value; one the phone changed takes its value, unless the server changed it too, to another
// value, which is a conflict. Vehicles and original codes are each one field, as they are replaced whole; brands are
// compared brand by brand, field by field, a brand the server added since kept; quantities move and never conflict. An
// edit or a move on an item the server deleted conflicts, as does a delete of an item the server changed. The phone
// keeps an operation in conflict in its queue, with the item as it showed it (its snapshot), lists each conflict
// (conflictCards), and settles each by keeping the computer's value or its own (settleConflict); once settled, it goes
// out again.


/** What a conflict's card says: the fields' names, the values, what happened on each side and the choices. */
export const CONFLICT_MESSAGES = catalog(
  {
    brandFields: { partBrand: "Marca", code: "Código", color: "Cor", location: "Localização", unitPriceCents: "Preço" } satisfies Record<
      SyncBrandField,
      string
    >,
    itemFields: {
      name: "Nome",
      category: "Categoria",
      vehicles: "Veículos",
      position: "Posição",
      side: "Lado",
      minQuantity: "Estoque mínimo",
      originalCodes: "Códigos originais",
      material: "Material",
      description: "Descrição",
    } satisfies Record<SyncItemField, string>,
    empty: "Vazio",
    none: "Nenhum",
    itemDeleted: "Foi excluído no computador e alterado no celular. Recriado, ele volta sem as fotos.",
    keepDeleted: "Manter excluído",
    recreate: "Recriar o item",
    itemChanged: "Foi alterado no computador e excluído no celular.",
    keepItem: "Manter o item",
    delete: "Excluir",
    keepTheirs: "Manter do computador",
    keepMine: "Manter do celular",
    brandDeleted: "A marca foi removida no computador e alterada no celular.",
    keepRemoved: "Manter removida",
    addBack: "Adicionar de volta",
    brandChanged: "A marca foi alterada no computador e removida no celular.",
    keepBrand: "Manter a marca",
    remove: "Remover",
  },
  {
    brandFields: { partBrand: "Brand", code: "Code", color: "Color", location: "Location", unitPriceCents: "Price" },
    itemFields: {
      name: "Name",
      category: "Category",
      vehicles: "Vehicles",
      position: "Position",
      side: "Side",
      minQuantity: "Minimum stock",
      originalCodes: "Original codes",
      material: "Material",
      description: "Description",
    },
    empty: "Empty",
    none: "None",
    itemDeleted: "It was deleted on the computer and changed on the phone. Recreated, it comes back without its photos.",
    keepDeleted: "Keep it deleted",
    recreate: "Recreate the item",
    itemChanged: "It was changed on the computer and deleted on the phone.",
    keepItem: "Keep the item",
    delete: "Delete",
    keepTheirs: "Keep the computer's",
    keepMine: "Keep the phone's",
    brandDeleted: "The brand was removed on the computer and changed on the phone.",
    keepRemoved: "Keep it removed",
    addBack: "Add it back",
    brandChanged: "The brand was changed on the computer and removed on the phone.",
    keepBrand: "Keep the brand",
    remove: "Remove",
  },
);
/** What an edit sends for an optional field the form left empty, which clears it or sets it back to its default. */
const EMPTY_VALUES: Partial<Record<SyncItemField, unknown>> = {
  position: NOT_APPLICABLE,
  side: NOT_APPLICABLE,
  minQuantity: 0,
  originalCodes: [],
  material: "",
  description: "",
};

/** An item's values the conflicts look at, as the item routes send them. */
export type ItemValues = Pick<Item, SyncItemField> & { brands: readonly Pick<ItemBrand, "id" | SyncBrandField>[] };
/** Which side of a conflict to keep: the computer's, or the phone's. */
export type ConflictSide = "theirs" | "mine";
/** A conflict as the phone lists it, with what each choice keeps. */
export type ConflictCard = {
  /** Tells the cards apart. */
  key: string;
  /** The operation in conflict, in the queue. */
  operationId: string;
  /** The conflict among the operation's. */
  index: number;
  /** The item, and the field or the brand in conflict, e.g. "“Farol” · Nome". */
  title: string;
  /** What happened on each side, for a conflict over the whole item or a brand. */
  text?: string;
  /** The computer's value and the phone's, for a field. */
  theirs?: string;
  mine?: string;
  /** The buttons' labels. */
  keepTheirs: string;
  keepMine: string;
};

/**
 * Writes an optional text as the server saves it.
 * @param value The text, sent or saved.
 * @returns It with a capital first letter, or "" when empty.
 */
function textKey(value: unknown): string {
  return typeof value === "string" && value.trim() ? capitalizeFirst(value) : "";
}

/**
 * Writes an item field's value as the server saves it, so a value sent and a value saved compare.
 * @param field The field.
 * @param value Its value, as an edit sends it or the item routes send it.
 * @returns What compares.
 */
function itemKey(field: SyncItemField, value: unknown): string {
  switch (field) {
    case "category":
      return optionKey(String(value ?? ""));
    case "vehicles":
      return ((value ?? []) as ItemVehicleCreate[]).map(vehicleKey).join("\n");
    case "originalCodes":
      return ((value ?? []) as string[]).map((code) => code.trim().toUpperCase()).join("\n");
    case "position":
    case "side":
      return String(value ?? NOT_APPLICABLE);
    case "minQuantity":
      return String(value ?? 0);
    default:
      return textKey(value);
  }
}

/**
 * Writes a brand field's value as the server saves it.
 * @param field The field.
 * @param value Its value, sent or saved.
 * @returns What compares.
 */
function brandKey(field: SyncBrandField, value: unknown): string {
  switch (field) {
    case "partBrand":
      return optionKey(String(value ?? ""));
    case "code":
      return String(value ?? "")
        .trim()
        .toUpperCase();
    case "color":
      return typeof value === "string" && value.trim() ? colorText(value.trim()) : NOT_APPLICABLE;
    case "unitPriceCents":
      return String(value);
    default:
      return textKey(value);
  }
}

/**
 * Tells whether a brand the server holds differs from what the phone saw of it.
 * @param now The brand on the server.
 * @param saw What the phone saw of it.
 * @returns True when a field the phone saw changed.
 */
function brandChanged(now: Pick<ItemBrand, SyncBrandField>, saw: Partial<Pick<ItemBrand, SyncBrandField>>): boolean {
  return SYNC_BRAND_FIELDS.some((field) => saw[field] !== undefined && brandKey(field, now[field]) !== brandKey(field, saw[field]));
}

/**
 * Writes a brand as an edit sends it, without its quantity, which it keeps.
 * @param brand The brand, as the item routes send it.
 * @returns The brand as sent.
 */
function brandBody(brand: Pick<ItemBrand, "id" | SyncBrandField>): ItemBrandCreate {
  const { id, partBrand, code, color, location, unitPriceCents } = brand;
  return { id, partBrand, code, color, location: location ?? "", unitPriceCents };
}

/**
 * Merges a phone's edit with the item as the server holds it, field by field: a field the phone left as it saw it keeps
 * the server's value, one it changed takes its value, unless the server changed it too, to another value; a brand the
 * phone saw and changed, that the server deleted, conflicts unless the phone left it alone, and one it removed, that
 * the server changed, conflicts too; a brand the server added since is kept. An edit without what the phone saw is
 * taken as it is.
 * @param current The item as the server holds it.
 * @param changes The edit as sent.
 * @param seen What the phone saw of the fields it changes.
 * @returns The conflicts, and the edit to apply when there are none.
 */
export function mergeEdit(current: ItemValues, changes: ItemUpdate, seen: ItemSeen | undefined): { conflicts: SyncConflict[]; changes: ItemUpdate } {
  if (!seen) {
    return { conflicts: [], changes };
  }
  const conflicts: SyncConflict[] = [];
  const merged: Record<string, unknown> = {};
  for (const field of SYNC_ITEM_FIELDS) {
    const sent = changes[field];
    if (sent === undefined) {
      continue;
    }
    if (seen[field] === undefined) {
      merged[field] = sent;
      continue;
    }
    const [mine, saw, now] = [itemKey(field, sent), itemKey(field, seen[field]), itemKey(field, current[field])];
    if (mine === saw) {
      continue;
    }
    if (now === saw || now === mine) {
      merged[field] = sent;
    } else {
      conflicts.push({ kind: "field", field, theirs: current[field] });
    }
  }
  if (changes.brands) {
    merged.brands = seen.brands ? mergeBrands(current, changes.brands, seen.brands, conflicts) : changes.brands;
  }
  return { conflicts, changes: merged as ItemUpdate };
}

/**
 * Merges an edit's brands with the item's on the server, adding their conflicts.
 * @param current The item as the server holds it.
 * @param sent The edit's brands, the whole new set.
 * @param seen What the phone saw of each brand.
 * @param conflicts Where the conflicts go.
 * @returns The new set to apply.
 */
function mergeBrands(
  current: ItemValues,
  sent: readonly ItemBrandCreate[],
  seen: NonNullable<ItemSeen["brands"]>,
  conflicts: SyncConflict[],
): ItemBrandCreate[] {
  const held = new Map(current.brands.map((brand) => [brand.id, brand]));
  const sentIds = new Set(sent.flatMap((brand) => (brand.id ? [brand.id] : [])));
  const brands: ItemBrandCreate[] = [];
  // The brands the phone left alone that the server deleted, which stay deleted unless no brand would be left.
  const dropped: string[] = [];
  for (const brand of sent) {
    const saw = brand.id === undefined ? undefined : seen[brand.id];
    if (!saw || !brand.id) {
      brands.push(brand);
      continue;
    }
    const changed = SYNC_BRAND_FIELDS.filter((field) => saw[field] !== undefined && brandKey(field, brand[field]) !== brandKey(field, saw[field]));
    const now = held.get(brand.id);
    if (!now) {
      if (changed.length > 0) {
        conflicts.push({ kind: "brandDeleted", brandId: brand.id });
      } else {
        dropped.push(brand.id);
      }
      continue;
    }
    const kept: Record<string, unknown> = { ...brand };
    for (const field of SYNC_BRAND_FIELDS) {
      if (saw[field] === undefined) {
        continue;
      }
      if (!changed.includes(field)) {
        kept[field] = brandBody(now)[field];
      } else if (brandKey(field, now[field]) !== brandKey(field, saw[field]) && brandKey(field, now[field]) !== brandKey(field, brand[field])) {
        conflicts.push({ kind: "brandField", brandId: brand.id, field, theirs: now[field] });
      }
    }
    brands.push(kept as ItemBrandCreate);
  }
  for (const now of current.brands) {
    if (sentIds.has(now.id)) {
      continue;
    }
    const saw = seen[now.id];
    if (!saw) {
      brands.push(brandBody(now));
    } else if (brandChanged(now, saw)) {
      conflicts.push({ kind: "brandChanged", brandId: now.id });
    }
  }
  if (brands.length === 0 && conflicts.length === 0) {
    conflicts.push(...dropped.map((brandId) => ({ kind: "brandDeleted" as const, brandId })));
  }
  return brands;
}

/**
 * Tells whether a phone's delete conflicts with the item as the server holds it: changed since the phone saw it, in a
 * field or a brand, its quantities aside. A delete without what the phone saw is taken as it is.
 * @param current The item as the server holds it.
 * @param seen What the phone saw of it.
 * @returns The conflict, or none.
 */
export function deleteConflicts(current: ItemValues, seen: ItemSeen | undefined): SyncConflict[] {
  if (!seen) {
    return [];
  }
  const fields = SYNC_ITEM_FIELDS.some((field) => seen[field] !== undefined && itemKey(field, current[field]) !== itemKey(field, seen[field]));
  const brands = seen.brands;
  const held = new Set(current.brands.map((brand) => brand.id));
  const changedBrands =
    brands !== undefined &&
    (current.brands.some((brand) => !brands[brand.id] || brandChanged(brand, brands[brand.id])) || Object.keys(brands).some((id) => !held.has(id)));
  return fields || changedBrands ? [{ kind: "itemChanged" }] : [];
}

/**
 * Lists what the phone saw of an item's brands, every field of each.
 * @param item The item as the phone shows it.
 * @returns Each brand's fields, by id.
 */
function seenBrands(item: Item): NonNullable<ItemSeen["brands"]> {
  return Object.fromEntries(item.brands.map((brand) => [brand.id, Object.fromEntries(SYNC_BRAND_FIELDS.map((field) => [field, brand[field]]))]));
}

/**
 * Lists what the phone saw of a whole item, for a delete.
 * @param item The item as the phone shows it.
 * @returns Every field, and every brand's.
 */
export function seenOf(item: Item): ItemSeen {
  return { ...Object.fromEntries(SYNC_ITEM_FIELDS.map((field) => [field, item[field]])), brands: seenBrands(item) };
}

/**
 * Turns a saved form into an edit of the item as the phone shows it: only the fields it changes, with what the phone
 * saw of each, and the brands when the set changes (one added, removed, reordered or with a field changed), with what
 * the phone saw of each brand.
 * @param body The item as the form sends it, its kept brands without their quantity.
 * @param shown The item as the phone shows it.
 * @returns The edit, or null when it changes nothing but quantities.
 */
export function editOf(body: ItemCreate, shown: Item): { changes: ItemUpdate; seen: ItemSeen } | null {
  const changes: Record<string, unknown> = {};
  const seen: Record<string, unknown> = {};
  for (const field of SYNC_ITEM_FIELDS) {
    if (itemKey(field, body[field]) !== itemKey(field, shown[field])) {
      changes[field] = body[field] ?? EMPTY_VALUES[field];
      seen[field] = shown[field];
    }
  }
  const held = new Map(shown.brands.map((brand) => [brand.id, brand]));
  const brandsChanged =
    body.brands.length !== shown.brands.length ||
    body.brands.some((brand, index) => {
      const before = brand.id === undefined ? undefined : held.get(brand.id);
      return !before || shown.brands[index].id !== brand.id || SYNC_BRAND_FIELDS.some((field) => brandKey(field, brand[field]) !== brandKey(field, before[field]));
    });
  if (brandsChanged) {
    changes.brands = body.brands;
    seen.brands = seenBrands(shown);
  }
  return Object.keys(changes).length > 0 ? { changes: changes as ItemUpdate, seen: seen as ItemSeen } : null;
}

/**
 * Writes an item as the phone shows it as a new item, with its ids and quantities, as a delete settled keeping the
 * phone's side makes it again; its photos went with it on the server.
 * @param item The item.
 * @returns The item as POST /items takes it.
 */
function createBody(item: Item): ItemCreate {
  return {
    name: item.name,
    category: item.category,
    vehicles: item.vehicles.map((vehicle) => ({
      vehicleBrand: vehicle.vehicleBrand,
      vehicleModel: vehicle.vehicleModel ?? undefined,
      firstYear: vehicle.firstYear,
      lastYear: vehicle.lastYear,
      version: vehicle.version ?? undefined,
    })),
    position: item.position,
    side: item.side,
    minQuantity: item.minQuantity,
    originalCodes: item.originalCodes,
    material: item.material ?? undefined,
    description: item.description ?? undefined,
    brands: item.brands.map((brand) => ({ ...brandBody(brand), quantity: brand.quantity })),
  };
}

/**
 * Settles a conflict of an operation in the queue, keeping the computer's side or the phone's; once its last conflict
 * is settled, it goes out with the next sync. A field kept as the computer has it leaves the edit, and one kept as the
 * phone has it is sent without what the phone saw, so it applies. An item deleted on the computer stays deleted,
 * dropping every change to it waiting, or is made again as the phone shows it; a delete of an item changed there is
 * dropped, or sent without what the phone saw. A brand deleted there stays deleted or is added back, with the quantity
 * the phone shows; a brand removed on the phone and changed there is kept, or removed all the same.
 * @param queue The queue.
 * @param card The conflict, by its operation and its place among the operation's.
 * @param keep The side to keep.
 * @returns The queue with the conflict settled.
 */
export function settleConflict(queue: readonly QueuedOperation[], card: Pick<ConflictCard, "operationId" | "index">, keep: ConflictSide): QueuedOperation[] {
  const operation = queue.find((each) => each.id === card.operationId);
  const conflict = operation?.conflicts?.[card.index];
  if (!operation || !conflict || !("itemId" in operation)) {
    return [...queue];
  }
  if (conflict.kind === "itemDeleted") {
    const { itemId } = operation;
    const others = (each: QueuedOperation) => !("itemId" in each) || each.itemId !== itemId || each.sent;
    const remake: QueuedOperation[] =
      keep === "mine" && operation.snapshot
        ? [{ id: operation.id, type: "createItem", itemId, item: createBody(operation.snapshot), at: operation.at, label: operation.label }]
        : [];
    const first = queue.findIndex((each) => !others(each));
    return [...queue.slice(0, first).filter(others), ...remake, ...queue.slice(first).filter(others)];
  }
  if (conflict.kind === "itemChanged") {
    return keep === "theirs" ? queue.filter((each) => each !== operation) : queue.map((each) => (each === operation ? settled(withoutSeen(operation), card.index) : each));
  }
  if (operation.type !== "updateItem") {
    return [...queue];
  }
  const changes: Record<string, unknown> = { ...operation.changes };
  const seen: Record<string, unknown> = { ...operation.seen };
  const brands = (changes.brands as ItemBrandCreate[] | undefined)?.map((brand) => ({ ...brand }));
  const seenBrandsOf = { ...(operation.seen?.brands ?? {}) };
  if (conflict.kind === "field") {
    if (keep === "theirs") {
      delete changes[conflict.field];
    }
    delete seen[conflict.field];
  } else if (conflict.kind === "brandField") {
    const brand = brands?.find((each) => each.id === conflict.brandId);
    if (keep === "theirs" && brand) {
      Object.assign(brand, { [conflict.field]: conflict.theirs ?? "" });
    }
    const saw = { ...seenBrandsOf[conflict.brandId] };
    delete saw[conflict.field];
    seenBrandsOf[conflict.brandId] = saw;
  } else if (conflict.kind === "brandDeleted") {
    delete seenBrandsOf[conflict.brandId];
    const index = brands?.findIndex((each) => each.id === conflict.brandId) ?? -1;
    if (keep === "theirs" && brands && index >= 0) {
      brands.splice(index, 1);
    } else if (brands && index >= 0) {
      brands[index].quantity = operation.snapshot?.brands.find((each) => each.id === conflict.brandId)?.quantity ?? 0;
    }
  } else if (conflict.kind === "brandChanged") {
    if (keep === "theirs") {
      delete seenBrandsOf[conflict.brandId];
    } else {
      seenBrandsOf[conflict.brandId] = {};
    }
  }
  if (brands && brands.length > 0) {
    changes.brands = brands;
    seen.brands = seenBrandsOf;
  } else {
    delete changes.brands;
    delete seen.brands;
  }
  const edit: QueuedItemOperation = { ...operation, changes: changes as ItemUpdate, seen: seen as ItemSeen };
  return queue.map((each) => (each === operation ? settled(edit, card.index) : each));
}

/**
 * Drops what the phone saw from a delete, so it applies.
 * @param operation The delete.
 * @returns It without what the phone saw.
 */
function withoutSeen(operation: QueuedOperation): QueuedOperation {
  const next: Partial<QueuedItemOperation> = { ...(operation as QueuedItemOperation) };
  delete (next as { seen?: ItemSeen }).seen;
  return next as QueuedOperation;
}

/**
 * Takes a settled conflict off an operation; the last one taken, the operation goes out again.
 * @param operation The operation.
 * @param index The conflict settled.
 * @returns The operation with its conflicts left.
 */
function settled(operation: QueuedOperation, index: number): QueuedOperation {
  const conflicts = (operation.conflicts ?? []).filter((_, each) => each !== index);
  const next: QueuedOperation = { ...operation, conflicts };
  if (conflicts.length === 0) {
    delete next.conflicts;
    delete next.snapshot;
  }
  return next;
}

/**
 * Writes an item field's value for a conflict's card.
 * @param field The field.
 * @param value The value, sent or saved.
 * @param locale The language.
 * @returns E.g. "Volkswagen Gol 85/90, Fiat Uno", "Dianteiro", or "Vazio".
 */
function itemText(field: SyncItemField, value: unknown, locale: Locale): string {
  const messages = CONFLICT_MESSAGES[locale];
  switch (field) {
    case "vehicles": {
      const vehicles = (value ?? []) as ItemVehicleCreate[];
      return vehicles
        .map((vehicle) =>
          [
            vehicleLabel({ vehicleBrand: vehicle.vehicleBrand, vehicleModel: vehicle.vehicleModel ?? null }),
            generationLabel({ firstYear: vehicle.firstYear ?? null, lastYear: vehicle.lastYear ?? null }),
            vehicle.version ?? "",
          ]
            .filter(Boolean)
            .join(" "),
        )
        .join(", ");
    }
    case "originalCodes": {
      const codes = (value ?? []) as string[];
      return codes.length > 0 ? codes.join(", ") : messages.none;
    }
    case "position":
      return POSITION_NAMES[locale][(value ?? NOT_APPLICABLE) as (typeof POSITIONS)[number]];
    case "side":
      return SIDE_NAMES[locale][(value ?? NOT_APPLICABLE) as (typeof SIDES)[number]];
    case "minQuantity":
      return String(value ?? 0);
    default:
      return textKey(value) || messages.empty;
  }
}

/**
 * Writes a brand field's value for a conflict's card.
 * @param field The field.
 * @param value The value, sent or saved.
 * @param locale The language.
 * @returns E.g. "R$ 89,90", "PRETO", or "Vazio".
 */
function brandText(field: SyncBrandField, value: unknown, locale: Locale): string {
  if (field === "unitPriceCents") {
    return formatPrice(Number(value), locale);
  }
  return field === "color" ? brandKey(field, value) : textKey(value) || CONFLICT_MESSAGES[locale].empty;
}

/**
 * Lists the conflicts of the queue as the phone shows them, in its order: an item deleted on the computer once, for
 * every change to it waiting.
 * @param queue The queue.
 * @param locale The language of the cards.
 * @returns A card per conflict.
 */
export function conflictCards(queue: readonly QueuedOperation[], locale: Locale): ConflictCard[] {
  const messages = CONFLICT_MESSAGES[locale];
  const deleted = new Set<string>();
  return queue.flatMap((operation) =>
    (operation.conflicts ?? []).flatMap((conflict, index): ConflictCard[] => {
      const item = `“${operation.label}”`;
      const base = { key: `${operation.id}:${index}`, operationId: operation.id, index };
      const changes = operation.type === "updateItem" ? operation.changes : {};
      const seen = "seen" in operation ? operation.seen : undefined;
      const brandOf = (brandId: string) => {
        const saw = seen?.brands?.[brandId] ?? operation.snapshot?.brands.find((each) => each.id === brandId);
        return saw?.partBrand && saw.code ? `${saw.partBrand} (${saw.code})` : (saw?.code ?? "");
      };
      switch (conflict.kind) {
        case "itemDeleted": {
          if (!("itemId" in operation) || deleted.has(operation.itemId)) {
            return [];
          }
          deleted.add(operation.itemId);
          return [
            {
              ...base,
              title: item,
              text: messages.itemDeleted,
              keepTheirs: messages.keepDeleted,
              keepMine: messages.recreate,
            },
          ];
        }
        case "itemChanged":
          return [{ ...base, title: item, text: messages.itemChanged, keepTheirs: messages.keepItem, keepMine: messages.delete }];
        case "field":
          return [
            {
              ...base,
              title: `${item} · ${messages.itemFields[conflict.field]}`,
              theirs: itemText(conflict.field, conflict.theirs, locale),
              mine: itemText(conflict.field, changes[conflict.field], locale),
              keepTheirs: messages.keepTheirs,
              keepMine: messages.keepMine,
            },
          ];
        case "brandField": {
          const brand = changes.brands?.find((each) => each.id === conflict.brandId);
          return [
            {
              ...base,
              title: `${item} · ${brandOf(conflict.brandId)} · ${messages.brandFields[conflict.field]}`,
              theirs: brandText(conflict.field, conflict.theirs, locale),
              mine: brandText(conflict.field, brand?.[conflict.field], locale),
              keepTheirs: messages.keepTheirs,
              keepMine: messages.keepMine,
            },
          ];
        }
        case "brandDeleted":
          return [
            {
              ...base,
              title: `${item} · ${brandOf(conflict.brandId)}`,
              text: messages.brandDeleted,
              keepTheirs: messages.keepRemoved,
              keepMine: messages.addBack,
            },
          ];
        case "brandChanged":
          return [
            {
              ...base,
              title: `${item} · ${brandOf(conflict.brandId)}`,
              text: messages.brandChanged,
              keepTheirs: messages.keepBrand,
              keepMine: messages.remove,
            },
          ];
      }
    }),
  );
}
