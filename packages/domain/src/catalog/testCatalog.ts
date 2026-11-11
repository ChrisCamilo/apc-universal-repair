import { optionKey } from "../inventory/items.ts";
import { listName } from "../inventory/lists.ts";
import {
  brandMark,
  CATALOG_CHILDREN,
  CATALOG_LEVEL_PATHS,
  catalogFrom,
  type CatalogData,
  type CatalogEditLevel,
  type CatalogEngine,
  type CatalogValues,
} from "./catalog.ts";

// The catalog a new database starts with, as GET /catalog answers it: four brands, their models, the generations,
// versions and years written so far, and four engines with their sheets. The migration that made the catalog tables
// (apps/api/prisma/migrations/20261106000000_catalog) inserts these same rows with these same ids, so the web demo, the
// E2E stand-ins and the tests of web and mobile answer what a new server holds. The ids are numbered in UUID form in
// the order below.
// applyCatalogChange makes the API's changes on a catalog held in memory, for the demo, the E2E stand-ins and the tests:
// a brand or a node added, renamed, moved or deleted, under the API's rules; catalogChangeOf reads the change a request
// to the API makes, for the stand-ins that answer by path.

let count = 0;
/** The next id, in UUID form. */
const id = () => `ca7a1000-0000-4000-8000-${String(++count).padStart(12, "0")}`;

/**
 * A model with its generations.
 * @param name The vehicle model's name.
 * @param generations Its generations.
 * @returns The model.
 */
function model(name: string, generations: CatalogData["brands"][number]["models"][number]["generations"] = []) {
  return { id: id(), name, generations };
}

/**
 * An engine with its sheet.
 * @param sheet Its displacement in decilitres, cylinders, drive and summary.
 * @returns The engine.
 */
function engine(sheet: Omit<CatalogEngine, "id">): CatalogEngine {
  return { id: id(), ...sheet };
}

export const TEST_CATALOG_DATA: CatalogData = {
  brands: [
    {
      id: id(),
      name: "Chevrolet",
      mark: "CH",
      models: [
        model("Chevette", [{ id: id(), name: "Segunda geração", firstYear: 1983, lastYear: 1993, versions: [] }]),
        model("Opala", [
          { id: id(), name: "Primeira geração", firstYear: 1968, lastYear: 1974, versions: [] },
          { id: id(), name: "Segunda geração", firstYear: 1975, lastYear: 1979, versions: [] },
          {
            id: id(),
            name: "Terceira geração",
            firstYear: 1980,
            lastYear: 1992,
            versions: [
              { id: id(), name: "Comodoro", years: [] },
              {
                id: id(),
                name: "Diplomata",
                years: [
                  { id: id(), year: 1985, engines: [] },
                  {
                    id: id(),
                    year: 1986,
                    engines: [
                      engine({
                        displacementDl: 25,
                        cylinders: 4,
                        drive: "REAR",
                        summary:
                          "Opção de entrada do Diplomata, o quatro-cilindros 2.5 usa bloco de ferro fundido e comando no bloco, priorizando " +
                          "torque em baixa sobre giro alto. Pesa menos sobre o eixo dianteiro e deixa a direção mais leve.",
                      }),
                      engine({
                        displacementDl: 41,
                        cylinders: 6,
                        drive: "REAR",
                        summary:
                          "O seis-cilindros em linha de 4,1 L é a configuração mais lembrada do Opala e ajudou o Diplomata a virar sinônimo de " +
                          "conforto nos anos 80. Entrega torque farto desde a marcha lenta, com resposta longa e suave.",
                      }),
                    ],
                  },
                ],
              },
              { id: id(), name: "SS", years: [] },
            ],
          },
        ]),
        model("Monza"),
      ],
    },
    {
      id: id(),
      name: "Volkswagen",
      mark: "VW",
      models: [
        model("Fusca"),
        model("Gol", [
          {
            id: id(),
            name: "Primeira geração",
            firstYear: 1980,
            lastYear: 1994,
            versions: [
              {
                id: id(),
                name: "GTS",
                years: [
                  {
                    id: id(),
                    year: 1989,
                    engines: [
                      engine({
                        displacementDl: 18,
                        cylinders: 4,
                        drive: "FRONT",
                        summary:
                          "Versão esportiva do primeiro Gol, com o motor AP 1.8 a álcool ou gasolina, câmbio de cinco marchas e acerto de " +
                          "suspensão mais firme que o das versões de entrada.",
                      }),
                    ],
                  },
                ],
              },
            ],
          },
        ]),
        model("Santana"),
      ],
    },
    {
      id: id(),
      name: "Fiat",
      mark: "FI",
      models: [
        model("147"),
        model("Uno", [
          {
            id: id(),
            name: "Primeira geração",
            firstYear: 1984,
            lastYear: 2013,
            versions: [
              {
                id: id(),
                name: "Mille",
                years: [
                  {
                    id: id(),
                    year: 1991,
                    engines: [
                      engine({
                        displacementDl: 10,
                        cylinders: 4,
                        drive: "FRONT",
                        summary:
                          "O Uno de mil cilindradas que abriu a era dos carros populares no Brasil: motor pequeno e econômico, manutenção " +
                          "simples e peças fáceis de achar.",
                      }),
                    ],
                  },
                ],
              },
            ],
          },
        ]),
        model("Tempra"),
      ],
    },
    { id: id(), name: "Ford", mark: "FO", models: [model("Corcel"), model("Del Rey"), model("Escort")] },
  ],
};

/** The same catalog as the screens use it. */
export const TEST_CATALOG = catalogFrom(TEST_CATALOG_DATA);

/**
 * Finds the id of a brand or a node of the test catalog by its names.
 * @param brand The brand's name.
 * @param labels The names from the model down to the node, as the tree shows them; none for the brand itself.
 * @returns Its id.
 */
export function testCatalogId(brand: string, ...labels: string[]): string {
  const held = TEST_CATALOG.brands.find((each) => each.name === brand);
  let nodes = held?.models;
  let found = held?.id;
  for (const label of labels) {
    const node = nodes?.find((each) => each.label === label);
    found = node?.id;
    nodes = node?.children;
  }
  if (!found) {
    throw new Error(`No ${[brand, ...labels].join(" › ")} in the test catalog.`);
  }
  return found;
}

/** The engines of the test catalog, by a short name. */
export const TEST_ENGINES = {
  opala25: testCatalogId("Chevrolet", "Opala", "Terceira geração", "Diplomata", "1986", "2.5 L 4 cilindros"),
  opala41: testCatalogId("Chevrolet", "Opala", "Terceira geração", "Diplomata", "1986", "4.1 L 6 cilindros"),
  golGts: testCatalogId("Volkswagen", "Gol", "Primeira geração", "GTS", "1989", "1.8 L 4 cilindros"),
  unoMille: testCatalogId("Fiat", "Uno", "Primeira geração", "Mille", "1991", "1.0 L 4 cilindros"),
};

/** A change of the catalog, as the API makes it: what is added, renamed, moved or deleted, and where. */
export type CatalogChange =
  | { kind: "addBrand"; id: string; name: string }
  | { kind: "add"; level: CatalogEditLevel; parentId: string; id: string; values: CatalogValues }
  | { kind: "edit"; level: CatalogEditLevel; id: string; values: CatalogValues }
  | { kind: "move"; level: CatalogEditLevel; id: string; direction: "up" | "down" }
  | { kind: "delete"; level: CatalogEditLevel; id: string };
/** Each level by its path's segment, e.g. "generations". */
const LEVEL_SEGMENTS: Record<string, CatalogEditLevel> = Object.fromEntries(
  Object.entries(CATALOG_LEVEL_PATHS).map(([level, path]) => [path.split("/").at(-1)!, level as CatalogEditLevel]),
);
/** A node of any level as the API sends it, by its id and what tells it from its siblings. */
type RawNode = { id: string; name?: string; year?: number };

/**
 * Makes one of the API's changes on a catalog held in memory, under the API's rules: a brand, a model of a brand, or a
 * year of a version, only once each; a node added at the end of its siblings; a move past the ends leaving them as they
 * are; and a delete taking what is under the node.
 * @param data The catalog as the API sends it.
 * @param change The change.
 * @returns The catalog after it, "taken" when the name or year is another's, or "missing" when its node isn't there.
 */
export function applyCatalogChange(data: CatalogData, change: CatalogChange): CatalogData | "taken" | "missing" {
  const next: CatalogData = JSON.parse(JSON.stringify(data));
  if (change.kind === "addBrand") {
    const name = listName(change.name);
    if (next.brands.some((brand) => optionKey(brand.name) === optionKey(name))) {
      return "taken";
    }
    next.brands.push({ id: change.id, name, mark: brandMark(name), models: [] });
    return next;
  }
  const groups = siblingGroups(next, change.level);
  const group = groups.find((each) => (change.kind === "add" ? each.parentId === change.parentId : each.list.some((node) => node.id === change.id)));
  if (!group) {
    return "missing";
  }
  const index = group.list.findIndex((node) => node.id === (change.kind === "add" ? "" : change.id));
  if (change.kind === "add" || change.kind === "edit") {
    const node = nodeOf(change.level, change.kind === "add" ? change.id : group.list[index].id, change.values);
    const twin = group.list.find((each, at) => at !== index && sameNode(change.level, each, node));
    if (twin) {
      return "taken";
    }
    if (change.kind === "add") {
      group.list.push(node);
    } else {
      group.list[index] = { ...group.list[index], ...node, id: group.list[index].id, ...keptChildren(change.level, group.list[index]) };
    }
    return next;
  }
  if (change.kind === "move") {
    const target = change.direction === "up" ? index - 1 : index + 1;
    if (target >= 0 && target < group.list.length) {
      [group.list[index], group.list[target]] = [group.list[target], group.list[index]];
    }
    return next;
  }
  group.list.splice(index, 1);
  return next;
}

/**
 * Reads the change a request to the catalog's routes makes, with the status the API answers it with.
 * @param method The request's method.
 * @param path Its path after /catalog, e.g. "/models/<id>/generations".
 * @param body Its JSON body.
 * @param newId The id a node added takes.
 * @returns The change and its status, or null for a request that changes nothing, such as GET.
 */
export function catalogChangeOf(
  method: string,
  path: string,
  body: Record<string, unknown>,
  newId: string,
): { status: number; change: CatalogChange } | null {
  const [, first, id, last] = path.split("/");
  if (method === "POST" && first === "brands" && id === undefined) {
    return { status: 201, change: { kind: "addBrand", id: newId, name: String(body.name) } };
  }
  const child = Object.values(CATALOG_CHILDREN).find((each) => each.segment === last);
  if (method === "POST" && child) {
    return { status: 201, change: { kind: "add", level: child.level, parentId: id, id: newId, values: body } };
  }
  const level = LEVEL_SEGMENTS[first];
  if (!level) {
    return null;
  }
  if (method === "POST" && last === "move") {
    return { status: 200, change: { kind: "move", level, id, direction: body.direction as "up" | "down" } };
  }
  if (method === "PATCH") {
    return { status: 200, change: { kind: "edit", level, id, values: body } };
  }
  return method === "DELETE" ? { status: 200, change: { kind: "delete", level, id } } : null;
}

/**
 * Keeps what is under a node that is renamed.
 * @param level The node's level.
 * @param node The node as it was.
 * @returns Its children, under their key.
 */
function keptChildren(level: CatalogEditLevel, node: RawNode): object {
  const key = { model: "generations", generation: "versions", version: "years", year: "engines" }[level];
  return { [key]: (node as unknown as Record<string, unknown>)[key] };
}

/**
 * Builds a node of a level from what it is added or renamed with.
 * @param level The node's level.
 * @param id Its id.
 * @param values Its name, years or year.
 * @returns The node, with nothing under it.
 */
function nodeOf(level: CatalogEditLevel, id: string, values: CatalogValues): RawNode {
  const name = listName(values.name ?? "");
  switch (level) {
    case "model":
      return { id, name, generations: [] } as RawNode;
    case "generation":
      return { id, name, firstYear: values.firstYear, lastYear: values.lastYear ?? null, versions: [] } as RawNode;
    case "version":
      return { id, name, years: [] } as RawNode;
    case "year":
      return { id, year: values.year, engines: [] } as RawNode;
  }
}

/**
 * Tells whether two siblings would be the same: two models of one name, or two years of one number.
 * @param level Their level.
 * @param a One node.
 * @param b The other.
 * @returns True for models and years that clash; generations and versions never do.
 */
function sameNode(level: CatalogEditLevel, a: RawNode, b: RawNode): boolean {
  if (level === "model") {
    return optionKey(a.name ?? "") === optionKey(b.name ?? "");
  }
  return level === "year" && a.year === b.year;
}

/**
 * Lists the groups of siblings of a level: each parent's nodes of that level, in order.
 * @param data The catalog.
 * @param level The level.
 * @returns Each group, by its parent's id, with the list itself, so a change to it changes the catalog.
 */
function siblingGroups(data: CatalogData, level: CatalogEditLevel): { parentId: string; list: RawNode[] }[] {
  const models = data.brands.map((brand) => ({ parentId: brand.id, list: brand.models as RawNode[] }));
  if (level === "model") {
    return models;
  }
  const generations = data.brands.flatMap((brand) => brand.models).map((model) => ({ parentId: model.id, list: model.generations as RawNode[] }));
  if (level === "generation") {
    return generations;
  }
  const allGenerations = data.brands.flatMap((brand) => brand.models.flatMap((model) => model.generations));
  const versions = allGenerations.map((generation) => ({ parentId: generation.id, list: generation.versions as RawNode[] }));
  if (level === "version") {
    return versions;
  }
  return allGenerations.flatMap((generation) => generation.versions).map((version) => ({ parentId: version.id, list: version.years as RawNode[] }));
}
