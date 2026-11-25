import type { CatalogData } from "../catalog/catalog.ts";
import type { Item } from "../inventory/items.ts";
import type { ItemLists, ListEntry, VehicleModel } from "../inventory/lists.ts";
import type { SYNC_ROWS, SyncChanges, SyncKind } from "./sync.ts";
import type { z } from "zod";
import { catalog, type Locale } from "../platform/locale/locale.ts";

// A copy of the server's inventory, as a phone keeps it to work away from the server: every row the change feed sent
// (see sync.ts), by kind and id, the cursor to ask for the changes after, and when it last caught up with the server.
// A page of the feed is applied row by row, a change with no row deleting it, and the copy turns into the items and
// lists the Inventory shows, with the same shape the API answers them in: an item with its category's name, its
// vehicles' brand, model, generation (its years and its number in its model, as the Catalog orders them) and version,
// and its brands with their part brand's name and their photos, in order. A row whose references haven't arrived is
// left out, as is an item with no brand or no vehicle yet, which only a copy caught halfway can hold. The copy also
// turns into the catalog, as GET /catalog answers it, for the Catalog tab.

/** What the Inventory and the Catalog say while they show the copy: from which day and time. */
export const COPY_MESSAGES = catalog(
  { offline: (day: string, month: string, time: string) => `Sem conexão com o servidor. Mostrando a cópia de ${day}/${month} às ${time}.` },
  { offline: (day, month, time) => `No connection to the server. Showing the copy from ${month}/${day} at ${time}.` },
);

/** A row of a kind, as the feed sends it. */
export type SyncRow<Kind extends SyncKind> = z.infer<(typeof SYNC_ROWS)[Kind]>;
/** Every row of the copy, by kind and id. */
export type SyncRows = { [Kind in SyncKind]: Record<string, SyncRow<Kind>> };
/** A copy of the server's inventory. */
export type SyncCopy = {
  /** The cursor to ask for the changes after, or null before the first page. */
  cursor: string | null;
  /** When the copy last caught up with the server, ISO, or null before it first did. */
  syncedAt: string | null;
  rows: SyncRows;
};

/** The kinds of rows the copy holds, each an empty table to start. */
const KINDS: readonly SyncKind[] = [
  "category",
  "partBrand",
  "vehicleBrand",
  "vehicleModel",
  "catalogBrand",
  "catalogModel",
  "catalogGeneration",
  "catalogVersion",
  "catalogYear",
  "catalogEngine",
  "item",
  "itemBrand",
  "itemPhoto",
];

/**
 * Says the Inventory shows the copy, as it does while the server can't be reached, and from when.
 * @param syncedAt When the copy last caught up with the server.
 * @param locale The language.
 * @returns E.g. "Sem conexão com o servidor. Mostrando a cópia de 23/11 às 14:05.", in the phone's own time.
 */
export function copyNotice(syncedAt: Date, locale: Locale): string {
  const two = (value: number) => String(value).padStart(2, "0");
  return COPY_MESSAGES[locale].offline(two(syncedAt.getDate()), two(syncedAt.getMonth() + 1), `${two(syncedAt.getHours())}:${two(syncedAt.getMinutes())}`);
}

/**
 * Makes an empty copy, before the first page.
 * @returns The copy.
 */
export function emptyCopy(): SyncCopy {
  return { cursor: null, syncedAt: null, rows: Object.fromEntries(KINDS.map((kind) => [kind, {}])) as SyncRows };
}

/**
 * Applies a page of the feed to a copy, in place: each row as it is now, each change with no row deleting it, and the
 * page's cursor to ask from next.
 * @param copy The copy.
 * @param page The page.
 * @returns The same copy.
 */
export function applyChanges(copy: SyncCopy, page: SyncChanges): SyncCopy {
  for (const change of page.changes) {
    const table = copy.rows[change.kind] as Record<string, unknown>;
    if (change.row) {
      table[change.id] = change.row;
    } else {
      delete table[change.id];
    }
  }
  copy.cursor = page.cursor;
  return copy;
}

/**
 * Sorts rows by their place, then their id, as the API orders siblings.
 * @param rows The rows.
 * @returns The rows, sorted.
 */
function byPosition<Row extends { id: string; position: number }>(rows: Row[]): Row[] {
  return rows.sort((a, b) => a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Groups rows by one of their columns.
 * @param rows The rows.
 * @param key The column, e.g. "itemId".
 * @returns The rows of each value, in their place's order.
 */
function groupBy<Row extends { id: string; position: number }>(rows: Row[], key: (row: Row) => string): Map<string, Row[]> {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    groups.set(key(row), [...(groups.get(key(row)) ?? []), row]);
  }
  for (const group of groups.values()) {
    byPosition(group);
  }
  return groups;
}

/**
 * Turns the copy into the items the Inventory shows, in the shape the API answers them.
 * @param copy The copy.
 * @returns Every complete item, in no particular order.
 */
export function copyItems(copy: SyncCopy): Item[] {
  const { rows } = copy;
  const photos = groupBy(Object.values(rows.itemPhoto), (photo) => photo.brandId);
  const brands = groupBy(Object.values(rows.itemBrand), (brand) => brand.itemId);
  const generations = groupBy(Object.values(rows.catalogGeneration), (generation) => generation.modelId);
  return Object.values(rows.item).flatMap((item): Item[] => {
    const category = rows.category[item.categoryId];
    const vehicles = item.vehicles.map((vehicle) => {
      const generation = vehicle.generationId ? rows.catalogGeneration[vehicle.generationId] : undefined;
      return {
        brand: rows.vehicleBrand[vehicle.vehicleBrandId],
        model: vehicle.vehicleModelId ? rows.vehicleModel[vehicle.vehicleModelId] : undefined,
        generation,
        number: generation ? (generations.get(generation.modelId) ?? []).indexOf(generation) + 1 : null,
        version: vehicle.versionId ? rows.catalogVersion[vehicle.versionId] : undefined,
      };
    });
    const made = (brands.get(item.id) ?? []).map((brand) => ({ brand, partBrand: rows.partBrand[brand.partBrandId] }));
    if (!category || vehicles.length === 0 || vehicles.some((vehicle) => !vehicle.brand) || made.length === 0 || made.some((each) => !each.partBrand)) {
      return [];
    }
    return [
      {
        id: item.id,
        name: item.name,
        category: category.name,
        vehicles: vehicles.map(({ brand, model, generation, number, version }) => ({
          vehicleBrand: brand.name,
          vehicleModel: model?.name ?? null,
          firstYear: generation?.firstYear ?? null,
          lastYear: generation?.lastYear ?? null,
          generationNumber: number,
          version: version?.name ?? null,
        })),
        position: item.position,
        side: item.side,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        originalCodes: item.originalCodes,
        material: item.material,
        description: item.description,
        brands: made.map(({ brand, partBrand }) => ({
          id: brand.id,
          partBrand: partBrand.name,
          code: brand.code,
          color: brand.color,
          location: brand.location,
          quantity: brand.quantity,
          unitPriceCents: brand.unitPriceCents,
          photos: (photos.get(brand.id) ?? []).map((photo) => ({ id: photo.id, url: photo.url, thumbUrl: photo.thumbUrl })),
        })),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    ];
  });
}

/**
 * Turns the copy into the catalog, as GET /catalog answers it: the catalog brands in the rail's order, each with its
 * vehicle brand's id and name and its letters, and their models, by their vehicle models' names, with their trees,
 * each level in its order. A brand or model whose vehicle brand or model hasn't arrived is left out.
 * @param copy The copy.
 * @returns The catalog.
 */
export function copyCatalog(copy: SyncCopy): CatalogData {
  const { rows } = copy;
  const engines = groupBy(Object.values(rows.catalogEngine), (engine) => engine.yearId);
  const years = groupBy(Object.values(rows.catalogYear), (year) => year.versionId);
  const versions = groupBy(Object.values(rows.catalogVersion), (version) => version.generationId);
  const generations = groupBy(Object.values(rows.catalogGeneration), (generation) => generation.modelId);
  const models = byPosition(Object.values(rows.catalogModel));
  return {
    brands: byPosition(Object.values(rows.catalogBrand)).flatMap((catalogBrand) => {
      const brand = rows.vehicleBrand[catalogBrand.brandId];
      if (!brand) {
        return [];
      }
      return [
        {
          id: brand.id,
          name: brand.name,
          mark: catalogBrand.mark,
          models: models.flatMap((model) => {
            const vehicleModel = rows.vehicleModel[model.vehicleModelId];
            if (vehicleModel?.brandId !== brand.id) {
              return [];
            }
            return [
              {
                id: model.id,
                name: vehicleModel.name,
                generations: (generations.get(model.id) ?? []).map(({ id, name, firstYear, lastYear }) => ({
                  id,
                  name,
                  firstYear,
                  lastYear,
                  versions: (versions.get(id) ?? []).map((version) => ({
                    id: version.id,
                    name: version.name,
                    years: (years.get(version.id) ?? []).map((year) => ({
                      id: year.id,
                      year: year.year,
                      lastYear: year.lastYear,
                      engines: (engines.get(year.id) ?? []).map(({ id: engineId, displacementDl, cylinders, drive, summary }) => ({
                        id: engineId,
                        displacementDl,
                        cylinders,
                        drive,
                        summary,
                      })),
                    })),
                  })),
                })),
              },
            ];
          }),
        },
      ];
    }),
  };
}

/**
 * Turns the copy into the lists the item form and the filters pick from, as the API answers them: each sorted by name,
 * the vehicle brands and models the Catalog has marked so.
 * @param copy The copy.
 * @returns The four lists.
 */
export function copyLists(copy: SyncCopy): ItemLists {
  const { rows } = copy;
  const inCatalogBrands = new Set(Object.values(rows.catalogBrand).map((brand) => brand.brandId));
  const inCatalogModels = new Set(Object.values(rows.catalogModel).map((model) => model.vehicleModelId));
  /** Sorts entries by name, as the list routes send them. */
  const byName = <Entry extends ListEntry>(entries: Entry[]) => entries.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const entries = (table: Record<string, { id: string; name: string }>) => byName(Object.values(table).map(({ id, name }) => ({ id, name })));
  return {
    categories: entries(rows.category),
    partBrands: entries(rows.partBrand),
    vehicleBrands: byName(
      Object.values(rows.vehicleBrand).map(({ id, name }) => ({ id, name, ...(inCatalogBrands.has(id) && { inCatalog: true }) })),
    ),
    vehicleModels: byName(
      Object.values(rows.vehicleModel).map(
        ({ id, name, brandId }): VehicleModel => ({ id, name, vehicleBrandId: brandId, ...(inCatalogModels.has(id) && { inCatalog: true }) }),
      ),
    ),
  };
}
