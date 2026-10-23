import type { FilterValues } from "../filters/filters.ts";
import { EMPTY_ITEM_FILTERS } from "../items/itemFilters.ts";
import { formValue, itemFormOf, parsePrice, withFormValues, type FormField, type ItemForm } from "../items/itemForm.ts";
import { matchesSearch, optionKey, type Item } from "../items/items.ts";
import type { TourStep } from "./tour.ts";

// The Inventory tutorial, shared by web and mobile: a guided tour in three parts that creates a test item, finds it
// with the search and the filters, edits it (to a low, then an out-of-stock row) and deletes it. Each platform
// describes its screen (what is open, the items, the search and filters, where each part of the screen is) and the
// actions "Fazer por mim" takes; the steps here say when each one is done, where to go back when the user leaves
// one, and what to do for them. The test item is opened from its row, into its details (a click on an item of one
// brand opens them), and edited from there. The tutorial runs by itself the first time, and again from the user menu.
// The test item has one brand and one vehicle, so its fields are named flat: the item's, its brand's or its vehicle's.

/** The fields of each filling step of part 1. */
const FILL_FIELDS: Record<"identity" | "stock", FormField[]> = {
  identity: ["code", "name", "category", "partBrand", "vehicleBrand", "vehicleModel"],
  stock: ["quantity", "minQuantity", "position", "side", "color", "location", "price"],
};
/** Names of the tutorial's parts, for the card header. */
export const INVENTORY_TUTORIAL_PARTS = ["Cadastrar um item", "Procurar e filtrar", "Editar e excluir"];
/**
 * Where localStorage (web) and AsyncStorage (mobile) used to tell the tutorial was shown on the device. It is now kept
 * on the user (SessionUser.inventoryTutorialSeen), and the apps remove this old key.
 */
export const INVENTORY_TUTORIAL_STORAGE_KEY = "apc-inventory-tutorial-seen";
/** The title, text and part of each step. */
const STEP_TEXTS: Record<TutorialStepId, { part?: number; title: string; text: string }> = {
  new: { part: 1, title: "Abra o cadastro", text: "Clique em Novo item para cadastrar uma peça de teste." },
  identity: {
    part: 1,
    title: "Diga que peça é",
    text: "Preencha o código TUTORIAL-001, o nome “Item de teste do tutorial”, a categoria Motor, a marca Bosch e o veículo Volkswagen Gol. Use “+ Criar” para um nome que ainda não existe.",
  },
  stock: {
    part: 1,
    title: "Diga onde e quantas",
    text: "Quantidade 5, mínima 2, posição D, lado LD, cor Preto, local T-1 e valor 49,90. A foto é opcional.",
  },
  save: { part: 1, title: "Salve o item", text: "Clique em Salvar. O item novo aparece no topo da lista." },
  search: { part: 2, title: "Procure pelo nome", text: "Digite “tutorial” na busca: a lista fica só com o que combina." },
  filters: { part: 2, title: "Abra os filtros", text: "Clique em Filtros para filtrar por mais de um campo de uma vez." },
  filter: {
    part: 2,
    title: "Filtre o estoque",
    text: "Escolha a categoria Motor, a marca da peça Bosch, a posição D e a cor Preto, e clique em Aplicar.",
  },
  found: { part: 2, title: "Achou", text: "A busca e os filtros juntos deixaram na lista o item de teste." },
  details: { part: 3, title: "Abra o item", text: "Clique na linha do item de teste para ver os detalhes dele." },
  unlock: { part: 3, title: "Libere a edição", text: "Os detalhes só mostram o item. Clique em Editar para liberar os campos." },
  rename: {
    part: 3,
    title: "Mude o nome e a quantidade",
    text: "Mude o nome para “Item de teste do tutorial editado” e a quantidade para 1, abaixo da mínima.",
  },
  "save-low": { part: 3, title: "Salve as alterações", text: "Clique em Salvar alterações." },
  low: { part: 3, title: "Estoque baixo", text: "Na quantidade mínima ou abaixo, a linha fica marcada como estoque baixo." },
  pencil: { part: 3, title: "Edite pelo lápis", text: "Agora clique no lápis: ele abre direto a edição, sem os detalhes." },
  zero: { part: 3, title: "Zere a quantidade", text: "Mude a quantidade para 0 e clique em Salvar alterações." },
  out: { part: 3, title: "Esgotado", text: "Sem nenhuma unidade, a linha fica marcada como esgotada." },
  delete: { part: 3, title: "Exclua o item", text: "Clique na lixeira do item de teste." },
  confirm: { part: 3, title: "Confirme", text: "Clique em Excluir. O item sai do estoque." },
  end: {
    title: "Pronto!",
    text: "Você cadastrou, encontrou, editou e excluiu um item. Para rever este tutorial, abra o menu do usuário.",
  },
};

/** The edits of part 3: a new name, and a quantity under the minimum, for the low-stock row. */
export const TUTORIAL_EDIT = { name: "Item de teste do tutorial editado", quantity: "1" } satisfies Partial<Record<FormField, string>>;
/** The filters part 2 applies, which the test item matches. */
export const TUTORIAL_FILTERS: FilterValues = {
  ...EMPTY_ITEM_FILTERS,
  category: ["Motor"],
  partBrand: ["Bosch"],
  position: ["D"],
  color: ["Preto"],
};
/** The test item, as typed in the form. */
export const TUTORIAL_ITEM: ItemForm = {
  name: "Item de teste do tutorial",
  category: "Motor",
  vehicles: [{ vehicleBrand: "Volkswagen", vehicleModel: "Gol" }],
  minQuantity: "2",
  position: "D",
  side: "LD",
  originalCodes: [],
  brands: [{ partBrand: "Bosch", code: "TUTORIAL-001", quantity: "5", price: "R$ 49,90", color: "Preto", location: "T-1" }],
};
/** The test item's part code, which tells it apart in the list. */
export const TUTORIAL_CODE = TUTORIAL_ITEM.brands[0].code;
/** The search part 2 types, which finds the test item by its name. */
export const TUTORIAL_SEARCH = "tutorial";
/** The Inventory tab as the tutorial sees it, read again on every check, and what it does for the user. */
export type TutorialScreen<Target> = {
  /** The item form while it is open: the item it is on (none for a new one), whether it shows the details, and the values typed. */
  form: { item?: Item; viewing: boolean; values: ItemForm } | null;
  /** Every item in stock. */
  items: readonly Item[];
  search: string;
  /** The filters applied. */
  filters: FilterValues;
  /** Whether the Filtros menu is open. */
  filtersOpen: boolean;
  /** The item the delete confirmation asks about, while it is open. */
  removing?: Item;
  /** Whether a change "Fazer por mim" or the user made is still on its way to the list; no step goes back meanwhile. */
  busy: boolean;
  /** Finds a part of the screen; the item ones are the test item's. */
  target: (name: TutorialTarget) => Target | null;
  /** Opens the item form on a new item or on an item, its details or the edit, with the values given. */
  openForm: (item: Item | undefined, details: boolean, values?: ItemForm) => void;
  setSearch: (search: string) => void;
  /** Applies filters and closes the Filtros menu. */
  applyFilters: (filters: FilterValues) => void;
  /** Saves values as the form would (a new item, or the item given), then closes the form and loads the list again. */
  saveItem: (item: Item | undefined, values: ItemForm) => void;
  /** Opens the delete confirmation on an item. */
  askDelete: (item: Item) => void;
  /** Deletes an item, then closes the confirmation and loads the list again. */
  deleteItem: (item: Item) => void;
};

/** The steps of the tutorial. */
export type TutorialStepId =
  | "new"
  | "identity"
  | "stock"
  | "save"
  | "search"
  | "filters"
  | "filter"
  | "found"
  | "details"
  | "unlock"
  | "rename"
  | "save-low"
  | "low"
  | "pencil"
  | "zero"
  | "out"
  | "delete"
  | "confirm"
  | "end";
/** A part of the screen a step points at; the item ones are the test item's. */
export type TutorialTarget =
  | "new"
  | "form-identity"
  | "form-stock"
  | "form-name"
  | "form-quantity"
  | "form-save"
  | "form-edit"
  | "search"
  | "filters"
  | "filter-panel"
  | "row"
  | "pencil"
  | "trash"
  | "confirm-delete";
/**
 * Tells whether the applied filters hold every value of some filters.
 * @param applied The filters applied.
 * @param wanted The values each filter must hold.
 * @returns True when each wanted value is applied.
 */
export function filtersHave(applied: FilterValues, wanted: FilterValues): boolean {
  return Object.entries(wanted).every(([key, values]) => values.every((value) => (applied[key] ?? []).includes(value)));
}

/**
 * Tells whether the form holds some values as typed, ignoring case, accents and extra spaces, and the price by its
 * value ("49,9" is "49,90").
 * @param form The form as typed.
 * @param values The values it must hold.
 * @returns True when each value matches.
 */
export function formHas(form: ItemForm, values: Partial<Record<FormField, string>>): boolean {
  return (Object.entries(values) as [FormField, string][]).every(([field, value]) =>
    field === "price" ? parsePrice(formValue(form, field)) === parsePrice(value) : optionKey(formValue(form, field)) === optionKey(value),
  );
}

/**
 * Lists the tutorial's steps for a screen: each with its texts, target, check, the step to go back to and what
 * "Fazer por mim" does.
 * @param screen Reads the screen as it is now.
 * @returns The steps in order.
 */
export function inventoryTutorialSteps<Target>(screen: () => TutorialScreen<Target>): TourStep<Target>[] {
  /** The test item, while it is in stock. */
  const testItem = () => screen().items.find(isTestItem);
  /** Whether the form is open on the test item, on the edit when `viewing` is false. */
  const onTestItem = (viewing: boolean) => {
    const { form } = screen();
    return form !== null && isTestItem(form.item) && form.viewing === viewing;
  };
  /** Whether the form is open on a new item. */
  const onNew = () => screen().form !== null && screen().form?.item === undefined;
  /** The values the form holds, or the test item's own. */
  const typed = () => screen().form?.values ?? TUTORIAL_ITEM;
  const edited = () => testItem()?.name === TUTORIAL_EDIT.name && testItem()?.quantity === Number(TUTORIAL_EDIT.quantity);
  const pick = (fields: FormField[]) => Object.fromEntries(fields.map((field) => [field, formValue(TUTORIAL_ITEM, field)]));
  /** Opens the edit of the test item with some values changed. */
  const editWith = (values: Partial<Record<FormField, string>>) => {
    const item = testItem();
    if (item) {
      screen().openForm(item, false, withFormValues(itemFormOf(item), values));
    }
  };

  const bindings: Record<TutorialStepId, Omit<TourStep<Target>, "id" | "title" | "text" | "part">> = {
    new: { target: () => screen().target("new"), done: onNew, auto: () => screen().openForm(undefined, false) },
    identity: {
      target: () => screen().target("form-identity"),
      done: () => onNew() && formHas(typed(), pick(FILL_FIELDS.identity)),
      auto: () => screen().openForm(undefined, false, withFormValues(typed(), pick(FILL_FIELDS.identity))),
      lost: () => (screen().form ? null : "new"),
    },
    stock: {
      target: () => screen().target("form-stock"),
      done: () => onNew() && formHas(typed(), pick(FILL_FIELDS.stock)),
      auto: () => screen().openForm(undefined, false, withFormValues(typed(), pick(FILL_FIELDS.stock))),
      lost: () => (screen().form ? null : "new"),
    },
    save: {
      target: () => screen().target("form-save"),
      done: () => testItem() !== undefined && screen().form === null,
      auto: () => screen().saveItem(undefined, TUTORIAL_ITEM),
      lost: () => (screen().form || testItem() ? null : "new"),
    },
    search: {
      target: () => screen().target("search"),
      done: () => {
        const item = testItem();
        return item !== undefined && screen().search.trim() !== "" && matchesSearch(item, screen().search);
      },
      auto: () => screen().setSearch(TUTORIAL_SEARCH),
    },
    filters: {
      target: () => screen().target("filters"),
      done: () => screen().filtersOpen || filtersHave(screen().filters, TUTORIAL_FILTERS),
      auto: () => screen().applyFilters(TUTORIAL_FILTERS),
    },
    filter: {
      target: () => screen().target("filter-panel"),
      done: () => filtersHave(screen().filters, TUTORIAL_FILTERS),
      auto: () => screen().applyFilters(TUTORIAL_FILTERS),
      lost: () => (screen().filtersOpen ? null : "filters"),
    },
    found: { target: () => screen().target("row") },
    details: {
      target: () => screen().target("row"),
      done: () => onTestItem(true) || onTestItem(false),
      auto: () => {
        const item = testItem();
        if (item) {
          screen().openForm(item, true);
        }
      },
    },
    unlock: {
      target: () => screen().target("form-edit"),
      done: () => onTestItem(false),
      auto: () => editWith({}),
      lost: () => (screen().form ? null : "details"),
    },
    rename: {
      target: () => screen().target("form-name"),
      done: () => onTestItem(false) && formHas(typed(), TUTORIAL_EDIT),
      auto: () => editWith(TUTORIAL_EDIT),
      lost: () => (screen().form ? null : "details"),
    },
    "save-low": {
      target: () => screen().target("form-save"),
      done: () => edited() && screen().form === null,
      auto: () => {
        const item = testItem();
        if (item) {
          screen().saveItem(item, withFormValues(itemFormOf(item), TUTORIAL_EDIT));
        }
      },
      lost: () => (screen().form || edited() ? null : "details"),
    },
    low: { target: () => screen().target("row") },
    pencil: { target: () => screen().target("pencil"), done: () => onTestItem(false), auto: () => editWith({}) },
    zero: {
      target: () => screen().target("form-quantity"),
      done: () => testItem()?.quantity === 0 && screen().form === null,
      auto: () => {
        const item = testItem();
        if (item) {
          screen().saveItem(item, withFormValues(itemFormOf(item), { quantity: "0" }));
        }
      },
      lost: () => (screen().form || testItem()?.quantity === 0 ? null : "pencil"),
    },
    out: { target: () => screen().target("row") },
    delete: {
      target: () => screen().target("trash"),
      done: () => isTestItem(screen().removing),
      auto: () => {
        const item = testItem();
        if (item) {
          screen().askDelete(item);
        }
      },
    },
    confirm: {
      target: () => screen().target("confirm-delete"),
      done: () => testItem() === undefined,
      auto: () => {
        const item = testItem();
        if (item) {
          screen().deleteItem(item);
        }
      },
      lost: () => (screen().removing || !testItem() ? null : "delete"),
    },
    end: {},
  };

  const order: TutorialStepId[] = [
    "new",
    "identity",
    "stock",
    "save",
    "search",
    "filters",
    "filter",
    "found",
    "details",
    "unlock",
    "rename",
    "save-low",
    "low",
    "pencil",
    "zero",
    "out",
    "delete",
    "confirm",
    "end",
  ];
  return order.map((id) => {
    const { lost, ...binding } = bindings[id];
    return { id, ...STEP_TEXTS[id], ...binding, ...(lost && { lost: () => (screen().busy ? null : lost()) }) };
  });
}

/**
 * Tells whether an item is the tutorial's test item, by its part code.
 * @param item An item, maybe none.
 * @returns True for the test item.
 */
export function isTestItem(item: Item | undefined): boolean {
  return item?.brands.some((brand) => brand.code === TUTORIAL_CODE) ?? false;
}
