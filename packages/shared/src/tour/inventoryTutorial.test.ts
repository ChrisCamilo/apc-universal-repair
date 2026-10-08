import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_ITEM_FILTERS } from "../items/itemFilters.ts";
import { EMPTY_ITEM_FORM, itemFormOf } from "../items/itemForm.ts";
import type { Item } from "../items/items.ts";
import {
  filtersHave,
  formHas,
  INVENTORY_TUTORIAL_PARTS,
  inventoryTutorialSteps,
  TUTORIAL_EDIT,
  TUTORIAL_FILTERS,
  TUTORIAL_ITEM,
  type TutorialScreen,
} from "./inventoryTutorial.ts";
import { stepHeader } from "./tour.ts";

// The test item as the API would send it back.
const SAVED: Item = {
  id: "00000000-0000-4000-8000-000000000001",
  code: "TUTORIAL-001",
  name: "Item de teste do tutorial",
  category: "Motor",
  partBrand: "Bosch",
  vehicleBrand: "Volkswagen",
  vehicleModel: "Gol",
  position: "D",
  side: "LD",
  color: "Preto",
  location: "T-1",
  quantity: 5,
  minQuantity: 2,
  unitPriceCents: 4990,
  photos: [],
  createdAt: "2026-10-08T12:00:00.000Z",
  updatedAt: "2026-10-08T12:00:00.000Z",
};

/**
 * Builds a screen the test changes as it goes, recording what the tutorial asks it to do.
 * @returns The screen and the calls made on it.
 */
function fakeScreen() {
  const calls: string[] = [];
  const screen: TutorialScreen<string> = {
    form: null,
    items: [],
    search: "",
    filters: EMPTY_ITEM_FILTERS,
    filtersOpen: false,
    busy: false,
    target: (name) => name,
    openForm: (item, details, values) => {
      calls.push(`open ${item?.code ?? "new"} ${details ? "details" : "edit"}`);
      screen.form = { item, viewing: details, values: values ?? (item ? itemFormOf(item) : EMPTY_ITEM_FORM) };
    },
    setSearch: (search) => {
      screen.search = search;
    },
    applyFilters: (filters) => {
      screen.filters = filters;
      screen.filtersOpen = false;
    },
    saveItem: (item, values) => {
      calls.push(`save ${item?.code ?? "new"} ${values.name} ${values.quantity}`);
    },
    askDelete: (item) => {
      screen.removing = item;
    },
    deleteItem: (item) => {
      calls.push(`delete ${item.code}`);
    },
  };
  return { screen, calls };
}

// Lists the steps with and without the item details and checks their order, that the details steps come only when
// a row opens the item, that every step but the last belongs to a part, and the header of a step.
test("Shared: the tutorial has three parts, with the details steps only when a row opens the item", () => {
  const ids = (opensOnRow: boolean) => inventoryTutorialSteps(() => fakeScreen().screen, opensOnRow).map((step) => step.id);
  assert.deepEqual(ids(true).slice(7, 11), ["found", "details", "unlock", "rename"]);
  assert.deepEqual(ids(false).slice(7, 10), ["found", "pencil-first", "rename"]);
  assert.equal(ids(true).length, ids(false).length + 1);
  const steps = inventoryTutorialSteps(() => fakeScreen().screen, true);
  assert.deepEqual(
    steps.filter((step) => !step.part).map((step) => step.id),
    ["end"],
  );
  assert.deepEqual(stepHeader(steps, 4, INVENTORY_TUTORIAL_PARTS), { part: "Parte 2 de 3 · Procurar e filtrar", count: "5 / 19" });
});

// Checks a form matches typed values ignoring case, accents and spaces and the price by its value, and that applied
// filters hold the wanted values among others.
test("Shared: the tutorial reads the form and the filters loosely", () => {
  assert.equal(formHas({ ...TUTORIAL_ITEM, category: " motor ", price: "49,9" }, { category: "Motor", price: "49,90" }), true);
  assert.equal(formHas(TUTORIAL_ITEM, { quantity: "4" }), false);
  assert.equal(filtersHave({ ...TUTORIAL_FILTERS, color: ["Azul", "Preto"] }, TUTORIAL_FILTERS), true);
  assert.equal(filtersHave(EMPTY_ITEM_FILTERS, TUTORIAL_FILTERS), false);
});

// Walks part 1 with "Fazer por mim" and checks each step opens and fills the form, goes back when the form closes,
// but not while a save is on its way, and saves the test item.
test("Shared: part 1 fills and saves the test item, going back when the form closes", () => {
  const { screen, calls } = fakeScreen();
  const [create, identity, stock, save] = inventoryTutorialSteps(() => screen, true);
  assert.equal(create.target?.(), "new");
  assert.equal(create.done?.(), false);
  create.auto?.();
  assert.equal(create.done?.(), true);
  assert.equal(identity.done?.(), false);
  identity.auto?.();
  assert.equal(identity.done?.(), true);
  assert.equal(screen.form?.values.quantity, "");
  stock.auto?.();
  assert.deepEqual(screen.form?.values, TUTORIAL_ITEM);
  screen.form = null;
  assert.equal(stock.lost?.(), "new");
  save.auto?.();
  assert.equal(calls.at(-1), "save new Item de teste do tutorial 5");
  screen.busy = true;
  assert.equal(save.lost?.(), null);
  screen.busy = false;
  screen.items = [SAVED];
  assert.equal(save.done?.(), true);
});

// Walks part 2 and checks the search finds the test item, the menu opening counts for its step, leaving the menu goes
// back to it, and applying the tutorial's filters finishes the part.
test("Shared: part 2 searches and filters for the test item", () => {
  const { screen } = fakeScreen();
  screen.items = [SAVED];
  const steps = inventoryTutorialSteps(() => screen, true);
  const step = (id: string) => steps.find((each) => each.id === id)!;
  step("search").auto?.();
  assert.equal(step("search").done?.(), true);
  screen.filtersOpen = true;
  assert.equal(step("filters").done?.(), true);
  screen.filtersOpen = false;
  assert.equal(step("filter").lost?.(), "filters");
  step("filter").auto?.();
  assert.equal(step("filter").done?.(), true);
  assert.equal(step("filter").lost?.(), "filters");
});

// Walks part 3 and checks the details unlock into the edit, the rename and the zero are saved on the test item, a
// form closed early goes back to where the edit starts, and the delete is asked, then confirmed.
test("Shared: part 3 edits the test item twice, then deletes it", () => {
  const { screen, calls } = fakeScreen();
  screen.items = [SAVED];
  const steps = inventoryTutorialSteps(() => screen, true);
  const step = (id: string) => steps.find((each) => each.id === id)!;
  step("details").auto?.();
  assert.equal(calls.at(-1), "open TUTORIAL-001 details");
  assert.equal(step("unlock").done?.(), false);
  step("unlock").auto?.();
  assert.equal(step("unlock").done?.(), true);
  step("rename").auto?.();
  assert.equal(step("rename").done?.(), true);
  screen.form = null;
  assert.equal(step("rename").lost?.(), "details");
  step("save-low").auto?.();
  assert.equal(calls.at(-1), "save TUTORIAL-001 Item de teste do tutorial editado 1");
  screen.items = [{ ...SAVED, name: TUTORIAL_EDIT.name, quantity: 1 }];
  assert.equal(step("save-low").done?.(), true);
  step("zero").auto?.();
  assert.equal(calls.at(-1), "save TUTORIAL-001 Item de teste do tutorial editado 0");
  assert.equal(step("zero").lost?.(), "pencil");
  step("delete").auto?.();
  assert.equal(step("delete").done?.(), true);
  step("confirm").auto?.();
  assert.equal(calls.at(-1), "delete TUTORIAL-001");
  screen.removing = undefined;
  assert.equal(step("confirm").lost?.(), "delete");
  screen.items = [];
  assert.equal(step("confirm").done?.(), true);
});
