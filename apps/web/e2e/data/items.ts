import type { Item } from "@apc/domain/items";
import { testItem, type FlatItem } from "@apc/domain/test-items";

/**
 * Fills in an item with the fields a test doesn't look at: testItem's, a new random id and a price of R$ 1,00.
 * @param fields The fields that matter for the test, its code and name at least.
 * @returns A complete item.
 */
export function item(fields: FlatItem & Required<Pick<FlatItem, "code" | "name">>): Item {
  return testItem({ id: crypto.randomUUID(), unitPriceCents: 100, ...fields });
}

// The API answers GET /items with these items, newest first, so the list is the same on every run without a database.
export const ITEMS: Item[] = [
  item({ code: "W 712/95", name: "Filtro de óleo", category: "Motor", partBrand: "Mann", vehicleBrand: "Volkswagen", vehicleModel: "Gol", quantity: 8, minQuantity: 2, unitPriceCents: 3990, location: "A-2" }),
  item({ code: "BP-1020", name: "Pastilha de freio", category: "Freios", partBrand: "Cobreq", vehicleBrand: "Chevrolet", vehicleModel: null, position: "D", quantity: 2, minQuantity: 3, unitPriceCents: 123456, location: "B-10" }),
  item({ code: "BA-77", name: "Bomba d'água", category: "Arrefecimento", partBrand: "Urba", vehicleBrand: "Fiat", vehicleModel: "Uno", quantity: 0, minQuantity: 1, unitPriceCents: 13240, location: "C-1" }),
  item({ code: "AM-501", name: "Amortecedor", category: "Suspensão", partBrand: "Cofap", vehicleBrand: "Ford", vehicleModel: "Escort", position: "T", side: "LE", color: "Preto", quantity: 4, minQuantity: 1, unitPriceCents: 24900, location: "A-10" }),
];
