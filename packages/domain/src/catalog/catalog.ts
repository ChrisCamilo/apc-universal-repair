import { z } from "zod";
import { apiFetch } from "../auth/apiFetch.ts";
import { codeKey, searchKey, UNIVERSAL_BRAND, type Item, type ItemVehicle } from "../inventory/items.ts";

// The vehicle catalog of the Catalog tab, kept by the API (GET /catalog): the catalog brands, each a vehicle brand of
// the Inventory's lists, in the rail's order, and under each its models, each a vehicle model of those lists, then
// generation (with its years), version, year and engine, in their order. An engine carries its sheet: displacement,
// cylinders, drive and summary. What is typed once: an engine's name in the tree comes from its sheet ("4.1 L 6
// cilindros"), its year is the year above it, and its sheet's title is built from the tree ("1986 · Chevrolet Opala
// Diplomata 4.1"). catalogFrom turns the API's answer into the tree the TreeView shows (see CatalogNode), where every
// branch whose data is still to come is an empty branch, and the sheets by engine id.
// The Catalog search finds brands and models by name, ignoring case and accents, and parts of the inventory by the
// code of any of their brands, or by one of their original codes; a part leads to its vehicle in the catalog (of a part
// that fits several, the first the catalog has a sheet for): the same brand, the model by the start of the part's model
// name ("Opala 4.1" → Opala) and the engine by the displacement ("4.1" → "4.1 L 6 cilindros").
// On a phone the Catalog is a stack of screens, as in its mockup: the brands, each on a line with how many models and
// sheets it has; a brand's models, as a tree; and an engine's sheet, under the path to it. ← goes back one screen. A
// part found by code opens its engine's sheet, or else its brand's models with its model pointed out, saying when the
// catalog has no sheet for its vehicle.
// The tree is edited through the API: a catalog brand is added by name (a vehicle brand of the lists, added there when
// they don't hold it), a model under a brand (a vehicle model of the lists the same way), a generation under a model,
// a version under a generation, a year under a version and an engine with its sheet under a year; each but an engine
// can be renamed, moved up or down among its siblings and deleted with what is under it, and an engine's sheet is
// saved again. Every change answers the whole catalog, which the screen takes as it is.

/** The screen the Catalog opens on, on a phone: the brands. */
export const CATALOG_HOME: CatalogScreen = { view: "brands" };
/** The API path of the catalog, and of its brands. */
export const CATALOG_PATH = "/catalog";
export const CATALOG_BRANDS_PATH = "/catalog/brands";
/** What each level below the brands adds under its parent: the level, its path under the parent's, and its button. */
export const CATALOG_CHILDREN: Record<"brand" | CatalogEditLevel, { level: CatalogLevel; segment: string; add: string }> = {
  brand: { level: "model", segment: "models", add: "Novo modelo" },
  model: { level: "generation", segment: "generations", add: "Nova geração" },
  generation: { level: "version", segment: "versions", add: "Nova versão" },
  version: { level: "year", segment: "years", add: "Novo ano" },
  year: { level: "engine", segment: "engines", add: "Novo motor" },
};
/** The API path of the engines, whose sheets are saved there. */
export const CATALOG_ENGINES_PATH = "/catalog/engines";
/** The engines a sheet can describe: displacement in decilitres and cylinders. */
export const CATALOG_ENGINE_LIMITS = { displacementDl: { min: 1, max: 150 }, cylinders: { min: 1, max: 16 } } as const;
/** The API path of each level of the tree that the Catalog tab edits. */
export const CATALOG_LEVEL_PATHS: Record<CatalogEditLevel, string> = {
  model: "/catalog/models",
  generation: "/catalog/generations",
  version: "/catalog/versions",
  year: "/catalog/years",
};
/** The years a generation or a model year can have. */
export const CATALOG_YEARS = { min: 1900, max: 2100 } as const;
/** What each drive reads as on an engine's sheet. */
export const ENGINE_DRIVE_LABELS: Record<EngineDrive, string> = { FRONT: "DIANTEIRA", REAR: "TRASEIRA", ALL: "INTEGRAL" };
/** What each of an engine sheet's readouts is, in their order, named above them on a phone. */
export const ENGINE_SPEC_LABELS = ["Ano", "Motor", "Cilindros", "Tração"] as const;
/** What a part's vehicle says when the catalog has no sheet for it. */
export const NO_SHEET_MESSAGE = "Este veículo ainda não tem ficha técnica no catálogo. A peça continua cadastrada no estoque.";
/** Least letters and digits of a part code before the search looks for parts. */
export const PART_CODE_MIN_LENGTH = 3;
/** Most parts the code search lists at once. */
export const PART_RESULTS_LIMIT = 5;

export const engineDriveSchema = z.enum(["FRONT", "REAR", "ALL"]);
/** An engine and its sheet: displacement in decilitres (41 for 4.1 L), cylinders, drive and summary. */
export const catalogEngineSchema = z.object({
  id: z.uuid(),
  displacementDl: z.int().positive(),
  cylinders: z.int().positive(),
  drive: engineDriveSchema,
  summary: z.string(),
});
export const catalogYearSchema = z.object({ id: z.uuid(), year: z.int(), engines: z.array(catalogEngineSchema) });
export const catalogVersionSchema = z.object({ id: z.uuid(), name: z.string(), years: z.array(catalogYearSchema) });
/** A generation and its years, the last one null while it is still made. */
export const catalogGenerationSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  firstYear: z.int(),
  lastYear: z.int().nullable(),
  versions: z.array(catalogVersionSchema),
});
/** A model of the catalog, by the name of its vehicle model. */
export const catalogModelSchema = z.object({ id: z.uuid(), name: z.string(), generations: z.array(catalogGenerationSchema) });
/** A brand of the catalog: its vehicle brand's id and name, the letters on its line on a phone, and its models. */
export const catalogBrandSchema = z.object({ id: z.uuid(), name: z.string(), mark: z.string(), models: z.array(catalogModelSchema) });
/** What GET /catalog answers, and every change to it: the catalog brands in the rail's order. */
export const catalogSchema = z.object({ brands: z.array(catalogBrandSchema) });
/** A node of the tree, or the parent a node is added under, by its id. */
export const catalogIdParamsSchema = z.object({ id: z.uuid() });
/** A brand, model or version added or renamed: its name. */
export const catalogNameSchema = z.object({ name: z.string().trim().min(1, "Required.") });
const catalogYear = z.int(`Use a year from ${CATALOG_YEARS.min} to ${CATALOG_YEARS.max}.`).min(CATALOG_YEARS.min).max(CATALOG_YEARS.max);
/** A generation added or renamed: its name and years, the last one null while it is still made. */
export const catalogGenerationInputSchema = z
  .object({ name: z.string().trim().min(1, "Required."), firstYear: catalogYear, lastYear: catalogYear.nullable() })
  .refine((generation) => generation.lastYear === null || generation.lastYear >= generation.firstYear, {
    path: ["lastYear"],
    message: "The last year can't come before the first.",
  });
/** A model year added or changed. */
export const catalogYearInputSchema = z.object({ year: catalogYear });
/** An engine's sheet, added with it or saved again: displacement in decilitres, cylinders, drive and summary. */
export const catalogEngineInputSchema = z.object({
  displacementDl: z.int().min(CATALOG_ENGINE_LIMITS.displacementDl.min).max(CATALOG_ENGINE_LIMITS.displacementDl.max),
  cylinders: z.int().min(CATALOG_ENGINE_LIMITS.cylinders.min).max(CATALOG_ENGINE_LIMITS.cylinders.max),
  drive: engineDriveSchema,
  summary: z.string().trim(),
});
/** Moving a node up or down among its siblings. */
export const catalogMoveSchema = z.object({ direction: z.enum(["up", "down"]) });

/**
 * A node of a brand's model tree, in the shape of the tree's nodes (`TreeNode` of @apc/ui-spec/tree), so the web and
 * mobile TreeView show it as it is: a node with `children` is a branch, even with an empty list, and one without is a
 * leaf, an engine. `detail` is the muted text after the label, e.g. a generation's years, which a generation also keeps
 * as numbers for its form, as an engine keeps its sheet. `level` says which level of the tree it is.
 */
export type CatalogNode = {
  id: string;
  label: string;
  level: CatalogLevel;
  detail?: string;
  firstYear?: number;
  lastYear?: number | null;
  sheet?: CatalogEngineInput;
  children?: CatalogNode[];
};
/** A brand of the catalog: its id, the name on its tile, the letters on its line on a phone and its model tree. */
export type CatalogBrand = { id: string; name: string; mark: string; models: CatalogNode[] };
/** The catalog as the screens use it: the brands with their trees, and the sheet of each engine by engine id. */
export type Catalog = { brands: readonly CatalogBrand[]; sheets: Readonly<Record<string, EngineSheet>> };
/** The catalog as the API sends it. */
export type CatalogData = z.infer<typeof catalogSchema>;
/** A level of the tree, from a brand's models down to an engine. */
export type CatalogLevel = "model" | "generation" | "version" | "year" | "engine";
/** A level the Catalog tab adds, renames, moves and deletes; engines come with their sheets. */
export type CatalogEditLevel = Exclude<CatalogLevel, "engine">;
/** A generation as added or renamed. */
export type CatalogGenerationInput = z.infer<typeof catalogGenerationInputSchema>;
/** An engine's sheet as added or saved. */
export type CatalogEngineInput = z.infer<typeof catalogEngineInputSchema>;
/** What a node is added or renamed with: a name, a generation's years, a model year, or an engine's sheet. */
export type CatalogValues = { name?: string; firstYear?: number; lastYear?: number | null; year?: number } & Partial<CatalogEngineInput>;
/** The names an engine's sheet is titled with: its year, brand, model and version. */
export type EngineSheetNames = { year: number; brand: string; model: string; version: string };
export type CatalogEngine = z.infer<typeof catalogEngineSchema>;
export type EngineDrive = z.infer<typeof engineDriveSchema>;
/**
 * A screen of the Catalog on a phone: the brands; a brand's models, with a model pointed out and an engine open in the
 * tree, and the vehicle a part fits that the catalog has no sheet for; or an engine's sheet.
 */
export type CatalogScreen =
  | { view: "brands" }
  | { view: "models"; brandId: string; modelId?: string; engineId?: string; missing?: string }
  | { view: "sheet"; brandId: string; engineId: string };
/** An engine's sheet: its title, the readouts under it and a short summary. */
export type EngineSheet = { title: string; specs: string[]; summary: string };
/** Where a part's vehicle is in the catalog: its brand, and its model and engine when the catalog has them. */
export type PartLocation = { brandId: string; modelId?: string; engineId?: string };
/**
 * A part a code search found: the brand of an item whose code matched, by the brand's id, or an item whose original
 * code matched, by the item's id and the code; with the code and its item.
 */
export type FoundPart = { id: string; code: string; item: Item };
/** The parts a code search lists, and how many more matched past the limit. */
export type PartResults = { parts: FoundPart[]; more: number };

/** The catalog before it loads: no brand. */
export const EMPTY_CATALOG: Catalog = { brands: [], sheets: {} };

/**
 * Lists the brands whose name contains a search, ignoring case and accents.
 * @param catalog The catalog.
 * @param query The brand search as typed; an empty search lists every brand.
 * @returns The matching brands, in rail order.
 */
export function brandsNamed(catalog: Catalog, query: string): CatalogBrand[] {
  return catalog.brands.filter((brand) => searchKey(brand.name).includes(searchKey(query.trim())));
}

/**
 * Says how many models and sheets a brand has, on its line of a phone's brand screen.
 * @param catalog The catalog.
 * @param brand A brand of the catalog.
 * @returns E.g. "3 modelos · 2 fichas técnicas", or "3 modelos · sem ficha técnica ainda".
 */
export function brandSummary(catalog: Catalog, brand: CatalogBrand): string {
  const models = brand.models.length;
  const sheets = brand.models.flatMap(leaves).filter((leaf) => catalog.sheets[leaf.id]).length;
  const modelText = models === 1 ? "1 modelo" : `${models} modelos`;
  const sheetText = sheets === 0 ? "sem ficha técnica ainda" : sheets === 1 ? "1 ficha técnica" : `${sheets} fichas técnicas`;
  return `${modelText} · ${sheetText}`;
}

/**
 * Finds the brand to show for a model search: the chosen brand while it has a model with that name, otherwise the
 * first brand that has one.
 * @param catalog The catalog.
 * @param brandId The chosen brand.
 * @param query The model search as typed.
 * @returns The brand's id, or null when no brand has a model with that name.
 */
export function brandWithModel(catalog: Catalog, brandId: string, query: string): string | null {
  const has = (brand: CatalogBrand) => modelsNamed(brand.models, query).length > 0;
  const chosen = catalog.brands.find((brand) => brand.id === brandId);
  if (chosen && has(chosen)) {
    return brandId;
  }
  return catalog.brands.find(has)?.id ?? null;
}

/**
 * Writes the letters of a brand on its line on a phone: the first letters of its first two words, or the first two of
 * its one word, without accents.
 * @param name The brand's name.
 * @returns E.g. "RE" for Renault, "DR" for "Del Rey".
 */
export function brandMark(name: string): string {
  const words = searchKey(name.trim()).split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "").slice(0, 2);
  return letters.toUpperCase();
}

/**
 * Says what deleting a node takes with it: how many generations, versions, years and engines with their sheets are
 * under it.
 * @param node A node of the tree.
 * @returns E.g. "3 versões, 2 anos, 2 motores com ficha", or null when nothing is under it.
 */
export function belowNode(node: CatalogNode): string | null {
  const counts: Record<CatalogLevel, number> = { model: 0, generation: 0, version: 0, year: 0, engine: 0 };
  /** Counts every node under some nodes. */
  const count = (nodes: readonly CatalogNode[]) => {
    for (const each of nodes) {
      counts[each.level]++;
      count(each.children ?? []);
    }
  };
  count(node.children ?? []);
  const words: [CatalogLevel, string, string][] = [
    ["generation", "geração", "gerações"],
    ["version", "versão", "versões"],
    ["year", "ano", "anos"],
    ["engine", "motor com ficha", "motores com ficha"],
  ];
  const parts = words.filter(([level]) => counts[level] > 0).map(([level, one, many]) => `${counts[level]} ${counts[level] === 1 ? one : many}`);
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * Sends a change of the catalog to the API: a node added, renamed, moved or deleted.
 * @param base Where the API is reached, e.g. "/api" on the web.
 * @param method The change's method.
 * @param path The change's path, e.g. "/catalog/models/<id>/generations".
 * @param body What it sends, if anything.
 * @returns The catalog as it is after the change, "taken" when the API refuses a name or year another node has, or
 * null when the change couldn't be made.
 */
export async function changeCatalog(
  base: string,
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: object,
): Promise<Catalog | "taken" | null> {
  const response = await apiFetch(`${base}${path}`, {
    method,
    ...(body && { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  }).catch(() => null);
  if (response?.status === 409) {
    return "taken";
  }
  return response?.ok ? catalogFrom(catalogSchema.parse(await response.json())) : null;
}

/**
 * Turns the catalog the API sends into the trees the screens show and the sheet of each engine: a generation's years
 * as the muted text after its name, a year by its number, and an engine by the name its sheet gives it.
 * @param data The catalog as GET /catalog answers it.
 * @returns The catalog the screens use.
 */
export function catalogFrom(data: CatalogData): Catalog {
  const sheets: Record<string, EngineSheet> = {};
  const brands = data.brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    mark: brand.mark,
    models: brand.models.map((model) => ({
      id: model.id,
      label: model.name,
      level: "model" as const,
      children: model.generations.map((generation) => ({
        id: generation.id,
        label: generation.name,
        level: "generation" as const,
        detail: `${generation.firstYear}–${generation.lastYear ?? ""}`,
        firstYear: generation.firstYear,
        lastYear: generation.lastYear,
        children: generation.versions.map((version) => ({
          id: version.id,
          label: version.name,
          level: "version" as const,
          children: version.years.map((year) => ({
            id: year.id,
            label: String(year.year),
            level: "year" as const,
            children: year.engines.map(({ id, ...sheet }) => {
              sheets[id] = engineSheet({ year: year.year, brand: brand.name, model: model.name, version: version.name }, sheet);
              return { id, label: engineLabel(sheet), level: "engine" as const, sheet };
            }),
          })),
        })),
      })),
    })),
  }));
  return { brands, sheets };
}

/**
 * Names an engine in the tree by its sheet, so its name is never typed apart from it.
 * @param engine The engine's displacement and cylinders.
 * @returns E.g. "4.1 L 6 cilindros".
 */
export function engineLabel(engine: Pick<CatalogEngine, "displacementDl" | "cylinders">): string {
  return `${engineLitres(engine)} L ${engine.cylinders} cilindros`;
}

/**
 * Builds the sheet an engine shows: its title from the tree and its displacement, its readouts and its summary.
 * @param names The engine's year, brand, model and version.
 * @param engine Its sheet as kept.
 * @returns E.g. "1986 · Chevrolet Opala Diplomata 4.1", with ["1986", "4.1 L", "6 CIL", "TRASEIRA"].
 */
export function engineSheet(names: EngineSheetNames, engine: CatalogEngineInput): EngineSheet {
  const litres = engineLitres(engine);
  return {
    title: `${names.year} · ${names.brand} ${names.model} ${names.version} ${litres}`,
    specs: [String(names.year), `${litres} L`, `${engine.cylinders} CIL`, ENGINE_DRIVE_LABELS[engine.drive]],
    summary: engine.summary,
  };
}

/**
 * Writes an engine's displacement in litres, with one decimal.
 * @param engine The engine's displacement in decilitres.
 * @returns E.g. "4.1", or "1.0".
 */
function engineLitres(engine: Pick<CatalogEngine, "displacementDl">): string {
  return (engine.displacementDl / 10).toFixed(1);
}

/**
 * Writes the path to an engine above its sheet on a phone: its model and the branches down to it.
 * @param catalog The catalog.
 * @param brandId The engine's brand.
 * @param engineId The engine.
 * @returns E.g. "Opala › Terceira geração › Diplomata › 1986"; empty when the brand has no such engine.
 */
export function enginePath(catalog: Catalog, brandId: string, engineId: string): string {
  return treePath(catalog, brandId, engineId)
    .slice(0, -1)
    .map((node) => node.label)
    .join(" › ");
}

/**
 * Lists the inventory parts whose code contains a search, ignoring case, spaces and separators, once the search has
 * enough letters and digits: each brand of an item whose code matches, and each original code of an item that
 * matches, the exact codes first, then the others, up to the limit.
 * @param items Every inventory item.
 * @param query The search as typed, e.g. "fra1000" for "FRA-1000".
 * @returns The parts to list and how many more matched; no parts while the search is too short.
 */
export function findParts(items: readonly Item[], query: string): PartResults {
  const key = codeKey(query);
  if (key.length < PART_CODE_MIN_LENGTH) {
    return { parts: [], more: 0 };
  }
  const found = items.flatMap((item): FoundPart[] => [
    ...item.brands.filter((brand) => codeKey(brand.code).includes(key)).map((brand) => ({ id: brand.id, code: brand.code, item })),
    ...item.originalCodes.filter((code) => codeKey(code).includes(key)).map((code) => ({ id: `${item.id}:${codeKey(code)}`, code, item })),
  ]);
  const exactFirst = [...found.filter((part) => codeKey(part.code) === key), ...found.filter((part) => codeKey(part.code) !== key)];
  return { parts: exactFirst.slice(0, PART_RESULTS_LIMIT), more: Math.max(0, found.length - PART_RESULTS_LIMIT) };
}

/**
 * Finds the first engine with a sheet in a model tree, depth first, to show when a brand opens.
 * @param catalog The catalog.
 * @param nodes A brand's models, or any part of its tree.
 * @returns The engine's id, or undefined when none in the tree has a sheet yet.
 */
export function firstSheet(catalog: Catalog, nodes: readonly CatalogNode[]): string | undefined {
  for (const node of nodes) {
    if (catalog.sheets[node.id]) {
      return node.id;
    }
    const below = node.children && firstSheet(catalog, node.children);
    if (below) {
      return below;
    }
  }
  return undefined;
}

/**
 * Says which vehicles a part fits, as the code search lists it: the one it reveals in the catalog (see partFit), and
 * how many more it fits.
 * @param catalog The catalog.
 * @param item The part's item.
 * @returns E.g. "Serve no Chevrolet Opala 4.1", or "Serve no Chevrolet Opala 4.1 +2".
 */
export function itemFit(catalog: Catalog, item: Pick<Item, "vehicles">): string {
  const others = item.vehicles.length - 1;
  const fit = partFit(catalog, revealedVehicle(catalog, item));
  return others > 0 ? `${fit} +${others}` : fit;
}

/**
 * Lists the leaves of a tree: the engines under a model.
 * @param node A node of the tree.
 * @returns Its leaves, depth first.
 */
function leaves(node: CatalogNode): CatalogNode[] {
  return node.children ? node.children.flatMap(leaves) : [node];
}

/**
 * Loads the catalog from the API.
 * @param base Where the API is reached, e.g. "/api" on the web.
 * @param signal Cancels the request.
 * @returns The catalog the screens use; the request fails when it can't be loaded.
 */
export async function loadCatalog(base: string, signal?: AbortSignal): Promise<Catalog> {
  const response = await apiFetch(`${base}${CATALOG_PATH}`, { signal });
  if (!response.ok) {
    throw new Error(String(response.status));
  }
  return catalogFrom(catalogSchema.parse(await response.json()));
}

/**
 * Places a part's vehicle in the catalog: the brand with the same name, the model the part's model name starts
 * with, and in it the first engine whose name starts with the displacement in the part's model name.
 * @param catalog The catalog.
 * @param part The part's vehicle brand and model.
 * @returns Its brand, model and engine as far as the catalog has them; null when the brand isn't in the catalog.
 */
export function locatePart(catalog: Catalog, part: ItemVehicle): PartLocation | null {
  const brand = catalog.brands.find((b) => searchKey(b.name) === searchKey(part.vehicleBrand));
  if (!brand) {
    return null;
  }
  const name = searchKey(part.vehicleModel ?? "");
  const model = brand.models.find((m) => name === searchKey(m.label) || name.startsWith(`${searchKey(m.label)} `));
  if (!model) {
    return { brandId: brand.id };
  }
  const displacement = part.vehicleModel?.match(/\d\.\d/)?.[0];
  const engine = displacement ? leaves(model).find((leaf) => leaf.label.startsWith(displacement)) : undefined;
  return { brandId: brand.id, modelId: model.id, engineId: engine?.id };
}

/**
 * Lists the nodes of a tree with a search in their name, at its top level: the models of a brand.
 * @param models A brand's models.
 * @param query The model search as typed; an empty search lists every model.
 * @returns The matching models, in tree order.
 */
export function modelsNamed(models: readonly CatalogNode[], query: string): CatalogNode[] {
  return models.filter((model) => searchKey(model.label).includes(searchKey(query.trim())));
}

/**
 * Says which vehicle a part fits, as the code search lists it: any vehicle for universal parts, its vehicle when
 * the catalog has its engine, or what the catalog is still missing.
 * @param catalog The catalog.
 * @param part The part's vehicle brand and model.
 * @returns E.g. "Serve no Chevrolet Opala 4.1" or "Ford Escort (modelo ainda sem ficha no catálogo)".
 */
export function partFit(catalog: Catalog, part: ItemVehicle): string {
  if (searchKey(part.vehicleBrand) === searchKey(UNIVERSAL_BRAND)) {
    return "Serve em qualquer veículo";
  }
  const location = locatePart(catalog, part);
  if (!location) {
    return `${part.vehicleBrand} não está no catálogo`;
  }
  if (!part.vehicleModel) {
    return `Serve em qualquer ${part.vehicleBrand}`;
  }
  const vehicle = `${part.vehicleBrand} ${part.vehicleModel}`;
  const model = catalog.brands.find((b) => b.id === location.brandId)!.models.find((m) => m.id === location.modelId);
  if (!model || !firstSheet(catalog, [model])) {
    return `${vehicle} (modelo ainda sem ficha no catálogo)`;
  }
  return location.engineId ? `Serve no ${vehicle}` : `${vehicle} (motor ainda sem ficha no catálogo)`;
}

/**
 * Finds the screen a part found by code opens on a phone: its vehicle's sheet when the catalog has the engine, or else
 * its brand's models with its model pointed out, and its vehicle named when the catalog has no sheet for it.
 * @param catalog The catalog.
 * @param item The part's item.
 * @returns The screen, or null when the catalog lacks its vehicle's brand.
 */
export function partScreen(catalog: Catalog, item: Pick<Item, "vehicles">): CatalogScreen | null {
  const vehicle = revealedVehicle(catalog, item);
  const location = vehicle && locatePart(catalog, vehicle);
  if (!location) {
    return null;
  }
  if (location.engineId) {
    return { view: "sheet", brandId: location.brandId, engineId: location.engineId };
  }
  const missing = vehicle.vehicleModel ? `${vehicle.vehicleBrand} ${vehicle.vehicleModel}` : undefined;
  return { view: "models", brandId: location.brandId, modelId: location.modelId, missing };
}

/**
 * Picks the vehicle a part shows in the catalog: the first of its vehicles whose engine has a sheet, or else the first
 * the catalog has, or else its first.
 * @param catalog The catalog.
 * @param item The part's item.
 * @returns One of its vehicles.
 */
export function revealedVehicle(catalog: Catalog, item: Pick<Item, "vehicles">): ItemVehicle {
  return (
    item.vehicles.find((vehicle) => locatePart(catalog, vehicle)?.engineId) ??
    item.vehicles.find((vehicle) => locatePart(catalog, vehicle)) ??
    item.vehicles[0]
  );
}

/**
 * Finds the screen ← goes back to on a phone: from a sheet, its brand's models open on its engine; from the models,
 * the brands.
 * @param screen The screen on show.
 * @returns The screen before it, or null on the brands, the first.
 */
export function screenBack(screen: CatalogScreen): CatalogScreen | null {
  switch (screen.view) {
    case "sheet":
      return { view: "models", brandId: screen.brandId, engineId: screen.engineId };
    case "models":
      return CATALOG_HOME;
    case "brands":
      return null;
  }
}

/**
 * Names a phone screen's title row: the tab on the brands, the brand on the others, and where its ← goes.
 * @param catalog The catalog.
 * @param screen The screen on show.
 * @returns Its title and its ←'s name, none on the brands.
 */
export function screenHeader(catalog: Catalog, screen: CatalogScreen): { title: string; back?: string } {
  switch (screen.view) {
    case "brands":
      return { title: "Catálogo" };
    case "models":
      return { title: catalog.brands.find((brand) => brand.id === screen.brandId)?.name ?? "Catálogo", back: "Voltar às marcas" };
    case "sheet":
      return { title: catalog.brands.find((brand) => brand.id === screen.brandId)?.name ?? "Catálogo", back: "Voltar aos modelos" };
  }
}

/**
 * Lists the nodes from a brand's model down to a node of its tree, e.g. to open the tree on an engine.
 * @param catalog The catalog.
 * @param brandId The node's brand.
 * @param nodeId The node.
 * @returns The nodes, the model first and the node last; empty when the brand has no such node.
 */
export function treePath(catalog: Catalog, brandId: string, nodeId: string): CatalogNode[] {
  /** The path to the node from one of some nodes, or empty when none leads to it. */
  const find = (nodes: readonly CatalogNode[]): CatalogNode[] => {
    for (const node of nodes) {
      if (node.id === nodeId) {
        return [node];
      }
      const below = find(node.children ?? []);
      if (below.length > 0) {
        return [node, ...below];
      }
    }
    return [];
  };
  return find(catalog.brands.find((brand) => brand.id === brandId)?.models ?? []);
}
