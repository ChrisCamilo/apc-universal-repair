import { NOT_APPLICABLE, type Item, type ItemBrand } from "./items.ts";

// Items for the tests of web, mobile, the API and the E2E stand-ins, written flat: an item's own fields and those of
// its one brand side by side, as items were before they had brands, or its brands given whole. Not for the app itself.

/** An item's fields and its one brand's, flat; brandId names that brand, and brands, when given, replaces it. */
export type FlatItem = Partial<Omit<Item, "brands">> & Partial<Omit<ItemBrand, "id">> & { brandId?: string; brands?: ItemBrand[] };

/** How many ids testItem has made, for the next one. */
let idCount = 0;

/**
 * Makes a new id for a test item, valid as a UUID, without the platform's crypto (which mobile's types lack).
 * @returns E.g. "00000000-0000-4000-a000-000000000001", apart from the ids tests write.
 */
function nextId(): string {
  idCount += 1;
  return `00000000-0000-4000-a000-${String(idCount).padStart(12, "0")}`;
}

/**
 * Builds an item for a test from flat fields, filling in what the test doesn't look at. Its one brand takes the
 * item's id, as an item from before brands has after the migration, unless brandId names another; its quantity is
 * the brands' sum unless given.
 * @param fields The fields that matter for the test.
 * @returns A complete item.
 */
export function testItem(fields: FlatItem = {}): Item {
  const { brandId, brands, partBrand, code, color, location, unitPriceCents, photos, ...own } = fields;
  const id = own.id ?? nextId();
  const made: ItemBrand[] = brands ?? [
    {
      id: brandId ?? id,
      partBrand: partBrand ?? "Bosch",
      code: code ?? "X-1",
      color: color ?? NOT_APPLICABLE,
      location: location ?? null,
      quantity: own.quantity ?? 1,
      unitPriceCents: unitPriceCents ?? 3990,
      photos: photos ?? [],
    },
  ];
  return {
    name: "Item",
    category: "Motor",
    vehicleBrand: "Volkswagen",
    vehicleModel: null,
    position: NOT_APPLICABLE,
    side: NOT_APPLICABLE,
    minQuantity: 0,
    createdAt: "2026-10-03T12:00:00.000Z",
    updatedAt: "2026-10-03T12:00:00.000Z",
    ...own,
    id,
    quantity: own.quantity ?? made.reduce((sum, brand) => sum + brand.quantity, 0),
    brands: made,
  };
}
