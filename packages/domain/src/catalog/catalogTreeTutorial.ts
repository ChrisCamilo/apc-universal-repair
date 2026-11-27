import type { TutorialStep } from "../inventory/inventoryTutorial.ts";
import { apiFetch } from "../auth/apiFetch.ts";
import { deleteListEntry, ITEM_LIST_PATHS, vehicleModelSchema } from "../inventory/lists.ts";
import { optionKey } from "../inventory/items.ts";
import { catalog, type Locale } from "../platform/locale/locale.ts";
import {
  catalogAddUnder,
  catalogEditRequest,
  catalogNodePath,
  catalogSheetRequest,
  changeCatalog,
  type Catalog,
  type CatalogBrand,
  type CatalogNode,
  type CatalogValues,
} from "./catalog.ts";

// The guided tour of a model's tree in the Catalog, shared by web and mobile, the same way as the Inventory tutorial (see
// inventoryTutorial.ts): on the catalog's first brand, which its tab opens, it adds a test model, then a generation with
// its years, a version, a period and an engine with its sheet, a second version, and moves the second version up. Each
// platform describes its screen and finds what each step points at; "Fazer por mim" makes each change on the API, as the
// screen would. When the tour ends or is skipped, the tab deletes the test model from the catalog, with its tree, and its
// vehicle model from the lists; and the same with one left from a run that didn't end, when it starts.

/** The tutorial, as the user menu's Tutoriais lists it. */
export const CATALOG_TREE_TUTORIAL = "catalog-tree";
/** The names the tour gives the test model and its tree. */
export const CATALOG_TREE_NAMES = {
  model: "Modelo de teste do tutorial",
  generation: "Geração de teste",
  firstVersion: "Versão de teste 1",
  secondVersion: "Versão de teste 2",
} as const;
/** What each level of the test tree is added with, as the screens' forms send it. */
export const CATALOG_TREE_VALUES = {
  generation: { name: CATALOG_TREE_NAMES.generation, firstYear: 2001, lastYear: 2005 },
  period: { year: 2001, lastYear: 2003 },
  engine: { displacementDl: 10, cylinders: 4, drive: "FRONT", summary: "Motor de teste do tutorial." },
} as const satisfies Record<string, CatalogValues>;
/** The tour's name and each step's title and text, and what a phone's step says instead. */
const STEP_TEXTS = catalog<{
  title: string;
  steps: Record<CatalogTreeStepId, { title: string; text: string }>;
  phone: Partial<Record<CatalogTreeStepId, string>>;
}>(
  {
    title: "Montar a árvore de um modelo",
    steps: {
      model: { title: "Adicione um modelo", text: "Clique em Novo modelo e adicione o modelo “Modelo de teste do tutorial”." },
      generation: {
        title: "Adicione uma geração",
        text: "Clique em Nova geração no modelo de teste e adicione “Geração de teste”, de 2001 a 2005.",
      },
      version: { title: "Adicione uma versão", text: "Clique em Nova versão na geração e adicione “Versão de teste 1”." },
      period: { title: "Adicione um período", text: "Clique em Novo período na versão e adicione o período de 2001 a 2003." },
      engine: {
        title: "Adicione um motor",
        text: "Clique em Novo motor no período e preencha a ficha: 1,0 L, 4 cilindros, tração dianteira. Salve a ficha.",
      },
      second: { title: "Adicione outra versão", text: "Clique em Nova versão na geração de novo e adicione “Versão de teste 2”." },
      move: { title: "Mude a ordem", text: "A ordem dos níveis é a da árvore. Mova “Versão de teste 2” para cima, antes da primeira." },
      end: {
        title: "Pronto!",
        text: "Você montou a árvore de um modelo, da geração ao motor. O modelo de teste sai do Catálogo, com a árvore, quando o tutorial termina.",
      },
    },
    phone: {
      model: "Toque em Novo modelo e adicione o modelo “Modelo de teste do tutorial”.",
      generation: "Toque no ⋯ do modelo de teste, em Nova geração, e adicione “Geração de teste”, de 2001 a 2005.",
      version: "Toque no ⋯ da geração, em Nova versão, e adicione “Versão de teste 1”.",
      period: "Toque no ⋯ da versão, em Novo período, e adicione o período de 2001 a 2003.",
      engine: "Toque em Novo motor no período e preencha a ficha: 1,0 L, 4 cilindros, tração dianteira. Salve a ficha.",
      second: "Toque no ⋯ da geração, em Nova versão, e adicione “Versão de teste 2”.",
      move: "A ordem dos níveis é a da árvore. Toque no ⋯ de “Versão de teste 2” e em Mover para cima.",
    },
  },
  {
    title: "Building a model's tree",
    steps: {
      model: { title: "Add a model", text: "Click New model and add the model “Modelo de teste do tutorial”." },
      generation: {
        title: "Add a generation",
        text: "Click New generation on the test model and add “Geração de teste”, from 2001 to 2005.",
      },
      version: { title: "Add a version", text: "Click New version on the generation and add “Versão de teste 1”." },
      period: { title: "Add a period", text: "Click New period on the version and add the period from 2001 to 2003." },
      engine: {
        title: "Add an engine",
        text: "Click New engine on the period and fill in the sheet: 1.0 L, 4 cylinders, front-wheel drive. Save the sheet.",
      },
      second: { title: "Add another version", text: "Click New version on the generation again and add “Versão de teste 2”." },
      move: { title: "Change the order", text: "The levels keep the tree's order. Move “Versão de teste 2” up, before the first." },
      end: {
        title: "Done!",
        text: "You built a model's tree, from the generation to the engine. The test model leaves the Catalog, with its tree, when the tutorial ends.",
      },
    },
    phone: {
      model: "Tap New model and add the model “Modelo de teste do tutorial”.",
      generation: "Tap the test model's ⋯, New generation, and add “Geração de teste”, from 2001 to 2005.",
      version: "Tap the generation's ⋯, New version, and add “Versão de teste 1”.",
      period: "Tap the version's ⋯, New period, and add the period from 2001 to 2003.",
      engine: "Tap New engine on the period and fill in the sheet: 1.0 L, 4 cylinders, front-wheel drive. Save the sheet.",
      second: "Tap the generation's ⋯, New version, and add “Versão de teste 2”.",
      move: "The levels keep the tree's order. Tap the ⋯ of “Versão de teste 2” and Move up.",
    },
  },
);

/** The steps of the tour. */
export type CatalogTreeStepId = "model" | "generation" | "version" | "period" | "engine" | "second" | "move" | "end";
/**
 * A part of the screen a step points at: Novo modelo; what adds the level under a node (its button, a phone's "⋯" or
 * its action, or the form open); and what moves a node up.
 */
export type CatalogTreeTarget = "new-model" | "add-under" | "move-up";
/** The Catalog tab as the tour sees it, read again on every check, and what it does for the user. */
export type CatalogTreeScreen<Target> = {
  /** The tour's brand as the catalog has it now. */
  brand: CatalogBrand | null;
  /** Whether a change "Fazer por mim" made is still on its way; no step goes back meanwhile. */
  busy: boolean;
  /** Whether the tab has the phone layout. */
  phone: boolean;
  /** Finds a part of the screen; the node is the one a level is added under, or the one moved. */
  target: (name: CatalogTreeTarget, node?: CatalogNode) => Target | null;
  /** Adds the test model to the brand. */
  addModel: () => void;
  /** Adds a level under a node, with what its form would send. */
  addUnder: (node: CatalogNode, values: CatalogValues) => void;
  /** Moves a node up among its siblings. */
  moveUp: (node: CatalogNode) => void;
};

/**
 * Finds the test tree's nodes in a brand, as far as they are made.
 * @param brand The tour's brand, maybe none.
 * @returns The test model, its generation, its two versions, the first's period and its engine, each when it is there.
 */
export function catalogTreeNodes(brand: CatalogBrand | null): {
  model?: CatalogNode;
  generation?: CatalogNode;
  firstVersion?: CatalogNode;
  secondVersion?: CatalogNode;
  period?: CatalogNode;
  engine?: CatalogNode;
} {
  const named = (nodes: readonly CatalogNode[] | undefined, name: string) => nodes?.find((node) => optionKey(node.label) === optionKey(name));
  const model = named(brand?.models, CATALOG_TREE_NAMES.model);
  const generation = model?.children?.[0];
  const firstVersion = named(generation?.children, CATALOG_TREE_NAMES.firstVersion);
  const period = firstVersion?.children?.[0];
  return {
    model,
    generation,
    firstVersion,
    secondVersion: named(generation?.children, CATALOG_TREE_NAMES.secondVersion),
    period,
    engine: period?.children?.[0],
  };
}

/**
 * Names the tour, as the dialog and its card do.
 * @param locale The language.
 * @returns E.g. "Montar a árvore de um modelo".
 */
export function catalogTreeTutorialTitle(locale: Locale): string {
  return STEP_TEXTS[locale].title;
}

/**
 * Counts the tour's steps, as the tutorials' list says.
 * @returns How many steps it has.
 */
export function catalogTreeTutorialStepCount(): number {
  return Object.keys(STEP_TEXTS["pt-BR"].steps).length;
}

/**
 * Lists the tour's steps for a screen: each with its texts, target, check, the step to go back to and what "Fazer por
 * mim" does. The texts follow the screen's layout as it is when they are listed.
 * @param screen Reads the screen as it is now.
 * @param locale The language of the texts.
 * @returns The steps in order, every one but "Pronto!" in part 1.
 */
export function catalogTreeTutorialSteps<Target>(screen: () => CatalogTreeScreen<Target>, locale: Locale): TutorialStep<Target>[] {
  const nodes = () => catalogTreeNodes(screen().brand);
  /** Adds under a node, when it is there. */
  const addUnder = (node: CatalogNode | undefined, values: CatalogValues) => {
    if (node) {
      screen().addUnder(node, values);
    }
  };
  /** Goes back to the step that makes the first node missing among some. */
  const back = (...needed: [CatalogNode | undefined, string][]) => needed.find(([node]) => !node)?.[1] ?? null;

  const bindings: Record<CatalogTreeStepId, Omit<TutorialStep<Target>, "id" | "title" | "text" | "part">> = {
    model: { target: () => screen().target("new-model"), done: () => nodes().model !== undefined, auto: () => screen().addModel() },
    generation: {
      target: () => screen().target("add-under", nodes().model),
      done: () => nodes().generation !== undefined,
      auto: () => addUnder(nodes().model, CATALOG_TREE_VALUES.generation),
      lost: () => back([nodes().model, "model"]),
    },
    version: {
      target: () => screen().target("add-under", nodes().generation),
      done: () => nodes().firstVersion !== undefined,
      auto: () => addUnder(nodes().generation, { name: CATALOG_TREE_NAMES.firstVersion }),
      lost: () => back([nodes().model, "model"], [nodes().generation, "generation"]),
    },
    period: {
      target: () => screen().target("add-under", nodes().firstVersion),
      done: () => nodes().period !== undefined,
      auto: () => addUnder(nodes().firstVersion, CATALOG_TREE_VALUES.period),
      lost: () => back([nodes().model, "model"], [nodes().generation, "generation"], [nodes().firstVersion, "version"]),
    },
    engine: {
      target: () => screen().target("add-under", nodes().period),
      done: () => nodes().engine !== undefined,
      auto: () => addUnder(nodes().period, CATALOG_TREE_VALUES.engine),
      lost: () => back([nodes().model, "model"], [nodes().generation, "generation"], [nodes().firstVersion, "version"], [nodes().period, "period"]),
    },
    second: {
      target: () => screen().target("add-under", nodes().generation),
      done: () => nodes().secondVersion !== undefined,
      auto: () => addUnder(nodes().generation, { name: CATALOG_TREE_NAMES.secondVersion }),
      lost: () => back([nodes().model, "model"], [nodes().generation, "generation"]),
    },
    move: {
      target: () => screen().target("move-up", nodes().secondVersion),
      done: () => nodes().generation?.children?.[0]?.id !== undefined && nodes().generation?.children?.[0]?.id === nodes().secondVersion?.id,
      auto: () => {
        const { secondVersion } = nodes();
        if (secondVersion) {
          screen().moveUp(secondVersion);
        }
      },
      lost: () => back([nodes().model, "model"], [nodes().generation, "generation"], [nodes().secondVersion, "second"]),
    },
    end: {},
  };

  const texts = STEP_TEXTS[locale];
  const phone = screen().phone;
  return (Object.keys(bindings) as CatalogTreeStepId[]).map((id) => {
    const { lost, ...binding } = bindings[id];
    const { title, text } = texts.steps[id];
    return {
      id,
      title,
      text: (phone && texts.phone[id]) || text,
      ...(id !== "end" && { part: 1 }),
      ...binding,
      ...(lost && { lost: () => (screen().busy ? null : lost()) }),
    };
  });
}

/**
 * Makes a change of the test tree on the API, as the screens' forms and buttons do: the test model added to a brand, a
 * level added under a node, or a node moved up.
 * @param base Where the API is reached, e.g. "/api" on the web.
 * @param locale The language of the engines' names.
 * @param change The change.
 * @returns The catalog after it, or null when it couldn't be made.
 */
export async function changeCatalogTree(
  base: string,
  locale: Locale,
  change: { addModel: CatalogBrand } | { addUnder: CatalogNode; values: CatalogValues } | { moveUp: CatalogNode },
): Promise<Catalog | null> {
  let request: { method: "POST" | "PATCH"; path: string; body: object };
  if ("addModel" in change) {
    const { method, path } = catalogEditRequest({ kind: "add", level: "model", parent: { level: "brand", id: change.addModel.id } }, locale);
    request = { method, path, body: { name: CATALOG_TREE_NAMES.model } };
  } else if ("moveUp" in change) {
    request = { method: "POST", path: `${catalogNodePath(change.moveUp)}/move`, body: { direction: "up" } };
  } else {
    const next = catalogAddUnder(change.addUnder);
    const { method, path } = "sheet" in next ? catalogSheetRequest(next.sheet) : catalogEditRequest(next.editing, locale);
    request = { method, path, body: change.values };
  }
  const result = await changeCatalog(base, request.method, request.path, locale, request.body);
  return result && typeof result === "object" ? result : null;
}

/**
 * Deletes the test model from a brand of the catalog, with its tree, if it is there, then its vehicle model from the
 * brand's list, if that is there too.
 * @param base Where the API is reached, e.g. "/api" on the web.
 * @param locale The language of the engines' names.
 * @param brand The brand, as the catalog has it now.
 * @returns Whether anything was deleted.
 */
export async function removeCatalogTreeModel(base: string, locale: Locale, brand: CatalogBrand): Promise<boolean> {
  const { model } = catalogTreeNodes(brand);
  const fromCatalog = model ? (await changeCatalog(base, "DELETE", catalogNodePath(model), locale)) !== null : false;
  const response = await apiFetch(`${base}${ITEM_LIST_PATHS.vehicleModels}`).catch(() => null);
  const models = response?.ok ? vehicleModelSchema.array().safeParse(await response.json()) : null;
  const listed = models?.success
    ? models.data.find((each) => each.vehicleBrandId === brand.id && optionKey(each.name) === optionKey(CATALOG_TREE_NAMES.model))
    : undefined;
  return (listed ? await deleteListEntry(base, "vehicleModels", listed.id) : false) || fromCatalog;
}
