import { codeKey, searchKey, type Item } from "../items/items.ts";
import type { TreeNode } from "../tree/tree.ts";

// The vehicle catalog of the Catalog tab, mocked until the real data (EP-10): each brand's models as a tree, model →
// generation → version → year → engine, and each engine's sheet. Branches whose data is still to come are empty
// branches (see TreeNode), so every engine in a tree has a sheet. Engine ids are unique across brands, as the sheets
// are looked up by them. The Catalog search finds brands and models by name, ignoring case and accents, and parts
// of the inventory by their code; a part leads to its vehicle in the catalog: the same brand, the model by the start
// of the part's model name ("Opala 4.1" → Opala) and the engine by the displacement ("4.1" → "4.1 L 6 cilindros").

/** The brands of the catalog, in the order of the rail, each with its model tree. */
export const CATALOG: readonly CatalogBrand[] = [
  {
    id: "chevrolet",
    name: "Chevrolet",
    models: [
      {
        id: "chevrolet-chevette",
        label: "Chevette",
        children: [{ id: "chevrolet-chevette-2", label: "Segunda geração", detail: "1983–1993", children: [] }],
      },
      {
        id: "chevrolet-opala",
        label: "Opala",
        children: [
          { id: "chevrolet-opala-1", label: "Primeira geração", detail: "1968–1974", children: [] },
          { id: "chevrolet-opala-2", label: "Segunda geração", detail: "1975–1979", children: [] },
          {
            id: "chevrolet-opala-3",
            label: "Terceira geração",
            detail: "1980–1992",
            children: [
              { id: "chevrolet-opala-3-comodoro", label: "Comodoro", children: [] },
              {
                id: "chevrolet-opala-3-diplomata",
                label: "Diplomata",
                children: [
                  { id: "chevrolet-opala-3-diplomata-1985", label: "1985", children: [] },
                  {
                    id: "chevrolet-opala-3-diplomata-1986",
                    label: "1986",
                    children: [
                      { id: "chevrolet-opala-diplomata-1986-2.5", label: "2.5 L 4 cilindros" },
                      { id: "chevrolet-opala-diplomata-1986-4.1", label: "4.1 L 6 cilindros" },
                    ],
                  },
                ],
              },
              { id: "chevrolet-opala-3-ss", label: "SS", children: [] },
            ],
          },
        ],
      },
      { id: "chevrolet-monza", label: "Monza", children: [] },
    ],
  },
  {
    id: "volkswagen",
    name: "Volkswagen",
    models: [
      { id: "volkswagen-fusca", label: "Fusca", children: [] },
      {
        id: "volkswagen-gol",
        label: "Gol",
        children: [
          {
            id: "volkswagen-gol-1",
            label: "Primeira geração",
            detail: "1980–1994",
            children: [
              {
                id: "volkswagen-gol-1-gts",
                label: "GTS",
                children: [
                  {
                    id: "volkswagen-gol-1-gts-1989",
                    label: "1989",
                    children: [{ id: "volkswagen-gol-gts-1989-1.8", label: "1.8 L 4 cilindros" }],
                  },
                ],
              },
            ],
          },
        ],
      },
      { id: "volkswagen-santana", label: "Santana", children: [] },
    ],
  },
  {
    id: "fiat",
    name: "Fiat",
    models: [
      { id: "fiat-147", label: "147", children: [] },
      {
        id: "fiat-uno",
        label: "Uno",
        children: [
          {
            id: "fiat-uno-1",
            label: "Primeira geração",
            detail: "1984–2013",
            children: [
              {
                id: "fiat-uno-1-mille",
                label: "Mille",
                children: [
                  {
                    id: "fiat-uno-1-mille-1991",
                    label: "1991",
                    children: [{ id: "fiat-uno-mille-1991-1.0", label: "1.0 L 4 cilindros" }],
                  },
                ],
              },
            ],
          },
        ],
      },
      { id: "fiat-tempra", label: "Tempra", children: [] },
    ],
  },
  {
    id: "ford",
    name: "Ford",
    models: [
      { id: "ford-corcel", label: "Corcel", children: [] },
      { id: "ford-del-rey", label: "Del Rey", children: [] },
      { id: "ford-escort", label: "Escort", children: [] },
    ],
  },
];
/** The sheet of each engine, by engine id. */
export const ENGINE_SHEETS: Readonly<Record<string, EngineSheet>> = {
  "chevrolet-opala-diplomata-1986-2.5": {
    title: "1986 · Chevrolet Opala Diplomata 2.5",
    specs: ["1986", "2.5 L", "4 CIL", "TRASEIRA"],
    summary:
      "Opção de entrada do Diplomata, o quatro-cilindros 2.5 usa bloco de ferro fundido e comando no bloco, priorizando " +
      "torque em baixa sobre giro alto. Pesa menos sobre o eixo dianteiro e deixa a direção mais leve.",
  },
  "chevrolet-opala-diplomata-1986-4.1": {
    title: "1986 · Chevrolet Opala Diplomata 4.1",
    specs: ["1986", "4.1 L", "6 CIL", "TRASEIRA"],
    summary:
      "O seis-cilindros em linha de 4,1 L é a configuração mais lembrada do Opala e ajudou o Diplomata a virar sinônimo de " +
      "conforto nos anos 80. Entrega torque farto desde a marcha lenta, com resposta longa e suave.",
  },
  "volkswagen-gol-gts-1989-1.8": {
    title: "1989 · Volkswagen Gol GTS 1.8",
    specs: ["1989", "1.8 L", "4 CIL", "DIANTEIRA"],
    summary:
      "Versão esportiva do primeiro Gol, com o motor AP 1.8 a álcool ou gasolina, câmbio de cinco marchas e acerto de " +
      "suspensão mais firme que o das versões de entrada.",
  },
  "fiat-uno-mille-1991-1.0": {
    title: "1991 · Fiat Uno Mille 1.0",
    specs: ["1991", "1.0 L", "4 CIL", "DIANTEIRA"],
    summary:
      "O Uno de mil cilindradas que abriu a era dos carros populares no Brasil: motor pequeno e econômico, manutenção " +
      "simples e peças fáceis de achar.",
  },
};

/** Least letters and digits of a part code before the search looks for parts. */
export const PART_CODE_MIN_LENGTH = 3;
/** Most parts the code search lists at once. */
export const PART_RESULTS_LIMIT = 5;
/** Vehicle brand of the parts that fit any vehicle. */
export const UNIVERSAL_BRAND = "Universal";

/** A brand of the catalog: its id, the name on its tile and its model tree. */
export type CatalogBrand = { id: string; name: string; models: TreeNode[] };
/** An engine's sheet: its title, the readouts under it and a short summary. */
export type EngineSheet = { title: string; specs: string[]; summary: string };
/** Where a part's vehicle is in the catalog: its brand, and its model and engine when the catalog has them. */
export type PartLocation = { brandId: string; modelId?: string; engineId?: string };
/** The parts a code search lists, and how many more matched past the limit. */
export type PartResults = { parts: Item[]; more: number };
/** What a part needs to be placed in the catalog: its vehicle brand and model. */
type PartVehicle = Pick<Item, "vehicleBrand" | "vehicleModel">;

/**
 * Lists the brands whose name contains a search, ignoring case and accents.
 * @param query The brand search as typed; an empty search lists every brand.
 * @returns The matching brands, in rail order.
 */
export function brandsNamed(query: string): CatalogBrand[] {
  return CATALOG.filter((brand) => searchKey(brand.name).includes(searchKey(query.trim())));
}

/**
 * Finds the brand to show for a model search: the chosen brand while it has a model with that name, otherwise the
 * first brand that has one.
 * @param brandId The chosen brand.
 * @param query The model search as typed.
 * @returns The brand's id, or null when no brand has a model with that name.
 */
export function brandWithModel(brandId: string, query: string): string | null {
  const has = (brand: CatalogBrand) => modelsNamed(brand.models, query).length > 0;
  const chosen = CATALOG.find((brand) => brand.id === brandId);
  if (chosen && has(chosen)) {
    return brandId;
  }
  return CATALOG.find(has)?.id ?? null;
}

/**
 * Lists the inventory parts whose code contains a search, ignoring case, spaces and separators, once the search has
 * enough letters and digits: the exact codes first, then the others, up to the limit.
 * @param items Every inventory item.
 * @param query The search as typed, e.g. "fra1000" for "FRA-1000".
 * @returns The parts to list and how many more matched; no parts while the search is too short.
 */
export function findParts(items: readonly Item[], query: string): PartResults {
  const key = codeKey(query);
  if (key.length < PART_CODE_MIN_LENGTH) {
    return { parts: [], more: 0 };
  }
  const found = items.filter((item) => codeKey(item.code).includes(key));
  const exactFirst = [...found.filter((item) => codeKey(item.code) === key), ...found.filter((item) => codeKey(item.code) !== key)];
  return { parts: exactFirst.slice(0, PART_RESULTS_LIMIT), more: Math.max(0, found.length - PART_RESULTS_LIMIT) };
}

/**
 * Finds the first engine with a sheet in a model tree, depth first, to show when a brand opens.
 * @param nodes A brand's models, or any part of its tree.
 * @returns The engine's id, or undefined when none in the tree has a sheet yet.
 */
export function firstSheet(nodes: readonly TreeNode[]): string | undefined {
  for (const node of nodes) {
    if (ENGINE_SHEETS[node.id]) {
      return node.id;
    }
    const below = node.children && firstSheet(node.children);
    if (below) {
      return below;
    }
  }
  return undefined;
}

/**
 * Lists the leaves of a tree: the engines under a model.
 * @param node A node of the tree.
 * @returns Its leaves, depth first.
 */
function leaves(node: TreeNode): TreeNode[] {
  return node.children ? node.children.flatMap(leaves) : [node];
}

/**
 * Places a part's vehicle in the catalog: the brand with the same name, the model the part's model name starts
 * with, and in it the first engine whose name starts with the displacement in the part's model name.
 * @param part The part's vehicle brand and model.
 * @returns Its brand, model and engine as far as the catalog has them; null when the brand isn't in the catalog.
 */
export function locatePart(part: PartVehicle): PartLocation | null {
  const brand = CATALOG.find((b) => searchKey(b.name) === searchKey(part.vehicleBrand));
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
export function modelsNamed(models: readonly TreeNode[], query: string): TreeNode[] {
  return models.filter((model) => searchKey(model.label).includes(searchKey(query.trim())));
}

/**
 * Says which vehicle a part fits, as the code search lists it: any vehicle for universal parts, its vehicle when
 * the catalog has its engine, or what the catalog is still missing.
 * @param part The part's vehicle brand and model.
 * @returns E.g. "Serve no Chevrolet Opala 4.1" or "Ford Escort (modelo ainda sem ficha no catálogo)".
 */
export function partFit(part: PartVehicle): string {
  if (searchKey(part.vehicleBrand) === searchKey(UNIVERSAL_BRAND)) {
    return "Serve em qualquer veículo";
  }
  const location = locatePart(part);
  if (!location) {
    return `${part.vehicleBrand} não está no catálogo`;
  }
  if (!part.vehicleModel) {
    return `Serve em qualquer ${part.vehicleBrand}`;
  }
  const vehicle = `${part.vehicleBrand} ${part.vehicleModel}`;
  const model = CATALOG.find((b) => b.id === location.brandId)!.models.find((m) => m.id === location.modelId);
  if (!model || !firstSheet([model])) {
    return `${vehicle} (modelo ainda sem ficha no catálogo)`;
  }
  return location.engineId ? `Serve no ${vehicle}` : `${vehicle} (motor ainda sem ficha no catálogo)`;
}
