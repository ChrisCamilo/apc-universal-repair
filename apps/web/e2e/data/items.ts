import type { Item } from "@apc/shared/items";
import { testItem, type FlatItem } from "@apc/shared/test-items";

/**
 * Fills in an item with the fields a test doesn't look at: testItem's, a new random id and a price of R$ 1,00.
 * @param fields The fields that matter for the test, its code and name at least.
 * @returns A complete item.
 */
export function item(fields: FlatItem & Required<Pick<FlatItem, "code" | "name">>): Item {
  return testItem({ id: crypto.randomUUID(), unitPriceCents: 100, ...fields });
}
