import { TEST_CATALOG } from "../catalog/testCatalog.ts";
import { distinct } from "./itemForm.ts";
import { optionKey, type Item } from "./items.ts";
import type { ItemLists } from "./lists.ts";

// The lists that hold what some items use, for the tests of web, mobile and the E2E stand-ins, which answer the
// lists from the items they serve. Not for the app itself, whose lists come from the API. A vehicle brand or model of
// the test catalog is marked inCatalog, as the API marks the ones its catalog has.

/**
 * Builds the four lists out of the values some items use, each name once, numbered in UUID form.
 * @param items Inventory items.
 * @returns The categories, part brands, vehicle brands and vehicle models of the items, sorted by name.
 */
export function itemListsOf(items: readonly Item[]): ItemLists {
  let count = 0;
  const entries = (names: string[]) =>
    distinct(names).map((name) => ({ id: `00000000-0000-4000-8000-${String(++count).padStart(12, "0")}`, name }));
  const vehicles = items.flatMap((item) => item.vehicles);
  const vehicleBrands = entries(vehicles.map((vehicle) => vehicle.vehicleBrand));
  /** The test catalog's brand of a name, if it has one. */
  const catalogBrand = (name: string) => TEST_CATALOG.brands.find((brand) => optionKey(brand.name) === optionKey(name));
  return {
    categories: entries(items.map((item) => item.category)),
    partBrands: entries(items.flatMap((item) => item.brands.map((brand) => brand.partBrand))),
    vehicleBrands: vehicleBrands.map((brand) => (catalogBrand(brand.name) ? { ...brand, inCatalog: true } : brand)),
    vehicleModels: vehicleBrands.flatMap((brand) =>
      entries(
        vehicles.flatMap((vehicle) =>
          vehicle.vehicleModel && optionKey(vehicle.vehicleBrand) === optionKey(brand.name) ? [vehicle.vehicleModel] : [],
        ),
      ).map((model) => {
        const inCatalog = catalogBrand(brand.name)?.models.some((each) => optionKey(each.label) === optionKey(model.name));
        return { ...model, vehicleBrandId: brand.id, ...(inCatalog && { inCatalog: true }) };
      }),
    ),
  };
}
