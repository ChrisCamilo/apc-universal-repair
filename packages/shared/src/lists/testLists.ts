import { distinct } from "../items/itemForm.ts";
import { optionKey, type Item } from "../items/items.ts";
import type { ItemLists } from "./lists.ts";

// The lists that hold what some items use, for the tests of web, mobile and the E2E stand-ins, which answer the
// lists from the items they serve. Not for the app itself, whose lists come from the API.

/**
 * Builds the four lists out of the values some items use, each name once, numbered in UUID form.
 * @param items Inventory items.
 * @returns The categories, part brands, vehicle brands and vehicle models of the items, sorted by name.
 */
export function itemListsOf(items: readonly Item[]): ItemLists {
  let count = 0;
  const entries = (names: string[]) =>
    distinct(names).map((name) => ({ id: `00000000-0000-4000-8000-${String(++count).padStart(12, "0")}`, name }));
  const vehicleBrands = entries(items.map((item) => item.vehicleBrand));
  return {
    categories: entries(items.map((item) => item.category)),
    partBrands: entries(items.map((item) => item.partBrand)),
    vehicleBrands,
    vehicleModels: vehicleBrands.flatMap((brand) =>
      entries(
        items.flatMap((item) => (item.vehicleModel && optionKey(item.vehicleBrand) === optionKey(brand.name) ? [item.vehicleModel] : [])),
      ).map((model) => ({ ...model, vehicleBrandId: brand.id })),
    ),
  };
}
