import { catalog, type Locale } from "../platform/locale/locale.ts";
import type { TutorialStep } from "./inventoryTutorial.ts";
import { optionKey } from "./items.ts";

// The guided tour of the lists, shared by web and mobile, the same way as the Inventory tutorial (see
// inventoryTutorial.ts): on two test categories its tab adds when it starts, which no item uses, it opens Gerenciar
// listas, renames the first, joins it into the second by renaming it to the second's name, and deletes the one left.
// Each platform describes its screen and the actions "Fazer por mim" takes; the steps here say when each one is done and
// where to go back when the user leaves one. The tour ends with no test category left; skipped, the tab deletes the ones
// left, as well as any left from a run that didn't end when it starts, and touches no other entry.

/** The tutorial, as the user menu's Tutoriais lists it. */
export const LISTS_TUTORIAL = "inventory-lists";
/** The test categories' names: the two the tour adds, and the first's new name. */
export const LISTS_TUTORIAL_NAMES = { first: "Categoria de teste 1", second: "Categoria de teste 2", renamed: "Categoria de teste renomeada" } as const;
/** The tour's name and each step's title and text, and what a phone's step says instead. */
const STEP_TEXTS = catalog<{
  title: string;
  steps: Record<ListsTutorialStepId, { title: string; text: string }>;
  phone: Partial<Record<ListsTutorialStepId, string>>;
}>(
  {
    title: "Renomear e juntar nomes das listas",
    steps: {
      open: {
        title: "Abra Gerenciar listas",
        text: "Este tutorial criou duas categorias de teste, que nenhum item usa. Clique em Mais ações e escolha Gerenciar listas.",
      },
      rename: {
        title: "Renomeie",
        text: "Clique no lápis de Categoria de teste 1, mude o nome para Categoria de teste renomeada e clique em Salvar. Os itens que usam um nome passam a usar o novo.",
      },
      join: {
        title: "Junte com outra",
        text: "Agora renomeie Categoria de teste renomeada para Categoria de teste 2. Esse nome já existe, então a lista pergunta se você quer juntar as duas.",
      },
      merge: { title: "Confirme a junção", text: "Clique em Juntar: os itens de uma passam para a outra, e só Categoria de teste 2 fica." },
      delete: { title: "Exclua", text: "Clique na lixeira de Categoria de teste 2. Só um nome que nenhum item usa pode ser excluído." },
      confirm: { title: "Confirme", text: "Clique em Excluir. A categoria sai da lista." },
      end: {
        title: "Pronto!",
        text: "As categorias de teste saíram da lista. Renomear, juntar e excluir valem também para as marcas de peça e os modelos de veículo.",
      },
    },
    phone: {
      open: "Este tutorial criou duas categorias de teste, que nenhum item usa. Toque no ⋯ do Estoque e em Gerenciar listas.",
      rename: "Toque no lápis de Categoria de teste 1, mude o nome para Categoria de teste renomeada e toque em Salvar. Os itens que usam um nome passam a usar o novo.",
      merge: "Toque em Juntar: os itens de uma passam para a outra, e só Categoria de teste 2 fica.",
      delete: "Toque na lixeira de Categoria de teste 2. Só um nome que nenhum item usa pode ser excluído.",
      confirm: "Toque em Excluir. A categoria sai da lista.",
    },
  },
  {
    title: "Renaming and joining list names",
    steps: {
      open: {
        title: "Open Manage lists",
        text: "This tutorial made two test categories, which no item uses. Click More actions and choose Manage lists.",
      },
      rename: {
        title: "Rename",
        text: "Click the pencil of Categoria de teste 1, change the name to Categoria de teste renomeada and click Save. The items using a name take the new one.",
      },
      join: {
        title: "Join with another",
        text: "Now rename Categoria de teste renomeada to Categoria de teste 2. That name exists, so the list asks whether to join the two.",
      },
      merge: { title: "Confirm the join", text: "Click Join: the items of one move to the other, and only Categoria de teste 2 is left." },
      delete: { title: "Delete", text: "Click the trash can of Categoria de teste 2. Only a name no item uses can be deleted." },
      confirm: { title: "Confirm", text: "Click Delete. The category leaves the list." },
      end: {
        title: "Done!",
        text: "The test categories left the list. Renaming, joining and deleting work for part brands and vehicle models too.",
      },
    },
    phone: {
      open: "This tutorial made two test categories, which no item uses. Tap the Inventory's ⋯ and Manage lists.",
      rename: "Tap the pencil of Categoria de teste 1, change the name to Categoria de teste renomeada and tap Save. The items using a name take the new one.",
      merge: "Tap Join: the items of one move to the other, and only Categoria de teste 2 is left.",
      delete: "Tap the trash can of Categoria de teste 2. Only a name no item uses can be deleted.",
      confirm: "Tap Delete. The category leaves the list.",
    },
  },
);

/** The steps of the tour. */
export type ListsTutorialStepId = "open" | "rename" | "join" | "merge" | "delete" | "confirm" | "end";
/**
 * A part of the screen a step points at: Mais ações, a test category's row (its pencil and trash, or the field that
 * renames it), Juntar in the merge question and Excluir in the delete one.
 */
export type ListsTutorialTarget = "more-actions" | "entry-first" | "entry-renamed" | "entry-second" | "merge" | "remove-confirm";
/** The Inventory tab as the tour sees it, read again on every check, and what it does for the user. */
export type ListsTutorialScreen<Target> = {
  /** Whether Gerenciar listas is open. */
  managing: boolean;
  /** The categories' names. */
  categories: readonly string[];
  /** Whether the question to join two names is open. */
  merging: boolean;
  /** The name the question to delete asks about, while it is open. */
  removing: string | null;
  /** Whether a change "Fazer por mim" or the user made is still on its way to the lists; no step goes back meanwhile. */
  busy: boolean;
  /** Whether the tab has the phone layout. */
  phone: boolean;
  /** Finds a part of the screen. */
  target: (name: ListsTutorialTarget) => Target | null;
  /** Opens Gerenciar listas. */
  openLists: () => void;
  /** Renames a category. */
  rename: (from: string, to: string) => void;
  /** Joins a category into another. */
  merge: (from: string, into: string) => void;
  /** Deletes a category. */
  remove: (name: string) => void;
};

/**
 * Names the tour, as the dialog and its card do.
 * @param locale The language.
 * @returns E.g. "Renomear e juntar nomes das listas".
 */
export function listsTutorialTitle(locale: Locale): string {
  return STEP_TEXTS[locale].title;
}

/**
 * Counts the tour's steps, as the tutorials' list says.
 * @returns How many steps it has.
 */
export function listsTutorialStepCount(): number {
  return Object.keys(STEP_TEXTS["pt-BR"].steps).length;
}

/**
 * Lists the tour's steps for a screen: each with its texts, target, check, the step to go back to and what "Fazer por
 * mim" does. The texts follow the screen's layout as it is when they are listed.
 * @param screen Reads the screen as it is now.
 * @param locale The language of the texts.
 * @returns The steps in order, every one but "Pronto!" in part 1.
 */
export function listsTutorialSteps<Target>(screen: () => ListsTutorialScreen<Target>, locale: Locale): TutorialStep<Target>[] {
  const { first, second, renamed } = LISTS_TUTORIAL_NAMES;
  /** Whether the categories hold a name, ignoring case, accents and spaces. */
  const has = (name: string) => screen().categories.some((each) => optionKey(each) === optionKey(name));
  /** Whether the first test category was joined into the second. */
  const merged = () => !has(first) && !has(renamed) && has(second);
  /** Goes back to opening Gerenciar listas when it closes. */
  const reopen = () => (screen().managing ? null : "open");

  const bindings: Record<ListsTutorialStepId, Omit<TutorialStep<Target>, "id" | "title" | "text" | "part">> = {
    open: { target: () => screen().target("more-actions"), done: () => screen().managing, auto: () => screen().openLists() },
    rename: {
      target: () => screen().target("entry-first"),
      done: () => has(renamed) && !has(first),
      auto: () => screen().rename(first, renamed),
      lost: reopen,
    },
    join: {
      target: () => screen().target("entry-renamed"),
      done: () => screen().merging || merged(),
      auto: () => screen().merge(renamed, second),
      lost: reopen,
    },
    merge: {
      target: () => screen().target("merge"),
      done: () => merged() && !screen().merging,
      auto: () => screen().merge(renamed, second),
      lost: () => (!screen().managing ? "open" : !screen().merging && has(renamed) ? "join" : null),
    },
    delete: {
      target: () => screen().target("entry-second"),
      done: () => screen().removing === second || !has(second),
      auto: () => screen().remove(second),
      lost: reopen,
    },
    confirm: {
      target: () => screen().target("remove-confirm"),
      done: () => !has(second) && screen().removing === null,
      auto: () => screen().remove(second),
      lost: () => (!screen().managing ? "open" : screen().removing === null && has(second) ? "delete" : null),
    },
    end: {},
  };

  const texts = STEP_TEXTS[locale];
  const phone = screen().phone;
  return (Object.keys(bindings) as ListsTutorialStepId[]).map((id) => {
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
